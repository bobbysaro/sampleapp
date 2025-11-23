# Financial Planner UI

This small static UI provides three tabs: `Income`, `Utilities`, and `Bills`.

Features:
- Each tab starts with one row containing a text field, amount, and date.
- Click `Add ... Row` to add more rows.
- Each row has a `Delete` button to remove it.

Save & Load:
- Use the `Save` button in each tab to persist that tab's rows to `localStorage`.
- Use the `Load` button to restore saved rows for that tab.
- The app will automatically load saved data for each tab on page open if present.

Export / Import:
- Use `Export JSON` to download the current tab as a JSON file. The file contains an array of objects: `{name, amount, date, balance?}`.
- Use `Export CSV` to download a CSV file. Headers: `name,amount,date` (for `bills` the header includes `balance`).
- Use `Import` to upload a previously exported JSON or CSV and populate the tab. Importing replaces the current rows in the tab (it does not automatically save to `localStorage` — click `Save` to persist).

Notes on CSV import:
- The importer supports quoted fields and commas inside quotes.
- It attempts to map common header names (`name`, `source`, `bill`, `amount`, `balance`, `date`). If your CSV has different headers, adjust the file or use JSON.

How to open:
1. Open `/workspaces/sampleapp/financialplanner/index.html` in your browser.
2. Or run a simple static server from the folder, for example:

```bash
cd /workspaces/sampleapp/financialplanner
python3 -m http.server 8000
# then open http://localhost:8000
```

Server-side CSV saves
- The app can now write per-category CSV files on the server when you click `Save`.
- Start the backend in the `financialplanner` folder:

```bash
cd /workspaces/sampleapp/financialplanner
python3 -m pip install -r requirements.txt
python3 server.py --host 127.0.0.1 --port 5000
```

- The server exposes:
	- `POST /save/<section>` — append rows to CSV for `income|utilities|bills`. The frontend calls this automatically when you click Save (it also saves to `localStorage`).
	- `GET /download/<section>` — download the CSV file for a section, e.g. `http://127.0.0.1:5000/download/bills`.
		- `GET /download/all.zip` — download a ZIP archive containing `income.csv`, `utilities.csv`, and `bills.csv`.

- CSV files are stored under `financialplanner/data/` as `income.csv`, `utilities.csv`, `bills.csv`.
