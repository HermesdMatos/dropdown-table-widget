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

No evento `onSaveRequested` do widget:

```javascript
var raw = dropdowntable_1.getPendingChanges();   // "oldAddr§newAddr§valor§medida###..."
if (raw === "") { return; }
var records = raw.split("###");
for (var i = 0; i < records.length; i++) {
    var f = records[i].split("§");               // f[0]=oldAddr f[1]=newAddr f[2]=valor f[3]=medida
    // Endereço: "DIM|~|[DIM].[H].&[ID]|||DIM2|~|...". Se oldAddr != newAddr, a combinação mudou:
    // zere o valor em oldAddr e grave f[2] em newAddr (mesma lógica de gravação usada hoje).
}
dropdowntable_1.clearPendingChanges();           // só depois de gravar com sucesso
```

`valor` vem canônico (`1593.95`); vazio = célula apagada.

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
