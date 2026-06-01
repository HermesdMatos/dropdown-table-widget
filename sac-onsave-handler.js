// ─────────────────────────────────────────────────────────────────
// SAC Script — onSaveRequested do dropdowntable_1
// Versão: 2.10.56
// 
// Coloca este código no evento: dropdowntable_1.onSaveRequested()
// ─────────────────────────────────────────────────────────────────

var changesStr = dropdowntable_1.getPendingChanges();

// Se não houver alterações, sai
if (!changesStr || changesStr === "") {
  console.log("Nenhuma alteração pendente.");
  return;
}

// Split dos registros: oldAddr§newAddr§value§measureId###...
var records = changesStr.split("###");
var savedCount = 0;
var skippedCount = 0;

// Dimensões obrigatórias
var requiredDimensions = [
  "PERIODICIDADE",
  "FONTE_DA_INFORMACAO",
  "RESPONSABILIDADE",
  "DESCRICAO_DA_CONTA"
];

// Mapa de measures: index -> ID
var measureMap = {};
measureMap["measures_0"] = "PER_DESCRICAO";
measureMap["measures_1"] = "QTDE";
measureMap["measures_2"] = "CUSTO";

for (var ri = 0; ri < records.length; ri++) {
  var record = records[ri];
  
  if (!record || record === "") {
    continue;
  }
  
  var parts = record.split("§");
  
  if (parts.length < 4) {
    console.log("Registro inválido (campos insuficientes): " + record);
    skippedCount = skippedCount + 1;
    continue;
  }
  
  var oldAddrStr = parts[0];
  var newAddrStr = parts[1];
  var valorAtual = parts[2];
  var measureId = parts[3];
  
  // Se valor vem vazio, usar "0"
  if (!valorAtual || valorAtual === "") {
    valorAtual = "0";
  }
  
  // Se old e new forem iguais, ignorar
  if (oldAddrStr === newAddrStr) {
    console.log("Endereços iguais, ignorando.");
    skippedCount = skippedCount + 1;
    continue;
  }
  
  console.log("--- Processando ---");
  console.log("OLD: " + oldAddrStr);
  console.log("NEW: " + newAddrStr);
  console.log("VALOR: " + valorAtual);
  console.log("MEDIDA: " + measureId);
  
  // Valida se a medida é QTDE ou CUSTO (ignora PER_DESCRICAO)
  if (measureId === "PER_DESCRICAO") {
    console.log("Ignorando PER_DESCRICAO (não é numérico).");
    skippedCount = skippedCount + 1;
    continue;
  }
  
  if (measureId !== "QTDE" && measureId !== "CUSTO") {
    console.log("Medida inválida: " + measureId);
    skippedCount = skippedCount + 1;
    continue;
  }
  
  // Parse do endereço novo: DIM|~|VALOR|||DIM2|~|VALOR2|||...
  var newAddrParts = newAddrStr.split("|||");
  var newMembers = {};
  var isNewValid = true;
  
  for (var nap = 0; nap < newAddrParts.length; nap++) {
    var newPart = newAddrParts[nap];
    if (!newPart || newPart === "") {
      continue;
    }
    
    var dimAndValue = newPart.split("|~|");
    if (dimAndValue.length < 2) {
      console.log("Formato de dimensão inválido: " + newPart);
      isNewValid = false;
      break;
    }
    
    var dimName = dimAndValue[0];
    var dimValue = dimAndValue[1];
    
    // Extrai o valor real se estiver no formato "[DIM].&[VALOR]"
    if (dimValue.indexOf(".&[") !== -1) {
      var bracketIdx = dimValue.indexOf(".&[");
      var startBracket = dimValue.indexOf("[", bracketIdx);
      var endBracket = dimValue.indexOf("]", startBracket);
      
      if (startBracket !== -1 && endBracket !== -1) {
        dimValue = dimValue.substring(startBracket + 1, endBracket);
      }
    }
    
    newMembers[dimName] = dimValue;
  }
  
  // Valida se todas as dimensões obrigatórias estão presentes
  if (isNewValid) {
    for (var rdi = 0; rdi < requiredDimensions.length; rdi++) {
      var reqDim = requiredDimensions[rdi];
      if (!newMembers[reqDim] || newMembers[reqDim] === "") {
        console.log("Dimensão obrigatória faltando: " + reqDim);
        isNewValid = false;
        break;
      }
    }
  }
  
  if (!isNewValid) {
    console.log("Endereço novo inválido, ignorando.");
    skippedCount = skippedCount + 1;
    continue;
  }
  
  // Valida o endereço antigo também (mesmas regras)
  var oldAddrParts = oldAddrStr.split("|||");
  var oldMembers = {};
  var isOldValid = true;
  
  for (var oap = 0; oap < oldAddrParts.length; oap++) {
    var oldPart = oldAddrParts[oap];
    if (!oldPart || oldPart === "") {
      continue;
    }
    
    var dimAndValueOld = oldPart.split("|~|");
    if (dimAndValueOld.length < 2) {
      isOldValid = false;
      break;
    }
    
    var dimNameOld = dimAndValueOld[0];
    var dimValueOld = dimAndValueOld[1];
    
    // Extrai valor real do formato SAC
    if (dimValueOld.indexOf(".&[") !== -1) {
      var bracketIdxOld = dimValueOld.indexOf(".&[");
      var startBracketOld = dimValueOld.indexOf("[", bracketIdxOld);
      var endBracketOld = dimValueOld.indexOf("]", startBracketOld);
      
      if (startBracketOld !== -1 && endBracketOld !== -1) {
        dimValueOld = dimValueOld.substring(startBracketOld + 1, endBracketOld);
      }
    }
    
    oldMembers[dimNameOld] = dimValueOld;
  }
  
  // Valida dimensões obrigatórias do endereço antigo
  if (isOldValid) {
    for (var rdiOld = 0; rdiOld < requiredDimensions.length; rdiOld++) {
      var reqDimOld = requiredDimensions[rdiOld];
      if (!oldMembers[reqDimOld] || oldMembers[reqDimOld] === "") {
        isOldValid = false;
        break;
      }
    }
  }
  
  if (!isOldValid) {
    console.log("Endereço antigo inválido, ignorando.");
    skippedCount = skippedCount + 1;
    continue;
  }
  
  // Tudo validado, agora persiste
  console.log("Iniciando persistência...");
  
  // 1. Limpa o valor antigo (seta para 0 ou remove)
  try {
    var oldSelection = {};
    oldSelection["PERIODICIDADE"] = oldMembers["PERIODICIDADE"];
    oldSelection["FONTE_DA_INFORMACAO"] = oldMembers["FONTE_DA_INFORMACAO"];
    oldSelection["RESPONSABILIDADE"] = oldMembers["RESPONSABILIDADE"];
    oldSelection["DESCRICAO_DA_CONTA"] = oldMembers["DESCRICAO_DA_CONTA"];
    
    Table_10.setUserInput(oldSelection, measureId, 0);
    console.log("Valor antigo zerado em: " + oldAddrStr);
  } catch (e) {
    console.log("Erro ao limpar valor antigo: " + e);
  }
  
  // 2. Grava o novo valor
  try {
    var newSelection = {};
    newSelection["PERIODICIDADE"] = newMembers["PERIODICIDADE"];
    newSelection["FONTE_DA_INFORMACAO"] = newMembers["FONTE_DA_INFORMACAO"];
    newSelection["RESPONSABILIDADE"] = newMembers["RESPONSABILIDADE"];
    newSelection["DESCRICAO_DA_CONTA"] = newMembers["DESCRICAO_DA_CONTA"];
    
    var numValue = parseFloat(valorAtual.replace(",", "."));
    if (isNaN(numValue)) {
      numValue = 0;
    }
    
    Table_10.setUserInput(newSelection, measureId, numValue);
    console.log("Novo valor gravado em: " + newAddrStr + " = " + numValue);
    savedCount = savedCount + 1;
  } catch (e) {
    console.log("Erro ao gravar novo valor: " + e);
    skippedCount = skippedCount + 1;
  }
}

console.log("Salvos: " + savedCount + " | Ignorados: " + skippedCount);

// 3. Executa submitData
try {
  Table_10.submitData();
  console.log("submitData executado.");
} catch (e) {
  console.log("Erro ao executar submitData: " + e);
}

// 4. Atualiza a tabela
try {
  Table_10.refresh();
  console.log("Table_10 atualizada.");
} catch (e) {
  console.log("Erro ao atualizar Table_10: " + e);
}

// 5. Limpa o buffer do widget
dropdowntable_1.clearPendingChanges();
console.log("Buffer do widget limpo.");

console.log("=== Processo de salvamento finalizado ===");
