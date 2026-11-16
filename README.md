# Task Log

A small website to log tasks. Everything runs in the browser, with no server and no install.

## Files
- `index.html` : page structure (form, table, confirm popup)
- `style.css` : styles, with light and dark mode
- `script.js` : all behaviour

## Run
Open `index.html` in a browser. To serve it locally instead:

    python3 -m http.server 8000

then go to http://localhost:8000

## Features
- Task Link: paste a link and the ID is read from `/id/<number>/`
- Date: yesterday and earlier are disabled
- End time: set automatically to the current time on submit
- Status: Submitted or Pending
- Table: Edit, Delete (type the ID to confirm), select rows and Delete selected, 10 rows per page, filter by date, CSV download

## Data
Tasks are stored in the browser's localStorage under the key `taskLog.v1`, on this device only.
Use Download CSV to keep a copy.
