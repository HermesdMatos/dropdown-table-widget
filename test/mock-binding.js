// Mocks no formato que o SAC entrega ao custom widget (myDataBinding, childrenBinding,
// valuesBinding e this.dataBindings → getDataSource().getMembers()).
// Cenário: contas × Periodicidade × Responsável; no binding principal as dimensões de
// dropdown vêm no nó pai (como no SAC, com hierarquia recolhida).
(function() {
  var PER = "[PERIODICIDADE].[H1].&";
  var RESP = "[RESPONSAVEL].[H1].&";
  var CONTA = "[CONTA].[H1].&";

  function cell(id, label, parentId) {
    var c = { id: id, label: label };
    if (parentId) { c.parentId = parentId; }
    return c;
  }
  function measure(raw, formatted) { return { raw: raw, formattedValue: formatted }; }

  function mainBinding(c1Value) {
    // Nós recolhidos: o SAC marca isNode/isCollapsed nessas células
    var perNode = cell(PER + "[PER_ALL]", "Periodicidade");
    perNode.isNode = true; perNode.isCollapsed = true;
    var respNode = cell(RESP + "[RESP_ALL]", "Responsável");
    respNode.isNode = true; respNode.isCollapsed = true;
    return {
      state: "success",
      metadata: {
        feeds: {
          dimensions: { values: ["dimensions_0", "dimensions_1", "dimensions_2"] },
          measures: { values: ["measures_0"] }
        },
        dimensions: {
          dimensions_0: { id: "CONTA", description: "Conta" },
          dimensions_1: { id: "PERIODICIDADE", description: "Periodicidade" },
          dimensions_2: { id: "RESPONSAVEL", description: "Responsável" }
        },
        mainStructureMembers: { measures_0: { id: "CUSTO", label: "Custo" } }
      },
      data: [
        { dimensions_0: cell(CONTA + "[ROOT]", "Contas"), dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(0, "0") },
        { dimensions_0: cell(CONTA + "[C1]", "Conta 1", CONTA + "[ROOT]"), dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(c1Value, "1.593,95") },
        { dimensions_0: cell(CONTA + "[C2]", "Conta 2", CONTA + "[ROOT]"), dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(50, "50,00") },
        { dimensions_0: cell(CONTA + "[C3]", "Conta 3", CONTA + "[ROOT]"), dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(0, "0,00") }
      ]
    };
  }

  // Filhos de cada nó (opções do dropdown) — o mesmo do childrenBinding atual
  function childrenBinding() {
    return {
      state: "success",
      data: [
        { dimensions_1: cell(PER + "[MENSAL]", "Mensal", PER + "[PER_ALL]") },
        { dimensions_1: cell(PER + "[ANUAL]", "Anual", PER + "[PER_ALL]") },
        { dimensions_2: cell(RESP + "[ANA]", "Ana", RESP + "[RESP_ALL]") },
        { dimensions_2: cell(RESP + "[BRUNO]", "Bruno", RESP + "[RESP_ALL]") }
      ]
    };
  }

  // Substitui a tabela espelho. Ordem das dimensões diferente de propósito: o widget casa pelo ID.
  function valuesBinding() {
    return {
      state: "success",
      metadata: {
        dimensions: {
          dimensions_0: { id: "CONTA" },
          dimensions_1: { id: "RESPONSAVEL" },
          dimensions_2: { id: "PERIODICIDADE" }
        }
      },
      data: [
        { dimensions_0: cell(CONTA + "[C1]", "Conta 1"), dimensions_1: cell(RESP + "[ANA]", "Ana"), dimensions_2: cell(PER + "[MENSAL]", "Mensal"), measures_0: measure(100) },
        { dimensions_0: cell(CONTA + "[C1]", "Conta 1"), dimensions_1: cell(RESP + "[BRUNO]", "Bruno"), dimensions_2: cell(PER + "[ANUAL]", "Anual"), measures_0: measure(0) },
        { dimensions_0: cell(CONTA + "[C2]", "Conta 2"), dimensions_1: cell(RESP + "[BRUNO]", "Bruno"), dimensions_2: cell(PER + "[ANUAL]", "Anual"), measures_0: measure(50) },
        { dimensions_0: cell(CONTA + "[C3]", "Conta 3"), dimensions_1: cell(RESP + "[#]", "Não atribuído"), dimensions_2: cell(PER + "[#]", "Não atribuído"), measures_0: measure(0) }
      ]
    };
  }

  // this.dataBindings do custom widget (API assíncrona). MemberInfo não tem parentId.
  function dataBindings(withNotApplicable) {
    var members = {
      PERIODICIDADE: [
        { id: PER + "[PER_ALL]", description: "Periodicidade" },
        { id: PER + "[MENSAL]", description: "Mensal" },
        { id: PER + "[TRIMESTRAL]", description: "Trimestral" },
        { id: PER + "[ANUAL]", description: "Anual" }
      ],
      RESPONSAVEL: [
        { id: RESP + "[RESP_ALL]", description: "Responsável" },
        { id: RESP + "[ANA]", description: "Ana" }
      ]
    };
    if (withNotApplicable) {
      // Grafias diferentes de propósito: o widget compara sem acento/caixa/espaços
      members.PERIODICIDADE.push({ id: PER + "[NA]", description: "NÃO APLICÁVEL" });
      members.RESPONSAVEL.push({ id: RESP + "[NAO_APLICAVEL]", description: "Nao Aplicavel" });
      members.RESPONSAVEL.push({ id: RESP + "[CLIENTE]", description: "CLIENTE" });
    }
    return {
      getDataBinding: function() {
        return Promise.resolve({
          getDataSource: function() {
            return Promise.resolve({
              getMembers: function(dimId) { return Promise.resolve(members[dimId] || []); }
            });
          }
        });
      }
    };
  }

  // Cenário real observado no SAC: com dados do cliente, o binding principal já traz o membro
  // gravado (folha, com parentId); contas sem dado ficam no nó. Sem childrenBinding/valuesBinding.
  function mainBindingWithBookedLeaves() {
    var b = mainBinding(1593.95);
    b.data[1].dimensions_1 = cell(PER + "[ANUAL]", "Anual", PER + "[PER_ALL]");
    b.data[1].dimensions_2 = cell(RESP + "[ANA]", "Ana", RESP + "[RESP_ALL]");
    b.data[2].dimensions_1 = cell(PER + "[MENSAL]", "Mensal", PER + "[PER_ALL]");
    b.data[2].dimensions_2 = cell(RESP + "[BRUNO]", "Bruno", RESP + "[RESP_ALL]");
    // Nó sem as flags isNode/isCollapsed: o widget deve reconhecê-lo pelo parentId das folhas
    b.data[3].dimensions_1 = cell(PER + "[PER_ALL]", "Periodos");
    return b;
  }

  // Builder com "Nível 2" + "Incluir níveis-pai": cada conta vem com a linha do nó (total,
  // sempre >= folha) antes das linhas das folhas. Contas sem dado só têm a linha do nó.
  function mainBindingWithParentLevels() {
    var b = mainBinding(0);
    var perNode = cell(PER + "[PER_ALL]", "Periodos");
    var respNode = cell(RESP + "[RESP_ALL]", "RESPONSAVEL");
    var c1 = cell(CONTA + "[C1]", "Conta 1", CONTA + "[ROOT]");
    var c3 = cell(CONTA + "[C3]", "Conta 3", CONTA + "[ROOT]");
    b.data = [
      b.data[0],
      { dimensions_0: c1, dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(1000, "1.000,00") },
      { dimensions_0: c1, dimensions_1: cell(PER + "[ANUAL]", "Anual", PER + "[PER_ALL]"), dimensions_2: respNode, measures_0: measure(1000, "1.000,00") },
      { dimensions_0: c1, dimensions_1: cell(PER + "[ANUAL]", "Anual", PER + "[PER_ALL]"), dimensions_2: cell(RESP + "[ANA]", "Ana", RESP + "[RESP_ALL]"), measures_0: measure(1000, "1.000,00") },
      { dimensions_0: c3, dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(null, "") },
      // Como no SAC: conta sem dado também vem com uma linha de folhas (sem valor) — não é valor gravado
      { dimensions_0: c3, dimensions_1: cell(PER + "[ANUAL]", "Anual", PER + "[PER_ALL]"), dimensions_2: cell(RESP + "[ANA]", "Ana", RESP + "[RESP_ALL]"), measures_0: measure(null, "") }
    ];
    return b;
  }

  // Como o modelo real: dimensão RESPONSABILIDADE, medidas QTDE e CUSTO; o membro CLIENTE tem
  // ID técnico diferente da descrição ("CLI"). Conta 1 tem só QTDE preenchida.
  function twoMeasuresScenario() {
    var R = "[RESPONSABILIDADE].[H1].&";
    var perNode = cell(PER + "[PER_ALL]", "Periodos");
    var respNode = cell(R + "[RESP_ALL]", "RESPONSAVEL");
    var c1 = cell(CONTA + "[C1]", "Conta 1", CONTA + "[ROOT]");
    var binding = {
      state: "success",
      metadata: {
        feeds: { dimensions: { values: ["dimensions_0", "dimensions_1", "dimensions_2"] }, measures: { values: ["measures_0", "measures_1"] } },
        dimensions: { dimensions_0: { id: "CONTA" }, dimensions_1: { id: "PERIODICIDADE" }, dimensions_2: { id: "RESPONSABILIDADE" } },
        mainStructureMembers: { measures_0: { id: "QTDE", label: "Quantidade" }, measures_1: { id: "CUSTO", label: "Custo" } }
      },
      data: [
        { dimensions_0: cell(CONTA + "[ROOT]", "Contas"), dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(null, ""), measures_1: measure(null, "") },
        { dimensions_0: c1, dimensions_1: perNode, dimensions_2: respNode, measures_0: measure(2, "2"), measures_1: measure(null, "") },
        { dimensions_0: c1, dimensions_1: cell(PER + "[MENSAL]", "Mensal", PER + "[PER_ALL]"), dimensions_2: cell(R + "[ANA]", "Ana", R + "[RESP_ALL]"), measures_0: measure(2, "2"), measures_1: measure(null, "") }
      ]
    };
    var members = {
      PERIODICIDADE: [{ id: PER + "[MENSAL]", description: "Mensal" }, { id: PER + "[NA]", description: "NÃO APLICÁVEL" }],
      RESPONSABILIDADE: [{ id: R + "[ANA]", description: "Ana" }, { id: R + "[CLI]", description: "CLIENTE" }, { id: R + "[NA]", description: "NÃO APLICÁVEL" }]
    };
    var dbs = {
      getDataBinding: function() {
        return Promise.resolve({ getDataSource: function() {
          return Promise.resolve({ getMembers: function(dimId) { return Promise.resolve(members[dimId] || []); } });
        } });
      }
    };
    return { binding: binding, dataBindings: dbs, R: R };
  }

  window.DTMock = { twoMeasuresScenario: twoMeasuresScenario, mainBinding: mainBinding, mainBindingWithBookedLeaves: mainBindingWithBookedLeaves, mainBindingWithParentLevels: mainBindingWithParentLevels, childrenBinding: childrenBinding, valuesBinding: valuesBinding, dataBindings: dataBindings, PER: PER, RESP: RESP, CONTA: CONTA };
})();
