const fs = require('fs');
const assert = require('assert');

const shell = fs.readFileSync('receipt-shell.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));

assert.ok(shell.includes("fetch('/index.html?core=v19'"), 'shell should load v19 core');
assert.ok(shell.includes('/receipt.js?v=19'), 'shell should load v19 receipt tools');
assert.ok(shell.includes('/receipt-app.js?v=19'), 'shell should load v19 receipt app');
assert.ok(sw.includes("const CACHE='money-owed-pwa-v19'"), 'service worker cache should advance to v19');
assert.ok(sw.includes("'./receipt-app.js?v=19'"), 'service worker should cache v19 receipt app');
assert.ok(sw.includes("'./receipt-shell.html?release=v19'"), 'service worker fallback should use v19 shell');
assert.equal(manifest.start_url, '/receipt-shell.html?release=v19');

console.log('v19 receipt release checks passed');
