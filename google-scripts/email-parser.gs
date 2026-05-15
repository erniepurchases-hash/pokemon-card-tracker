// ============================================================
// GMAIL EMAIL PARSER SCRIPT
// Go to script.google.com > New Project > paste this > Save
// Then run setup() once to create the automatic timer.
//
// HOW TO USE:
//   When you get a purchase receipt email in Gmail,
//   apply the label "Pokemon Purchase" to it.
//   This script checks every 15 minutes and auto-imports it.
// ============================================================

var EMAIL_IMPORT_URL = 'https://pokemon-card-tracker-kuti5t1mh-erniepurchases-8632s-projects.vercel.app/api/email-import'
var WEBHOOK_SECRET = 'pk-sync-ernest-2026'
var PURCHASE_LABEL = 'Pokemon Purchase'
var PROCESSED_LABEL = 'Pokemon Processed'

// Run this ONCE to create the 15-minute timer
function setup() {
  // Remove existing triggers
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i])
  }
  // Create a new every-15-minutes trigger
  ScriptApp.newTrigger('processNewPurchaseEmails')
    .timeBased()
    .everyMinutes(15)
    .create()

  // Create the Gmail labels if they don't exist
  if (!GmailApp.getUserLabelByName(PURCHASE_LABEL)) GmailApp.createLabel(PURCHASE_LABEL)
  if (!GmailApp.getUserLabelByName(PROCESSED_LABEL)) GmailApp.createLabel(PROCESSED_LABEL)

  Logger.log('Setup complete! Apply the "' + PURCHASE_LABEL + '" label to any purchase email and it will auto-import within 15 minutes.')
}

// Runs automatically every 15 minutes
function processNewPurchaseEmails() {
  var purchaseLabel = GmailApp.getUserLabelByName(PURCHASE_LABEL)
  var processedLabel = GmailApp.getUserLabelByName(PROCESSED_LABEL)

  if (!purchaseLabel) {
    Logger.log('Label "' + PURCHASE_LABEL + '" not found. Run setup() first.')
    return
  }

  var threads = GmailApp.search('label:"' + PURCHASE_LABEL + '" -label:"' + PROCESSED_LABEL + '"')
  Logger.log('Found ' + threads.length + ' unprocessed email(s)')

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i]
    var messages = thread.getMessages()

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j]
      var subject = msg.getSubject()
      var from = msg.getFrom().toLowerCase()
      var body = msg.getPlainBody()
      var date = msg.getDate()

      var parsed = parseEmail(subject, from, body, date)
      if (parsed && parsed.card_name) {
        var ok = sendToDatabase(parsed)
        Logger.log((ok ? 'Imported' : 'FAILED') + ': ' + parsed.card_name + ' $' + (parsed.purchase_price_per_unit || '?'))
      } else {
        Logger.log('Could not parse email: ' + subject)
      }
    }

    // Move to processed — removes "Pokemon Purchase" label and adds "Pokemon Processed"
    thread.addLabel(processedLabel)
    thread.removeLabel(purchaseLabel)
  }
}

// ---- PARSERS ----

function parseEmail(subject, from, body, date) {
  var purchaseDate = formatDate(date)

  if (from.indexOf('ebay.com') !== -1) {
    return parseEbay(subject, body, purchaseDate)
  }
  if (from.indexOf('tcgplayer.com') !== -1) {
    return parseTCGPlayer(subject, body, purchaseDate)
  }
  if (from.indexOf('paypal.com') !== -1) {
    return parsePayPal(subject, body, purchaseDate)
  }
  return parseGeneric(subject, body, purchaseDate)
}

