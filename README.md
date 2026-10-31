# DawaRaksh · IoT-Enabled Smart Medicine Container

**v1.5.0** · Cold-chain monitoring for medicine storage — ESP32 sensing → ThingSpeak cloud → live operations dashboard.

DawaRaksh watches a medicine container around the clock: temperature and
humidity (cold-chain band **2–8 °C / ≤ 60 %RH**), stock fill level, payload
mass, door access, water leak and gas/air quality — with instant alerting, a
compliance-grade acknowledge workflow and historical trend charts.

> Bharat Institute of Engineering and Technology · Guide: Dr. Chandralekha M
> Project presentation: [`docs/DawaRaksha-presentation.pdf`](docs/DawaRaksha-presentation.pdf)

---

## Features

- **ThingSpeak-connected telemetry** — live readings, 800-entry history and
  thingspeak.com chart embeds from your channel; switch channels at runtime
  from the in-app ⚙ **Channel** settings (no rebuild needed).
- **Dual data modes** — *Cloud* (real ESP32 uploads via ThingSpeak) and
  *Simulate* (built-in synthetic stream for demos and testing).
- **Alert engine with hysteresis** — threshold breaches latch until values
  return to band; sustained conditions re-log every 10 minutes instead of
  spamming.
- **Compliance acknowledge workflow** — every alert is acknowledged with
  operator ID, action code and notes, stored as an audit trail.
- **Fault simulator** — inject temperature excursions, leaks, door-open,
  gas anomalies and more; in cloud mode they are written to ThingSpeak too.
- **CSV export** — one click exports the loaded channel history for reports.
- **Dark / Cream themes**, fully responsive.

## Architecture

```
 ┌────────────── ESP32 DevKit V1 ──────────────┐
 │ DHT22 · HC-SR04 · HX711 · MQ-gas            │
 │ MC-38 reed · wet-leak probe · SIM900A GSM   │
 └──────────────┬──────────────────┬───────────┘
        Wi-Fi HTTPS│                 │SMS backup
                 ▼                  ▼
           ThingSpeak channel 3444984 (default)
     fields 1–8: temp · RH · mass · stock · door · leak · gas · event
                 │
                 ▼
      DawaRaksh dashboard (this repo, React + Vite)
      polling · alert engine · charts · acknowledge workflow
```

## ThingSpeak field map

| Field | Meaning        | Unit | Sensor              |
| ----- | -------------- | ---- | ------------------- |
| 1     | Temperature    | °C   | DHT22               |
| 2     | Humidity       | %RH  | DHT22               |
| 3     | Mass           | kg   | HX711 load cell     |
| 4     | Stock level    | %    | HC-SR04             |
| 5     | Door state     | 0/1  | MC-38 reed switch   |
| 6     | Leak state     | 0/1  | Wet-contact sensor  |
| 7     | Gas raw        | ADC  | MQ-series           |
| 8     | Event code     | text | Derived on-device   |

Event codes: `EVT-LEAK`, `EVT-T-HI`, `EVT-T-LO`, `EVT-RH-HI`, `EVT-STK-LO`,
`EVT-MASS`, `EVT-GAS`, `EVT-DOOR`, `OK`.

## Run the dashboard

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to dist/
npm run preview
```

The dashboard ships pointed at the project's demo channel. To use **your own
channel**, either:

- click **⚙ Channel** in the app's connection bar, enter the channel ID +
  Read/Write keys and **Test connection** (stored in your browser only), or
- copy `.env.example` → `.env` and set `VITE_THINGSPEAK_*` before building.

You can also press **Push test reading** to write a synthetic sample without
hardware.

## Deployment

The dashboard is a static SPA — `npm run build` writes a self-contained
`dist/` that any static host can serve. Two targets are wired up:

| Host | URL | Config |
| ---- | --- | ------ |
| GitHub Pages | https://eee2k25.github.io/DawaRaksha/ | `.github/workflows/deploy.yml` |
| Render | `https://<service>.onrender.com` | `render.yaml` |

### Render (recommended for demos)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/eee2k25/DawaRaksha)

