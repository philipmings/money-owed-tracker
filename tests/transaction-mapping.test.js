const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const sw = fs.readFileSync('sw.js', 'utf8');
const match = sw.match(/function normalizeAppSource\(html\)\{([\s\S]*?)\n\}/);
assert.ok(match, 'normalizeAppSource must exist');

const context = {};
vm.runInNewContext(`function normalizeAppSource(html){${match[1]}\n}; this.normalizeAppSource=normalizeAppSource;`, context);

const broken = "opts=[['borrowed_from_them','Loan'],['they_bought_for_me','Purchases']]; paid=[['they_paid_me','Repayment'],['paid_them','Repayment']]";
const fixed = context.normalizeAppSource(broken);

assert.ok(fixed.includes("['cash_loan','Loan']"));
assert.ok(fixed.includes("['purchase_on_behalf','Purchases']"));
assert.ok(fixed.includes("['repayment','Repayment']"));
assert.ok(!fixed.includes('borrowed_from_them'));
assert.ok(!fixed.includes('they_bought_for_me'));
assert.ok(!fixed.includes('they_paid_me'));
assert.ok(!fixed.includes('paid_them'));

console.log('transaction mapping regression checks passed');
