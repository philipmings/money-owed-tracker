const assert = require('assert');
const Flow = require('../account-flow-core.js');

assert.equal(Flow.accountPersonName('Scotia USD'), 'Account · Scotia USD');
assert.equal(Flow.isAccountPersonName('Account · FCB USD'), true);
assert.equal(Flow.isAccountPersonName('Deanne'), false);
assert.equal(Flow.stripAccountPrefix('Account · FCB USD'), 'FCB USD');

const totals = Flow.debtTotalsFromBalances([
  { person_name: 'Deanne', currency: 'USD', balance: 100 },
  { person_name: 'Aaron', currency: 'TTD', balance: -1600 },
  { person_name: 'Account · Scotia USD', currency: 'USD', balance: 500 },
  { person_name: 'Account · FCB USD', currency: 'USD', balance: 250 }
]);
assert.deepEqual(totals, {
  TTD: { toMe: 0, iOwe: 1600 },
  USD: { toMe: 100, iOwe: 0 }
});

const transfer = Flow.buildFlowEntries({
  kind: 'internal_transfer',
  fromAccount: 'Scotia USD',
  fromCurrency: 'USD',
  fromAmount: 500,
  toAccount: 'FCB USD',
  toCurrency: 'USD',
  toAmount: 500,
  date: '2026-09-13',
  note: 'Move funds'
}, 'FLOW-TEST');
assert.equal(transfer.length, 2);
assert.equal(transfer[0].person_name, 'Account · Scotia USD');
assert.equal(transfer[0].direction, -1);
assert.equal(transfer[0].currency, 'USD');
assert.equal(transfer[1].person_name, 'Account · FCB USD');
assert.equal(transfer[1].direction, 1);
assert.equal(transfer[1].currency, 'USD');
assert.ok(transfer.every(e => e.description.includes('[FLOW-TEST]')));

const fx = Flow.buildFlowEntries({
  kind: 'fx_purchase',
  fromAccount: 'Scotia Loans',
  fromCurrency: 'TTD',
  fromAmount: 9000,
  toAccount: 'RBC USD',
  toCurrency: 'USD',
  toAmount: 1200,
  counterparty: 'Mel',
  date: '2026-09-13',
  note: ''
}, 'FLOW-FX');
assert.equal(Flow.effectiveRate({ fromCurrency: 'TTD', fromAmount: 9000, toCurrency: 'USD', toAmount: 1200 }), 7.5);
assert.equal(fx[0].currency, 'TTD');
assert.equal(fx[1].currency, 'USD');
assert.ok(fx[0].description.includes('Mel'));
assert.ok(fx[1].description.includes('TT$7.5000 / US$1'));

const adjustment = Flow.buildAccountAdjustmentEntry({
  account: 'Scotia USD', currency: 'USD', targetBalance: 1250, currentBalance: 500,
  date: '2026-09-13', note: 'Opening/current balance'
}, 'FLOW-ADJ');
assert.equal(adjustment.person_name, 'Account · Scotia USD');
assert.equal(adjustment.amount, 750);
assert.equal(adjustment.direction, 1);
assert.ok(adjustment.description.includes('Account balance adjustment'));

const decrease = Flow.buildAccountAdjustmentEntry({
  account: 'Scotia USD', currency: 'USD', targetBalance: 200, currentBalance: 500,
  date: '2026-09-13', note: ''
}, 'FLOW-ADJ2');
assert.equal(decrease.amount, 300);
assert.equal(decrease.direction, -1);

const grouped = Flow.groupFlowTransactions([
  { id:'out', person_name:'Account · Scotia Loans', currency:'TTD', signed_amount:-9000, transaction_date:'2026-09-13', description:'Currency exchange out to RBC USD via Mel · Rate TT$7.5000 / US$1 [FLOW-GROUP]' },
  { id:'in', person_name:'Account · RBC USD', currency:'USD', signed_amount:1200, transaction_date:'2026-09-13', description:'Currency exchange in from Scotia Loans via Mel · Rate TT$7.5000 / US$1 [FLOW-GROUP]' }
]);
assert.equal(grouped.length,1);
assert.equal(grouped[0].id,'FLOW-GROUP');
assert.equal(grouped[0].kind,'Currency exchange');
assert.equal(grouped[0].fromAccount,'Scotia Loans');
assert.equal(grouped[0].toAccount,'RBC USD');
assert.equal(grouped[0].fromCurrency,'TTD');
assert.equal(grouped[0].toCurrency,'USD');
assert.equal(grouped[0].fromAmount,9000);
assert.equal(grouped[0].toAmount,1200);
assert.equal(grouped[0].reversed,false);

const reversedGroup = Flow.groupFlowTransactions([
  { id:'out', person_name:'Account · Scotia USD', currency:'USD', signed_amount:-100, transaction_date:'2026-09-13', description:'Internal transfer out to FCB USD [FLOW-REV]' },
  { id:'reverse', person_name:'Account · Scotia USD', currency:'USD', signed_amount:100, transaction_date:'2026-09-13', description:'Automatic reversal of incomplete account flow [FLOW-REV]' }
]);
assert.equal(reversedGroup[0].reversed,true);

console.log('account flow core checks passed');
