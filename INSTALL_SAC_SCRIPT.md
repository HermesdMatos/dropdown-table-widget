# Como Colocar o Script no SAP Analytics Cloud

## Instruções Passo a Passo

### 1. Abra o Analytics Designer

- Acesse a aplicação SAPORE no SAC
- Entre em modo de edição (clique no ícone de lápis/edit)

### 2. Localize o Widget dropdowntable_1

- No painel de camadas ou na tela, selecione o widget `dropdowntable_1`

### 3. Acesse os Eventos

- Clique com botão direito sobre `dropdowntable_1`
- Selecione "Edit Events" (ou duplo-clique no evento)
- **OU** vá para o painel de propriedades → Eventos → procure por `onSaveRequested`

### 4. Abra o Editor de Eventos

- Procure pelo evento: **onSaveRequested**
- Clique no ícone de editar (lápis/pencil) ao lado

### 5. Cole o Código SAC

Copie TODO o conteúdo do arquivo `sac-onsave-handler.js` e cole no editor.

**IMPORTANTE:** Remova apenas os comentários de cabeçalho se quiser, mas mantenha todo o resto exatamente igual.

### 6. Referências Corrigidas

O código agora:

✅ Valida todas as dimensões obrigatórias  
✅ Extrai o valor real do formato SAC  
✅ Limpa o valor antigo antes de gravar  
✅ Grava apenas QTDE e CUSTO  
✅ Executa submitData() e refresh()  
✅ Limpa o buffer do widget  
✅ Mantém sintaxe pura SAC (sem JSON.parse)  

### 7. Teste

1. Edite um valor no widget dropdown
2. Clique em "Salvar" (botão do widget)
3. Verifique os logs no console (F12)
4. Confirme que:
   - OLD/NEW/VALOR/MEDIDA aparecem nos logs
   - Table_10 é atualizada
   - Buffer é limpo

## Validações Implementadas

### Dimensões Obrigatórias
```
- PERIODICIDADE
- FONTE_DA_INFORMACAO
- RESPONSABILIDADE
- DESCRICAO_DA_CONTA
```

### Medidas Válidas
```
measures_0 → PER_DESCRICAO (IGNORADA)
measures_1 → QTDE (SALVA)
measures_2 → CUSTO (SALVA)
```

### Tratamento de Erros
- Registros inválidos = SKIPPED com log
- Dimensões faltando = SKIPPED
- EndereçOS iguais = SKIPPED
- Valores vazios = convertidos para "0"
- setUserInput com erro = SKIPPED com mensagem

## Formato do Buffer

O widget retorna via `getPendingChanges()`:

```
oldAddr§newAddr§value§measureId###oldAddr2§newAddr2§value2§measureId2
```

Exemplo real:
```
PERIODICIDADE|~|2024.01|||FONTE|~|SAP|||RESP|~|FINANCE|||CONTA|~|C001|||§PERIODICIDADE|~|2024.01|||FONTE|~|SAP|||RESP|~|SAPORE|||CONTA|~|C001|||§500§QTDE###...
```

O script faz o parsing correto e persiste tudo na Table_10 via `setUserInput()`.

---

**Versão:** 2.10.56  
**Data:** 2026-06-01  
**Status:** Pronto para produção
