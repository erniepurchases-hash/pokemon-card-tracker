// ============================================================
// GOOGLE SHEETS AUTO-SYNC SCRIPT
// Paste this into your Google Sheet:
//   Extensions > Apps Script > paste here > Save > Run setup()
// ============================================================

var WEBHOOK_URL = 'https://pokemon-card-tracker-kuti5t1mh-erniepurchases-8632s-projects.vercel.app/api/sheets-sync'
var WEBHOOK_SECRET = 'pk-sync-ernest-2026'
var DB_ID_COL = 13   // Column M — stores the database ID (hidden column, do not delete)
var HEADER_ROW = 1   // Your sheet has a header on row 1

// Run this ONCE to set up the automatic trigger
function setup() {
  // Remove any existing onEdit triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onSheetEdit') {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
  // Create a new installable onEdit trigger
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create()
  Logger.log('Setup complete! Your sheet will now sync to the database on every edit.')
}

// This runs automatically every time you edit a cell
function onSheetEdit(e) {
  if (!e) return

  var sheet = e.range.getSheet()
  var row = e.range.getRow()

  // Skip the header row
  if (row <= HEADER_ROW) return

  // Read the full row (columns A through L)
  // Expected order: date_purchased, item, set_source, qty, total_cost, payment_method,
  //                 seller, sale_price, sale_date, platform, status, notes
  var rowData = sheet.getRange(row, 1, 1, 12).getValues()[0]

  // Skip if the card name (column B, index 1) is empty
  if (!rowData[1] || !rowData[1].toString().trim()) return

  // Get the DB ID from column M if it already exists
  var dbId = sheet.getRange(row, DB_ID_COL).getValue() || null

  var payload = JSON.stringify({
    secret: WEBHOOK_SECRET,
    rowData: rowData,
    dbId: dbId || null
  })

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  }

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    var result = JSON.parse(response.getContentText())

    if (result.success && result.id && !dbId) {
      // First time this row synced — write the DB ID back to column M
      sheet.getRange(row, DB_ID_COL).setValue(result.id)
    }

    Logger.log('Synced row ' + row + ': ' + (result.success ? 'OK (id=' + result.id + ')' : 'ERROR - ' + result.error))
  } catch (err) {
    Logger.log('Sync error on row ' + row + ': ' + err.toString())
  }
}
