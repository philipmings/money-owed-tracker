# Automatic Payment Receipts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically open a modern receipt preview after a successful incoming repayment, with Android sharing, PDF saving, and historical receipt reopening.

**Architecture:** Keep Supabase and the existing transaction API unchanged. Add a small dependency-free `receipt.js` browser module containing pure receipt-data helpers plus client-side rendering/share helpers, then wire it into the existing monolithic `index.html`. Use the confirmed transaction result for new receipts and replay a person's ordered ledger transactions for historical receipts.

**Tech Stack:** Static HTML/CSS/JavaScript PWA, Web Share API, Canvas API, browser print/PDF flow, Node.js built-in `assert` for regression tests.

**Spec:** `docs/superpowers/specs/2026-09-08-automatic-payment-receipts-design.md`

## Global Constraints

- Supabase remains the source of truth.
- Receipt generation occurs only after a successful incoming repayment write.
- TTD and USD remain separate; no conversion is performed.
- Receipt generation/share failure must not alter the saved transaction.
- No paid PDF service or new backend service.
- Existing PWA remains the only client codebase.

---

### Task 1: Receipt data helpers

**Files:**
- Create: `tests/receipt-feature.test.js`
- Create: `receipt.js`

**Interfaces:**
- Produces: `ReceiptTools.buildReceiptFromConfirmed(result, submitted)`
- Produces: `ReceiptTools.buildHistoricalReceipt(transactionId, transactions, personName)`
- Produces: `ReceiptTools.isIncomingRepayment(transaction)`
- Produces: `ReceiptTools.receiptText(receipt)`
- Produces: `ReceiptTools.receiptNumber(transactionId, transactionDate)`

- [ ] **Step 1: Write the failing test**

Test the following concrete behaviors with Node `assert`:

```js
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

const paid = ReceiptTools.buildReceiptFromConfirmed(
  { transaction_id: 'paid-001', person_name: 'Avery', currency: 'TTD', previous_balance: 400, new_balance: 0 },
  { amount: 400, description: '', transaction_date: '2026-09-08' }
);
assert.equal(paid.status, 'PAID');

const history = [
  { id: 'loan', transaction_date: '2026-09-01', currency: 'TTD', transaction_type: 'cash_loan', signed_amount: 1000, amount: 1000, direction: 1 },
  { id: 'payment', transaction_date: '2026-09-02', currency: 'TTD', transaction_type: 'repayment', signed_amount: -400, amount: 400, direction: -1, description: 'Part payment' }
];
const historical = ReceiptTools.buildHistoricalReceipt('payment', history, 'Avery');
assert.equal(historical.previousBalance, 1000);
assert.equal(historical.remainingBalance, 600);
assert.equal(historical.amount, 400);
assert.ok(ReceiptTools.isIncomingRepayment(history[1]));
assert.ok(!ReceiptTools.isIncomingRepayment({ transaction_type: 'repayment', signed_amount: 400 }));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/receipt-feature.test.js`
Expected: FAIL because `receipt.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create a dependency-free UMD-style module that exports under Node and attaches `ReceiptTools` to `window` in browsers. Normalize numeric fields with `Number`, classify `PAID` when `Math.abs(remainingBalance) < 0.005`, and replay historical transactions oldest-to-newest per currency.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/receipt-feature.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add receipt.js tests/receipt-feature.test.js
git commit -m "feat: add payment receipt data helpers"
```

### Task 2: Receipt preview and automatic trigger

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `ReceiptTools.buildReceiptFromConfirmed`
- Produces: `openReceipt(receipt)` and `closeReceipt()` UI functions

- [ ] **Step 1: Extend regression test with source assertions**

