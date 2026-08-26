MONEY OWED TRACKER - FRESH V9 RELEASE

Upload ALL files in this folder to the ROOT of the GitHub Pages repository.
Do not upload the ZIP itself.

This release includes:
- Latest app wording, including "Person's Name"
- Removed "People owe me" / "I owe people" subtitles beneath summary values
- Description-first transaction rows
- Premium navy/gold ledger app icon
- Versioned icon filenames to defeat Samsung icon caching
- Network-first cache handling
- Person statement view
- PDF and Excel Share/Export buttons
- Excel Android permission fallback to normal download

The professional royal-blue PDF and Excel statement generator is hosted in the
existing Supabase Money Owed Tracker backend. These front-end files use that
live export service automatically.

After GitHub Pages deploys:
1. Open the site in Chrome with ?release=v9 at the end once.
2. Confirm the new page.
3. Remove the OLD installed PWA from Samsung.
4. Install the app again from Chrome so Android uses the new icon/manifest.

FINAL V10 TYPOGRAPHY UPDATE:
- Person name remains bold.
- Description, invoice number, and transaction row text are regular weight.
