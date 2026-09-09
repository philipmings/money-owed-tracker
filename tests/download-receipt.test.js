const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('receipt-app.js', 'utf8');

assert.ok(app.includes('Download Receipt'), 'receipt sheet should show a Download Receipt button');
assert.ok(app.includes("id=\"downloadReceiptBtn\""), 'download button should have a stable id');
assert.ok(app.includes("byId('downloadReceiptBtn').onclick=downloadReceipt"), 'download button should call downloadReceipt');
assert.ok(app.includes('async function downloadReceipt()'), 'downloadReceipt handler should exist');
assert.ok(app.includes("safeFileName(currentReceipt.receiptNumber)+'.png'"), 'downloaded receipt should use a receipt-number PNG filename');
assert.ok(app.includes('ReceiptTools.renderReceiptPng(currentReceipt)'), 'manual download should render the current receipt as PNG');

console.log('manual receipt download checks passed');