function parseEbay(subject, body, purchaseDate) {
  // Card name from subject: "You bought: Charizard VMAX" or "Order confirmed: ..."
  var nameMatch = subject.match(/(?:bought|purchased|order\s+confirmed)[:\s]+(.+)/i)
  var card_name = nameMatch ? nameMatch[1].trim() : subject

  // Price
  var priceMatch = body.match(/(?:item\s+price|subtotal|order\s+total)[^\d]*\$?([\d,]+\.\d{2})/i)
  if (!priceMatch) priceMatch = body.match(/\$([\d,]+\.\d{2})/)
  var price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null

  // Seller
  var sellerMatch = body.match(/(?:sold\s+by|seller)[:\s]+([^\n\r]+)/i)
  var seller = sellerMatch ? sellerMatch[1].trim() : null

  // Quantity
  var qtyMatch = body.match(/(?:qty|quantity)[:\s]*(\d+)/i)
  var qty = qtyMatch ? parseInt(qtyMatch[1]) : 1

  return {
    card_name: card_name.substring(0, 200),
    purchase_date: purchaseDate,
    purchase_price_per_unit: price && qty > 1 ? Math.round((price / qty) * 100) / 100 : price,
    quantity: qty,
    seller: seller,
    platform: 'eBay',
    payment_method: 'PayPal',
    notes: 'Auto-imported from eBay email'
  }
}

function parseTCGPlayer(subject, body, purchaseDate) {
  var card_name = ''
  var price = null
  var qty = 1

  // Look for lines like "1x Charizard VMAX - $25.00"
  var itemMatch = body.match(/(\d+)x?\s+(.+?)\s*[-–]\s*\$?([\d,]+\.\d{2})/i)
  if (itemMatch) {
    qty = parseInt(itemMatch[1])
    card_name = itemMatch[2].trim()
    price = parseFloat(itemMatch[3].replace(/,/g, ''))
  }

  if (!card_name) {
    var totalMatch = body.match(/(?:order\s+total|subtotal)[^\d]*\$?([\d,]+\.\d{2})/i)
    price = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null
    card_name = 'TCGPlayer Order'
  }

  return {
    card_name: card_name.substring(0, 200),
    purchase_date: purchaseDate,
    purchase_price_per_unit: price && qty > 1 ? Math.round((price / qty) * 100) / 100 : price,
    quantity: qty,
    seller: 'TCGPlayer',
    platform: 'TCGPlayer',
    payment_method: null,
    notes: 'Auto-imported from TCGPlayer email'
  }
}

function parsePayPal(subject, body, purchaseDate) {
  // Amount from subject: "You sent a payment of $25.00 to ..."
  var amountMatch = subject.match(/\$\s*([\d,]+\.\d{2})/) || body.match(/(?:amount|total|sent)[^\d]*\$?([\d,]+\.\d{2})/i)
  var price = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null

  // Recipient
  var toMatch = subject.match(/\bto\s+(.+)$/i) || body.match(/(?:to|paid\s+to)[:\s]+([^\n\r]+)/i)
  var seller = toMatch ? toMatch[1].trim() : null

  // Memo/note (often contains what was purchased)
  var memoMatch = body.match(/(?:note|memo|message)[:\s]+([^\n\r]+)/i)
  var memo = memoMatch ? memoMatch[1].trim() : null

  var card_name = memo || ('PayPal payment to ' + (seller || 'unknown'))

  return {
    card_name: card_name.substring(0, 200),
    purchase_date: purchaseDate,
    purchase_price_per_unit: price,
    quantity: 1,
    seller: seller,
    platform: null,
    payment_method: 'PayPal',
    notes: 'Auto-imported from PayPal email' + (memo ? ' | Memo: ' + memo : '')
  }
}

function parseGeneric(subject, body, purchaseDate) {
  var priceMatch = body.match(/\$\s*([\d,]+\.\d{2})/)
  var price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null

  return {
    card_name: subject.substring(0, 200),
    purchase_date: purchaseDate,
    purchase_price_per_unit: price,
    quantity: 1,
    seller: null,
    platform: null,
    payment_method: null,
    notes: 'Auto-imported from email'
  }
}

// ---- HELPERS ----

function formatDate(date) {
  var d = new Date(date)
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function sendToDatabase(parsed) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      secret: WEBHOOK_SECRET,
      card_name: parsed.card_name,
      purchase_date: parsed.purchase_date,
      purchase_price_per_unit: parsed.purchase_price_per_unit,
      quantity: parsed.quantity || 1,
      seller: parsed.seller,
      platform: parsed.platform,
      payment_method: parsed.payment_method,
      notes: parsed.notes
    }),
    muteHttpExceptions: true
  }

  try {
    var response = UrlFetchApp.fetch(EMAIL_IMPORT_URL, options)
    var result = JSON.parse(response.getContentText())
    return result.success === true
  } catch (err) {
    Logger.log('Database error: ' + err.toString())
    return false
  }
}
