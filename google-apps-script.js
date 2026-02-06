
/**
 * LINKHUB PRO - SERVERLESS BACKEND (GOOGLE SHEETS)
 * Versão: 1.1.0
 * 
 * Este script deve ser colado no Editor de Scripts de uma Planilha Google.
 * Ele gerencia a leitura e gravação do estado global do dashboard.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Database");
  
  // Cria a aba de banco de dados se não existir
  if (!sheet) {
    sheet = ss.insertSheet("Database");
    sheet.getRange("A1").setValue("{}"); // Inicializa com objeto vazio
  }

  if (action === 'getData') {
    const data = sheet.getRange("A1").getValue();
    const result = data ? data : "{}";
    
    return ContentService.createTextOutput(result)
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Ação não especificada" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Database");
  
  if (!sheet) {
    sheet = ss.insertSheet("Database");
  }

  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === 'saveData') {
      // Grava o JSON completo na célula A1
      // Usamos stringify para garantir que o dado seja persistido como texto puro
      sheet.getRange("A1").setValue(JSON.stringify(payload.data));
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", timestamp: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
