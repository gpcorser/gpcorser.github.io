# To-Do PWA — project rules

A to-do list Progressive Web App (Assignment 1).

## Hard rules
- Plain HTML, CSS and JavaScript only. No frameworks, no libraries, no build tools, no npm.
- All data stays on the device in `localStorage`. No server, no accounts, no network calls.
- Never insert user-entered text as HTML. Use `textContent` / `value`, never `innerHTML` with user data.
- Mobile first: the layout must work at 375px wide.
- Every input has a visible `<label>`; everything works with the keyboard.

## Files
- `index.html` — markup: header, add/edit form, sort + filter toolbar, task list, task `<template>`.
- `styles.css` — all styling; colours are CSS variables, dark mode follows the system setting.
- `app.js` — storage, state, countdown, sorting, filtering, rendering, service worker registration.
- `manifest.json` — PWA manifest ("My To-Do" / "To-Do", start_url `./`, standalone).
- `sw.js` — service worker: precache on install, cache-first fetch, delete old caches on activate.
- `icons/` — `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `icon.svg`.

## Data model
`localStorage["todo-pwa.tasks"]` holds a JSON array of:

```json
{
  "id": "string",
  "title": "string (required, non-blank)",
  "priority": "High | Medium | Low",
  "project": "string",
  "deadline": "YYYY-MM-DDTHH:mm (local time) or empty string",
  "contact": "string",
  "location": "string",
  "done": false,
  "createdAt": 1760000000000
}
```

Preferences: `todo-pwa.sort` = `{"field": "...", "dir": "asc|desc"}`, `todo-pwa.filter` = `"all" | "active" | "done"`.

## Behaviour rules
- Countdown text: "N days N hours left", "Due now" (< 1 hour left), "Overdue by N days N hours",
  "No deadline". Singular "day"/"hour" for 1. Red when overdue, orange when < 24 h. Updated every 60 s.
  Hidden on done tasks.
- Sorting: blank values always last (both directions). Priority asc = High, Medium, Low.
  Ties broken by deadline (soonest first), then title.

## Updating the app
Whenever you change any cached file, bump `CACHE_VERSION` in `sw.js` (e.g. `v1` → `v2`),
otherwise installed copies keep serving the old files.
