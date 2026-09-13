const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html','utf8');
const shell = fs.readFileSync('receipt-shell.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));

assert.ok(index.includes("fetch('./core.html?core=v20'"), 'root should load preserved v20 core');
assert.ok(shell.includes("fetch('./core.html?core=v20'"), 'installed shell should load preserved v20 core');
assert.ok(shell.includes('./receipt.js?v=20'), 'shell should load v20 receipt tools');
assert.ok(shell.includes('./receipt-app.js?v=20'), 'shell should load v20 receipt app');
assert.ok(shell.includes('./account-flow-core.js?v=20'), 'shell should load account flow core');
assert.ok(shell.includes('./ui-v20.js?v=20'), 'shell should load v20 interface');
assert.ok(sw.includes("const CACHE='money-owed-pwa-v20'"), 'service worker cache should advance to v20');
assert.ok(sw.includes("'./ui-v20.js?v=20'"), 'service worker should cache v20 UI');
assert.ok(sw.includes("'./receipt-shell.html?release=v20'"), 'service worker fallback should use v20 shell');
assert.equal(manifest.start_url, './receipt-shell.html?release=v20');
assert.equal(manifest.scope, './');
assert.equal(manifest.id, './');

console.log('v20 release checks passed');
