const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// Backend supports the canonical transaction types used by the original ledger API.
// The UI must express who owes whom with direction, not invent unsupported types.
assert.match(html, /if\(a==='they_owe'\)\{direction=1;opts=\[\['cash_loan','Loan'\],\['purchase_on_behalf','Purchases'\]/);
assert.match(html, /else if\(a==='they_paid'\)\{direction=-1;opts=\[\['repayment','Repayment'\]\]\}/);
assert.match(html, /else if\(a==='i_owe'\)\{direction=-1;opts=\[\['cash_loan','Loan'\],\['purchase_on_behalf','Purchases'\]/);
assert.match(html, /else\{direction=1;opts=\[\['repayment','Repayment'\]\]\}/);

// Regression: these UI-only aliases caused "Unsupported transaction type" failures.
assert.ok(!html.includes("['they_bought_for_me','Purchases']"));
assert.ok(!html.includes("['borrowed_from_them','Loan']"));
assert.ok(!html.includes("['they_paid_me','Repayment']"));
assert.ok(!html.includes("['paid_them','Repayment']"));

console.log('transaction mapping regression checks passed');
