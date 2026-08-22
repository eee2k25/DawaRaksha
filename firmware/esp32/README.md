# DawaRaksh — ESP32 Firmware

Arduino firmware for the IoT-enabled smart medicine container. Reads six sensor
channels, derives an event code, uploads everything to ThingSpeak every 60 s,
and sends GSM SMS alerts for critical cold-chain breaks.

## Quick start

1. Open `dawaraksh_esp32/dawaraksh_esp32.ino` in Arduino IDE / PlatformIO
   (board: **ESP32 Dev Module**).
2. Install libraries via Library Manager:
   - **DHT sensor library** (Adafruit) + **Adafruit Unified Sensor**
   - **HX711** (bogde)
3. Copy `secrets.example.h` → `secrets.h` in the sketch folder and fill in:
   - Wi-Fi credentials
   - your ThingSpeak **Write API key**
   - the SMS recipient number (or leave `""` to disable SMS)
4. Upload, open Serial Monitor at **115200 baud**.

## ThingSpeak field map (must match the dashboard)

| Field | Meaning             | Sensor            | Range      |
| ----- | ------------------- | ----------------- | ---------- |
| 1     | Temperature °C      | DHT22             | 2–8 °C band |
| 2     | Humidity %RH        | DHT22             | ≤ 60 %     |
| 3     | Mass kg             | HX711 load cell   | –          |
| 4     | Stock level %       | HC-SR04 fill height | 0–100 %  |
| 5     | Door state          | MC-38 reed        | 0/1        |
| 6     | Leak state          | Wet-contact probe | 0/1        |
| 7     | Gas raw ADC         | MQ-series         | 0–4095     |
| 8     | Event code          | derived           | see below  |

## Event codes (field 8)

Priority order — first match wins (same logic as the dashboard's
`deriveEventCode()`):

`EVT-LEAK` → `EVT-T-HI` → `EVT-T-LO` → `EVT-RH-HI` → `EVT-STK-LO` →
`EVT-MASS` → `EVT-GAS` → `EVT-DOOR` → `OK`

## Calibration

- **HX711**: set `HX_CALIBRATION` using a known mass, or run the
  `Calibration` sketch from the HX711 library and paste the factor.
- **HC-SR04**: `EMPTY_CM` = distance to the floor of the empty compartment,
  `FULL_CM` = distance when stock reaches the lid.
- **Thresholds**: the `TH` struct at the top of the sketch — keep in sync with
  the dashboard's Thresholds panel.

## Wiring

See the header comment in `dawaraksh_esp32.ino` for the full pin map
(GPIO 4/5/12/14/16/17/18/26/27/34 on an ESP32 DevKit V1).