One click creates the static site from `render.yaml` (the button deploys the
repository's default branch, so `render.yaml` must be merged to `main` first).

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that defines the whole service, so there is nothing to click through:

- **Type** static site (`runtime: static`) — free, no server process, CDN-backed
- **Build** `npm ci && npm run build`, **publish** `./dist`
- **Node** 22 (Vite 7 needs `^20.19 || >=22.12`)
- **`VITE_BASE_PATH=/`** — assets resolve from the domain root, not `/DawaRaksha/`
- **Rewrite** `/* → /index.html` so deep links and refreshes load the app
- **Cache** hashed `/assets/*` for a year, `index.html` revalidated every time
- **Auto-deploy** on every push to `main`

Deploy it:

1. Push this repository to GitHub (already done).
2. In Render: **New → Blueprint**, pick the `DawaRaksha` repo, branch `main`.
   Render reads `render.yaml` and shows a preview of one static site.
3. **Apply** — the first build takes ~1–2 minutes and the site goes live at
   `https://dawaraksha.onrender.com` (name collisions get a suffix).
4. Optional: **Settings → Custom Domain** to attach your own domain.

> The Blueprint only takes effect when a service is created from it. If the
> site already exists (created by hand in the dashboard), set these instead
> under **Settings**: Build Command `npm ci && npm run build`, Publish
> Directory `dist`, env var `VITE_BASE_PATH=/` (value `/`), Node version 22,
> and a **Redirects/Rewrites** rule `/*` → `/index.html` (type **Rewrite**).

Build-time channel overrides work the same as anywhere else: add
`VITE_THINGSPEAK_CHANNEL_ID` / `VITE_THINGSPEAK_READ_KEY` in
**Environment → Environment Variables** and redeploy. They are optional — the
bundled demo channel is the default, and the in-app ⚙ **Channel** panel can
switch channels at runtime without a rebuild.

`VITE_*` values are baked in at build time, so changing one requires a
redeploy (Render does that automatically when you save the variable).

### GitHub Pages

Live site: **https://eee2k25.github.io/DawaRaksha/**

Deployment is automated by a workflow that lints, builds and publishes `dist/`
to Pages on every push to `main`.

Two things this repo depends on, both easy to get wrong:

1. **Pages source must be “GitHub Actions”** — in *Settings → Pages → Build and
   deployment → Source*. If it is left on *Deploy from a branch*, Pages serves
   the repository root, which contains only uncompiled sources (`src/main.tsx`),
   and the browser renders a blank page.
2. **`base` must match the repo name.** The site is served from the
   `/DawaRaksha/` sub-path, so the workflow builds with
   `VITE_BASE_PATH=/DawaRaksha/` and `vite.config.ts` passes it to Vite's
   `base`. Without it, bundles are requested from
   `eee2k25.github.io/assets/…` and 404. If the repository is ever renamed,
   update the value in the workflow (and in README).

Everywhere else — Render, local `npm run preview`, any root-domain host — the
base defaults to `/`, so the same source deploys unchanged.

`public/.nojekyll` stops GitHub's Jekyll pass from discarding build files whose
names begin with an underscore.

To supply a non-default ThingSpeak channel to the Pages build, set repository
variable `VITE_THINGSPEAK_CHANNEL_ID` and secret `VITE_THINGSPEAK_READ_KEY`;
otherwise the bundled demo channel is used.

## Flash the firmware

See [`firmware/esp32/`](firmware/esp32/) — Arduino sketch for the ESP32 with
the same field map and event-code logic, plus SIM900A SMS alerts for critical
excursions.

## Repository layout

```
├── src/                 # React + TypeScript dashboard (Vite, Tailwind 4)
│   ├── components/      # panels, charts, modals, simulator
│   └── lib/             # ThingSpeak client, alert engine, simulation
├── firmware/esp32/      # Arduino firmware for the container
├── docs/                # project presentation
├── .github/workflows/   # CI: build + deploy to GitHub Pages
├── render.yaml          # Render Blueprint: static site + SPA rewrite
└── .env.example         # optional build-time channel config
```

## Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Recharts · lucide-react ·
ThingSpeak HTTP API · ESP32 Arduino core.
