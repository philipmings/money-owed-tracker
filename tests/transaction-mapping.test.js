const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

assert.ok(index.includes("['borrowed_from_them','Loan']"));
assert.ok(index.includes("['they_bought_for_me','Purchases']"));
assert.ok(index.includes("['they_paid_me','Repayment']"));
assert.ok(index.includes("['paid_them','Repayment']"));
assert.ok(!sw.includes('normalizeAppSource'), 'service worker must not rewrite transaction aliases');

console.log('transaction alias regression checks passed');
