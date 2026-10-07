# Dropdown Table Widget (SAP Analytics Cloud)

Custom widget de planejamento: tabela com medidas editáveis e dimensões escolhidas por **lista suspensa por linha**, como a validação de dados do Excel, sem precisar abrir hierarquias.

| Arquivo | Papel |
|---|---|
| `dropdown-table-widget-v2.js` | Widget (tag `dropdowntable-widget`) |
| `style-panel.js` | Painel de estilo/configuração (tag `dropdowntable-styling`) |
| `dropdowntable.json` | Contribution de **produção** |
| `dropdowntable-dev.json` | Contribution **DEV** (id `dropdowntable_dev`, tags `-dev`), gerado por script |
| `tools/` | Scripts de release (geram URLs e hashes de integridade) |
| `test/` | Testes no navegador com mocks do SAC |

## Configuração no SAC (sem script para as dimensões)

1. **Builder → myDataBinding**: linhas = Conta + dimensões de dropdown (podem ficar no nó pai); medidas editáveis.
2. **Builder → valuesBinding** *(substitui a tabela espelho / `setRowValues`)*: Conta (1ª dimensão) + dimensões de dropdown **no nível folha** + uma medida. O widget casa as dimensões pelo ID e usa, por conta, a combinação de maior valor como "valor gravado".
3. **Builder → childrenBinding** *(opções da lista)*: as dimensões de dropdown com seus membros-filho, sem medidas. Se ficar vazio, o widget tenta `getMembers()` da DataSource e depois os membros vistos no `valuesBinding`.
4. **Dropdowns**: sem configuração, toda dimensão depois da conta vira lista. Para escolher só algumas, use **Painel de estilo → Dropdowns** → Aplicar. Stories que ainda chamam `setDropdownDimensions`, `setRowValues` ou `setDropdownOptions` continuam no comportamento antigo.
5. **Modo diagnóstico** (mesmo painel): registra no console do navegador (F12) os bindings, o resultado do `getMembers()` e o `pendingChanges`.

### Único script necessário: salvar

O `setUserInput` só existe no planejamento de uma **Tabela** (a API de custom widget não grava), então a chamada de gravação continua na story. Toda a regra fica no widget e é configurada no **painel → Gravação**:

- **Hierarquias** da tabela de gravação, uma por linha: `PERIODICIDADE=Periodos_H1`
- **Membros que não recebem valor**: padrão `RESPONSABILIDADE=CLIENTE` (campo vazio = padrão) — todas as medidas da linha travam mostrando 0 e gravam 0, inclusive as que estavam vazias. Compara pelo ID e pela descrição do membro
- **Valor para apagar**: `0` (padrão). Usado no endereço antigo quando a combinação muda, em células apagadas e nos membros acima. O `setUserInput` recusa vazio ("Preenchimento obrigatório"); para null de verdade seria preciso uma Data Action que apague os zeros depois do save.

### Regras de negócio aplicadas pelo widget

- **Tudo NÃO APLICÁVEL**: com as dimensões de dropdown todas em NÃO APLICÁVEL (ou sem valor), as medidas ficam bloqueadas — escolha as dimensões antes de informar valores.
- **Membro sem valor** (ex: CLIENTE): medidas travadas mostrando 0; grava 0.
- **Troca de dimensão** move só as medidas com valor (zera a combinação antiga). Linha sem valor nenhum só registra a escolha.
- **Gravação que falha** (`setWriteResult(i, false)`) continua pendente e destacada em vermelho após `clearPendingChanges()`.
- **Troca de contexto** (ex: cliente) com alterações não salvas: aviso no topo do widget e evento `onPendingChangesDiscarded`.
- **Conta com mais de uma combinação gravada** (valor ≠ 0): alerta ⚠ ao lado da conta; a tabela mostra a de maior valor.
- **Desempate** entre combinações com 0: prefere a salva por último nesta sessão (ao recarregar a story, só uma Data Action de limpeza resolve).

