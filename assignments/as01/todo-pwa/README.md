# My To-Do (PWA)

A to-do list Progressive Web App in plain HTML, CSS and JavaScript. Tasks are stored in your
browser's `localStorage`; there is no server and no account.

## Run locally

Service workers only run on `localhost` or `https://`, so serve the folder rather than opening
`index.html` directly. Use either of these:

- **VS Code Live Server**: right-click `index.html` and choose **Open with Live Server**
  (http://127.0.0.1:5500).
- **Python**: from this folder run `python -m http.server 5500`, then open http://localhost:5500.

## Install

- **Desktop (Chrome/Edge)**: click the Install icon in the address bar, or open the menu and choose **Install My To-Do**.
- **Android (Chrome)**: the app must be served over HTTPS (for example GitHub Pages), or reached
  as `localhost` through USB port forwarding (`chrome://inspect` → Port forwarding `5500 → localhost:5500`).
  Open it in Chrome, then use the menu → **Add to Home screen / Install app**.

## Updating

After changing any file, bump `CACHE_VERSION` in `sw.js` (`v1` → `v2`) so installed copies pick up the change.
