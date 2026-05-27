# Wealth Tracker

A local-first investment, savings, debt, and net worth tracking dashboard built with React, Vite, Tailwind CSS, shadcn/Radix UI components, Recharts, Framer Motion, Lucide icons, and local browser storage.

This app is designed to help track:

- Investment funds
- Roth IRA progress
- Savings goals
- Real estate fund
- Business acquisition fund
- ETF allocations
- Debt and liabilities
- Net worth over time
- Growth projections
- Monthly contributions
- JSON backups

---

## Important Security Note

This app runs locally in your browser.

It is okay to track:

- Account balances
- Savings goals
- Contribution plans
- ETF allocation percentages
- Debt balances
- Net worth snapshots

Do **not** store:

- Bank passwords
- Brokerage passwords
- Account numbers
- Routing numbers
- Social Security numbers
- Tax IDs
- Security questions
- Private API keys

Use the app as a personal dashboard, not as a password vault.

---

## Requirements

You need **Node.js** and **npm** installed.

Recommended:

```bash
node -v
npm -v
```

Node should be:

```txt
20.19.0 or newer
```

or:

```txt
22.12.0 or newer
```

If Node is not installed, download and install the **LTS version** from the official Node.js website.

Anaconda is not enough by itself. Anaconda is useful for Python/data science, but this app is a JavaScript/React app and needs Node.js.

---

## Project Folder Structure

The folder should look something like this:

```txt
wealth-tracker/
  README.md
  package.json
  package-lock.json
  index.html
  vite.config.js
  jsconfig.json
  src/
    App.jsx
    main.jsx
    index.css
    components/
      ui/
        button.jsx
        card.jsx
        input.jsx
        label.jsx
        select.jsx
        dialog.jsx
```

Do **not** worry if there are extra config files.

Do **not** manually create or edit the `node_modules` folder. It will be created automatically after installing dependencies.

---

## Installation

Open Terminal, Command Prompt, PowerShell, or Anaconda Prompt.

Navigate into the project folder.

### Mac example

```bash
cd ~/Desktop/wealth-tracker
```

### Windows example

```bash
cd %USERPROFILE%\Desktop\wealth-tracker
```

Then install dependencies:

```bash
npm install
```

This may take a few minutes.

---

## Running the App

After installation, run:

```bash
npm run dev
```

The terminal should show a local URL, usually:

```txt
http://127.0.0.1:5173
```

Open that URL in your browser.

---

## Stopping the App

In the terminal window where the app is running, press:

```txt
Control + C
```

Then confirm if the terminal asks.

---

## Saving Data

The app saves data locally in your browser.

However, browser storage can be cleared if you:

- clear browser history/site data
- use private/incognito mode
- switch browsers
- open a different localhost port
- reset local browser storage

Use the **Export** button regularly to save a JSON backup.

Recommended:

```txt
Export a backup once per month.
```

---

## Importing a Backup

To restore previous data:

1. Open the app.
2. Click **Import**.
3. Choose your exported JSON backup file.

---

## Recommended Use

A simple workflow:

1. Update fund balances weekly or monthly.
2. Add contributions when you invest or save money.
3. Add debt payments when you make them.
4. Save a net worth snapshot once per month.
5. Export a JSON backup once per month.

---

## Main Features

### Dashboard

Shows your main funds, including:

- Current balance
- Target balance
- Monthly contribution plan
- Annual return assumption
- Estimated time to target

### Debt Tab

Tracks liabilities such as:

- Credit cards
- Student loans
- Auto loans
- Personal loans
- Mortgage debt
- Other debt

Each debt can include:

- Current balance
- Original balance
- APR
- Minimum payment
- Extra payment
- Due day
- Notes
- Payoff estimate

### Visuals Tab

Shows charts for:

- Balance sheet view
- Asset progress
- Asset allocation
- Debt allocation
- Monthly planned vs actual contributions
- Net worth over time

### Transactions Tab

Tracks contributions, withdrawals, gains, and losses for your funds.

### Snapshots Tab

Lets you save monthly net worth snapshots.

Snapshots help build a history of:

- Assets
- Debt
- Net worth

### ETF Allocation Tab

Tracks ETF allocation targets and current values.

Example tickers:

- VTI
- QQQM
- VGT
- AVUV
- SCHG
- SMH
- VUG

### Projections Tab

Shows projected growth using:

- Each fund's current balance
- Each fund's monthly contribution
- Each fund's annual return assumption
- Current debt balances
- Debt APRs
- Debt payments

The projection chart includes:

- Projected assets
- Projected debt
- Projected net worth
- Individual fund lines

### Settings Tab

Includes:

- Backup reminder frequency
- Export backup
- Reset starter template
- Clear local save

---

## Troubleshooting

### `npm` is not recognized

Node.js is probably not installed correctly.

Install the LTS version of Node.js, then close and reopen the terminal.

Check:

```bash
node -v
npm -v
```

---

### App says Node version is too old

Install a newer Node LTS version.

You need:

```txt
Node 20.19.0+
```

or:

```txt
Node 22.12.0+
```

---

### App opens but data is gone

Check whether:

- You are using the same browser.
- You are not in private/incognito mode.
- You are using the same local URL.
- You did not clear site data.
- The app is not running on a different port.

For example, these are treated as different storage locations:

```txt
http://localhost:5173
http://localhost:5174
http://127.0.0.1:5173
```

Use the same URL consistently.

---

### Dependencies seem broken

Try reinstalling:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run dev
```

Only do this if normal `npm install` does not work.

---

## Sharing the App

When sending this app to someone else, send the folder as a ZIP file.

Include:

```txt
package.json
package-lock.json
index.html
vite.config.js
jsconfig.json
src/
README.md
```

Do **not** include:

```txt
node_modules/
dist/
```

The other person can recreate `node_modules` by running:

```bash
npm install
```

---

## Optional Quick Start Scripts

You can add these scripts to make running easier.

### Mac: `run-mac.command`

```bash
#!/bin/bash
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Starting Wealth Tracker..."
npm run dev
```

Before sending, make it executable:

```bash
chmod +x run-mac.command
```

### Windows: `run-windows.bat`

```bat
@echo off
cd /d "%~dp0"

echo Installing dependencies...
npm install

echo Starting Wealth Tracker...
npm run dev

pause
```

---

## Future Upgrade Ideas

Possible future improvements:

- Package as a desktop app with Tauri or Electron
- Move storage to SQLite
- Add CSV import/export
- Add recurring transaction automation
- Add debt avalanche vs snowball simulator
- Add investment vs debt payoff comparison
- Add printable monthly net worth report

---

## Disclaimer

This app is for personal tracking and educational purposes only. It does not provide financial, investment, tax, or legal advice.
# wealth-tracker
