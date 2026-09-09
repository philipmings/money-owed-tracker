const fs = require('fs');
const assert = require('assert');
const ReceiptTools = require('../receipt.js');

const transactionId = '4d6a2dc6-5bef-4088-8804-ce821d1b8150';
assert.equal(ReceiptTools.receiptNumber(transactionId, '2026-09-08'), 'PM-4D6A2DC6');

const receipt = ReceiptTools.buildReceiptFromConfirmed(
  { transaction_id: transactionId, person_name: 'Mel', currency: 'TTD', previous_balance: 9000, new_balance: 0 },
  { amount: 9000, description: 'Settlement', transaction_date: '2026-09-08' }
);
assert.equal(receipt.receiptNumber, 'PM-4D6A2DC6');
assert.ok(ReceiptTools.receiptText(receipt).includes('PAYMENT RECEIPT FROM PHILIP MINGS'));
assert.ok(ReceiptTools.printHtml(receipt).includes('PAYMENT RECEIPT FROM PHILIP MINGS'));

const source = fs.readFileSync('receipt.js', 'utf8');
assert.ok(source.includes("fillText('PAYMENT RECEIPT FROM PHILIP MINGS'"), 'PNG receipt should include Philip Mings in the header');

const app = fs.readFileSync('receipt-app.js', 'utf8');
assert.ok(app.includes('Payment Receipt from Philip Mings'), 'on-screen receipt should include Philip Mings in the header');

console.log('receipt identity checks passed');