Add assertions that `index.html` contains `id="receiptOverlay"`, `id="shareReceiptBtn"`, `id="saveReceiptPdfBtn"`, references `receipt.js`, and checks `actionMode==='they_paid'` before opening a receipt.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/receipt-feature.test.js`
Expected: FAIL because receipt UI/source hooks are absent.

- [ ] **Step 3: Implement the preview**

Add a modern white receipt sheet with `PAYMENT RECEIPT`, status badge, large amount, receipt number, date, person, description, previous balance, payment received, and remaining balance. Add `Share Receipt`, `Save PDF`, and `Done` buttons. Add `<script src="receipt.js?v=17"></script>` before the app script.

In the transaction submit handler, capture the submission and `actionMode` before resetting the form. After the transaction request succeeds, if the captured mode is `they_paid`, build the receipt from `d.result` plus submitted fields, reset/load the app, then open the receipt. Do not open the receipt in the catch path.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/receipt-feature.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/receipt-feature.test.js
git commit -m "feat: preview receipts after incoming payments"
```

### Task 3: Android sharing and PDF saving

**Files:**
- Modify: `receipt.js`
- Modify: `index.html`
- Modify: `tests/receipt-feature.test.js`

**Interfaces:**
- Produces: `ReceiptTools.renderReceiptPng(receipt)` returning a PNG `Blob`
- Produces: `ReceiptTools.printReceipt(receipt)`

- [ ] **Step 1: Add failing source/format tests**

Assert `receiptText()` includes person, formatted amount/currency, receipt number, and remaining balance. Assert `index.html` wires `navigator.share` through the share button and wires the PDF button to print flow.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/receipt-feature.test.js`
Expected: FAIL on missing share/print implementation.

- [ ] **Step 3: Implement share and PDF flows**

Render a 1080px-wide minimalist receipt image to an off-screen canvas and convert it to a PNG blob. On `Share Receipt`, prefer `navigator.share({ files:[pngFile], title:'Payment Receipt' })`; if file sharing is unsupported, share receipt text; if Web Share is unavailable, download the PNG. On `Save PDF`, open a print-only receipt document and call `print()` so Android/Desktop can choose Save as PDF.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/receipt-feature.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add receipt.js index.html tests/receipt-feature.test.js
git commit -m "feat: share and save payment receipts"
```

### Task 4: Historical receipt reopening

**Files:**
- Modify: `index.html`
- Modify: `tests/receipt-feature.test.js`

**Interfaces:**
- Consumes: `ReceiptTools.isIncomingRepayment`
- Consumes: `ReceiptTools.buildHistoricalReceipt`

- [ ] **Step 1: Add failing source assertion**

Assert the statement transaction renderer outputs a receipt action for incoming repayment rows and that a click handler calls `buildHistoricalReceipt` with the selected person's transaction list.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/receipt-feature.test.js`
Expected: FAIL because historical receipt buttons are absent.

- [ ] **Step 3: Implement historical receipt action**

For each statement row where `transaction_type==='repayment'` and `signed_amount < 0`, show a small `Receipt` button. Reconstruct its prior and resulting currency balance by replaying the person's transactions oldest-to-newest, then open the same receipt preview. Do not modify ledger data.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/receipt-feature.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/receipt-feature.test.js
git commit -m "feat: reopen historical payment receipts"
```

### Task 5: PWA release and verification

**Files:**
- Modify: `sw.js`
- Modify: `manifest.webmanifest`
- Modify: `index.html`

**Interfaces:**
- No new public interfaces.

- [ ] **Step 1: Add receipt asset to service-worker cache**

Bump the service-worker cache to `money-owed-power-v17`, add `./receipt.js?v=17` to static assets, and update the app build marker and manifest release to `v17`.

- [ ] **Step 2: Run all repository tests**

Run:

```bash
node tests/transaction-mapping.test.js
node tests/receipt-feature.test.js
```

Expected: both PASS with no warnings.

- [ ] **Step 3: Verify the production-facing source**

Confirm the branch contains the automatic receipt trigger, receipt preview, receipt sharing/PDF controls, historical receipt action, and PWA release `v17`.

- [ ] **Step 4: Commit**

```bash
git add sw.js manifest.webmanifest index.html
git commit -m "chore: release receipt-enabled PWA v17"
```

- [ ] **Step 5: Merge only after verification**

Merge the feature branch to `main`, confirm the Vercel status is successful, and leave Supabase unchanged.
