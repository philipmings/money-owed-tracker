# Automatic Payment Receipts Design

## Goal

Automatically present a modern payment receipt preview whenever a confirmed repayment is recorded in the Money Owed Tracker, then let the user share or save that receipt without affecting the ledger entry.

## Trigger

A receipt is generated only after Supabase successfully confirms a transaction representing money received from another person. The receipt flow must never run for a failed or unconfirmed transaction.

The receipt flow applies to repayments where the person paid the user. It does not apply when the user pays someone else.

## Receipt data

The preview uses the confirmed transaction result and submitted transaction details to show:

- Receipt number derived from the confirmed transaction ID
- Person name
- Transaction date
- Currency, preserved exactly as TTD or USD
- Amount received
- Description or reference, when provided
- Previous balance
- Payment received
- Remaining balance
- Status: `PAID` when the remaining balance for that currency is zero, otherwise `PART PAYMENT`

TTD and USD remain completely separate. No currency conversion is performed.

## User flow

1. User records a repayment using the existing `They paid me` flow.
2. The app sends the transaction to Supabase.
3. Supabase confirms the transaction and returns the previous and new balance.
4. The transaction sheet closes.
5. A receipt preview opens automatically.
6. The user can choose `Share Receipt`, `Save PDF`, or `Done`.
7. Closing, canceling, or failing to share/save the receipt does not alter or undo the confirmed ledger transaction.

## Receipt presentation

The receipt is a modern minimal card on a white background with strong typography, generous spacing, subtle dividers, restrained neutral colors, and a clear `PAYMENT RECEIPT` heading. The monetary amount is the strongest visual element.

The preview is optimized for the installed PWA on Samsung/Android while remaining usable on desktop browsers.

## Sharing and PDF

`Share Receipt` uses the Web Share API where supported so Android can present its normal share sheet, including WhatsApp, email, and other installed apps. If file sharing is unsupported, the app falls back to sharing receipt text or opening a printable receipt.

`Save PDF` uses the browser print/PDF workflow from a print-optimized receipt view. No additional backend service or paid PDF provider is required.

## Historical access

A receipt can also be reopened later from a repayment transaction in transaction history. Historical receipt data comes from the saved transaction and ledger balances available to the app. The original ledger transaction is never edited to create or resend a receipt.

## Reliability and safety

- Supabase remains the source of truth.
- Receipt generation occurs after a successful ledger write only.
- Receipt generation failure never changes the recorded payment.
- Receipt actions are read-only with respect to ledger data.
- User-supplied text is escaped before being rendered into the receipt.
- Currency display never combines or converts TTD and USD.

## Scope

This feature does not add invoicing, payment processing, tax calculations, receipt emailing from a server, cloud receipt storage, or a separate Android codebase.
