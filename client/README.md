# CoastalRealty — Client App

React front‑end for a lobby TV display and lightweight admin console used by Coastal Realty. It renders live brokerage listings, agent details, rotating photo collages, seasonal/holiday visuals, a local news feed, and optional weather — all tuned for unattended display.

This package is the client only. It talks to the Node/Express server in `../server` via a development proxy.

## What It Does

- Listings display: cycles through MLS®/DDF® listings from the backend, showing 6-photo collages, price and key facts.
- Agent context: pulls the current listing agent profile for richer presentation.
- Seasonal overlays: periodically fades in uploaded or AI‑generated seasonal/holiday images selected in Admin.
- Admin settings: control rotation intervals and manage which images appear on the display.
- News ticker: streams regional headlines for added ambient content.
- Weather (optional): shows current conditions when configured.

## Tech Stack

- React 19, React Router 6, Redux Toolkit
- Material UI (MUI) 7 for components/theme
- Axios for API calls, `qrcode.react` for QR codes

## Key Screens

- Display View: full‑screen presentation with listing carousel, agent card, QR, news, and overlays.
- Admin / Display Settings: update display intervals, upload/manage seasonal images, and trigger AI previews.

## Development

Prereqs: Node 18+ and the server app running locally.

1) Install deps

```
npm install
```

2) Start the client

```
npm start
```

- Opens on `http://localhost:3000`.
- API requests are proxied to the server on `http://localhost:5501` (see `package.json` `proxy`).

## Configuration

The client can read environment variables from a local `.env` file. Do not commit secrets.

- API base URL: used when deploying without a dev proxy.
- Weather provider key: enables the optional weather panel in the display view.

Keep values private and scoped to your environment. Never include keys in commits or docs.

## How It Integrates

- Listings, agent details, news feed, holidays, seasonal image management, and AI preview/payment flows are served by the backend in `../server`.
- The client only calls those endpoints; it does not embed any credentials.

## Scripts

- `npm start`: run the dev server with hot reload.
- `npm run build`: create a production build in `build/`.

## Folder Overview

- `src/scenes/listings/DisplayView.jsx`: main lobby display.
- `src/scenes/admin/DisplaySettings.jsx`: admin settings and seasonal image management.
- `src/state/api.js`: API helpers used by the UI.

## Notes

- This README intentionally avoids exposing any sensitive values. Configure credentials locally via environment files and deployment secrets.
