const fs = require('fs');
const assert = require('assert');

const shell = fs.readFileSync('receipt-shell.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));

assert.ok(shell.includes("fetch('/index.html?core=v18'"), 'shell should load v18 core');
assert.ok(shell.includes('/receipt.js?v=18'), 'shell should load v18 receipt tools');
assert.ok(shell.includes('/receipt-app.js?v=18'), 'shell should load v18 receipt app');
assert.ok(sw.includes("const CACHE='money-owed-pwa-v18'"), 'service worker cache should advance to v18');
assert.ok(sw.includes("'./receipt-app.js?v=18'"), 'service worker should cache v18 receipt app');
assert.ok(sw.includes("'./receipt-shell.html?release=v18'"), 'service worker fallback should use v18 shell');
assert.equal(manifest.start_url, '/receipt-shell.html?release=v18');

console.log('v18 receipt release checks passed');
