const fs = require('fs');
const assert = require('assert');
const ReceiptTools = require('../receipt.js');

const confirmed = ReceiptTools.buildReceiptFromConfirmed(
  { transaction_id: '12345678-abcd', person_name: 'Avery', currency: 'TTD', previous_balance: 900, new_balance: 500 },
  { amount: 400, description: 'Curry Q', transaction_date: '2026-09-08' }
);
assert.equal(confirmed.amount, 400);
assert.equal(confirmed.previousBalance, 900);
assert.equal(confirmed.remainingBalance, 500);
assert.equal(confirmed.status, 'PART PAYMENT');
assert.equal(confirmed.currency, 'TTD');
assert.ok(confirmed.receiptNumber.startsWith('MOT-20260908-'));

const paid = ReceiptTools.buildReceiptFromConfirmed(
  { transaction_id: 'paid-001', person_name: 'Avery', currency: 'TTD', previous_balance: 400, new_balance: 0 },
  { amount: 400, description: '', transaction_date: '2026-09-08' }
);
assert.equal(paid.status, 'PAID');

const history = [
  { id: 'loan', transaction_date: '2026-09-01', created_at: '2026-09-01T10:00:00Z', currency: 'TTD', transaction_type: 'cash_loan', signed_amount: 1000, amount: 1000, direction: 1 },
  { id: 'payment', transaction_date: '2026-09-02', created_at: '2026-09-02T10:00:00Z', currency: 'TTD', transaction_type: 'repayment', signed_amount: -400, amount: 400, direction: -1, description: 'Part payment' }
];
const historical = ReceiptTools.buildHistoricalReceipt('payment', history, 'Avery');
assert.equal(historical.previousBalance, 1000);
assert.equal(historical.remainingBalance, 600);
assert.equal(historical.amount, 400);
assert.ok(ReceiptTools.isIncomingRepayment(history[1]));
assert.ok(!ReceiptTools.isIncomingRepayment({ transaction_type: 'repayment', signed_amount: 400 }));

const text = ReceiptTools.receiptText(confirmed);
assert.ok(text.includes('Avery'));
assert.ok(text.includes('TTD 400.00'));
assert.ok(text.includes(confirmed.receiptNumber));
assert.ok(text.includes('TTD 500.00'));

const app = fs.readFileSync('receipt-app.js', 'utf8');
assert.ok(app.includes('receiptOverlay'));
assert.ok(app.includes('Share Receipt'));
assert.ok(app.includes('Save PDF'));
assert.ok(app.includes("actionMode==='they_paid'"));
assert.ok(app.includes('ReceiptTools.buildReceiptFromConfirmed'));
assert.ok(app.includes('ReceiptTools.buildHistoricalReceipt'));
assert.ok(app.includes('navigator.share'));
assert.ok(app.includes('ReceiptTools.printReceipt'));

const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("'./receipt.js?v=17'"));
assert.ok(sw.includes("'./receipt-app.js?v=17'"));
assert.ok(sw.includes('receipt-app.js?v=17'));

console.log('payment receipt feature checks passed');