O widget também converte o número pt-BR, resolve o ID da medida, remove duplicatas e descarta endereços incompletos. No evento `onSaveRequested`:

```javascript
Application.showBusyIndicator("Salvando os dados");
var n = dropdowntable_1.getWriteCount();
var skipped = dropdowntable_1.getWriteSkippedCount();
if (n === 0) {
    Application.hideBusyIndicator();
    Application.showMessage(ApplicationMessageType.Info, "Nenhuma alteração pendente.");
    return;
}
var hasError = false;
for (var i = 0; i < n; i++) {
    var sel = {};
    for (var d = 0; d < dropdowntable_1.getWriteDimensionCount(i); d++) {
        sel[dropdowntable_1.getWriteDimensionId(i, d)] = dropdowntable_1.getWriteMemberId(i, d);
    }
    sel["@MeasureDimension"] = dropdowntable_1.getWriteMeasureId(i);
    var ok = Table_1.getPlanning().setUserInput(sel, dropdowntable_1.getWriteValue(i));
    dropdowntable_1.setWriteResult(i, ok);
    if (!ok) { hasError = true; }
}
Table_1.getPlanning().submitData();
dropdowntable_1.clearPendingChanges();   // mantém pendentes só as que falharam
Application.hideBusyIndicator();
if (hasError) {
    Application.showMessage(ApplicationMessageType.Warning, "Algumas alterações não foram gravadas — as linhas destacadas continuam pendentes.");
} else if (skipped > 0) {
    Application.showMessage(ApplicationMessageType.Warning, "Salvo. " + skipped.toString() + " alteração(ões) sem todas as dimensões ficaram de fora.");
} else {
    Application.showMessage(ApplicationMessageType.Success, "Alterações salvas com sucesso.");
}
```

Com o **modo diagnóstico** ligado, o console mostra a lista montada (`[DropdownTable] Gravação`) e o que foi descartado.

## Desenvolvimento

```bash
node test/server.js
```
- `http://127.0.0.1:5180/` roda os testes automáticos (modo explícito, getMembers, legado, save sem reenvio).
- `http://127.0.0.1:5180/coexist.html` carrega PROD (branch `main`) + DEV na mesma página.

## Publicar no DEV (testar no SAC sem afetar produção)

1. Commit das alterações → `node tools/release-dev.js` → commit do `dropdowntable-dev.json` → `git push`.
2. `node tools/release-dev.js --check` confere no jsDelivr se as URLs respondem e se os hashes batem.
3. No SAC: importar `dropdowntable-dev.json` (atualiza o widget DEV). Use uma **cópia da story**.

## Promover para produção

### Primeira vez: tirar a produção do GitHub Pages (antes de qualquer merge)

Hoje o JSON de produção aponta para o GitHub Pages, que publica a `main`, com um hash fixo. Um merge na `main` troca o arquivo publicado, o hash deixa de bater e o widget de produção **quebra** até o JSON ser reimportado. Para migrar sem risco:

1. `git tag v2.11.25 8c220ad && git push origin v2.11.25` (versão que está em produção)
2. Na `main`: `node tools/release-prod.js v2.11.25 --check` → commit do `dropdowntable.json`
3. No SAC: importar esse `dropdowntable.json`. O código é o mesmo, só muda a origem para jsDelivr fixada no tag.

A partir daí, merges na `main` não afetam a produção.

### Cada versão

1. Pull Request da branch → merge na `main`.
2. `git tag v2.13.0 && git push origin v2.13.0`
3. `node tools/release-prod.js v2.13.0 --check` → commit do `dropdowntable.json` na `main`.
4. No SAC: importar `dropdowntable.json` e validar a story de produção.
5. **Rollback**: reimportar o `dropdowntable.json` da versão anterior (`git show v2.12.0:dropdowntable.json`). As URLs ficam fixas no tag, então a versão antiga continua publicada.
