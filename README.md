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

## Deployment (GitHub Pages)

Live site: **https://eee2k25.github.io/DawaRaksha/**

Deployment is automated by a workflow that lints, builds and publishes `dist/`
to Pages on every push to `main`.

Two things this repo depends on, both easy to get wrong:

1. **Pages source must be “GitHub Actions”** — in *Settings → Pages → Build and
   deployment → Source*. If it is left on *Deploy from a branch*, Pages serves
   the repository root, which contains only uncompiled sources (`src/main.tsx`),
   and the browser renders a blank page.
2. **`base` must match the repo name.** The site is served from the
   `/DawaRaksha/` sub-path, so `vite.config.ts` sets `base: '/DawaRaksha/'` for
   production builds. Without it, bundles are requested from
   `eee2k25.github.io/assets/…` and 404. If the repository is ever renamed,
   update `base` to match.

`public/.nojekyll` stops GitHub's Jekyll pass from discarding build files whose
names begin with an underscore.

To supply a non-default ThingSpeak channel to the deployed build, set repository
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
└── .env.example         # optional build-time channel config
```

## Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Recharts · lucide-react ·
ThingSpeak HTTP API · ESP32 Arduino core.
