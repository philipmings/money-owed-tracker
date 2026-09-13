const fs = require('fs');
const assert = require('assert');

const ui = fs.readFileSync('ui-v20.js','utf8');
const css = fs.readFileSync('ui-v20.css','utf8');
const shell = fs.readFileSync('index.html','utf8');
const receiptShell = fs.readFileSync('receipt-shell.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

assert.ok(ui.includes('Internal transfer'));
assert.ok(ui.includes('Currency exchange'));
assert.ok(ui.includes('Debt impact'));
assert.ok(ui.includes('Flow.buildFlowEntries'));
assert.ok(ui.includes('action=transaction'));
assert.ok(ui.includes('renderAccounts'));
assert.ok(css.includes('.v20-account-card'));
assert.ok(css.includes('.v20-flow-review'));
assert.ok(shell.includes("fetch('./core.html?core=v20'"));
assert.ok(shell.includes('account-flow-core.js?v=20'));
assert.ok(shell.includes('ui-v20.js?v=20'));
assert.ok(receiptShell.includes("fetch('./core.html?core=v20'"));
assert.ok(sw.includes("const CACHE='money-owed-pwa-v20'"));
assert.ok(sw.includes("'./ui-v20.js?v=20'"));
assert.equal(manifest.start_url,'./receipt-shell.html?release=v20');
assert.equal(manifest.scope,'./');

console.log('v20 interface checks passed');
