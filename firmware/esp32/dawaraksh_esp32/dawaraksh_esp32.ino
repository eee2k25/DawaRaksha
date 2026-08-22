/*
 * DawaRaksh — IoT-Enabled Smart Medicine Container
 * ESP32 firmware · ThingSpeak telemetry + GSM SMS alerts
 * ---------------------------------------------------------------------------
 * Field map (must match the dashboard, src/lib/thingspeak.ts):
 *   field1 Temperature °C   (DHT22)
 *   field2 Humidity %RH     (DHT22)
 *   field3 Mass kg          (HX711 load cell)
 *   field4 Stock level %    (HC-SR04 ultrasonic fill height)
 *   field5 Door state 0/1   (MC-38 reed switch, 1 = open)
 *   field6 Leak state 0/1   (water/wet contact sensor, 1 = wet)
 *   field7 Gas raw ADC      (MQ-series, e.g. MQ-135)
 *   field8 Event code       (EVT-… / OK — same codes the dashboard renders)
 *
 * Libraries (Arduino Library Manager):
 *   - "DHT sensor library" by Adafruit (+ Adafruit Unified Sensor)
 *   - "HX711" by Bogdan Necula (bogde/HX711)
 *
 * Wiring (ESP32 DevKit V1):
 *   DHT22 data  → GPIO 4   (10k pull-up to 3V3)
 *   HC-SR04     → TRIG GPIO 5, ECHO GPIO 18
 *   HX711       → DT GPIO 16, SCK GPIO 17
 *   MQ-135 AOUT → GPIO 34 (ADC1_CH6, input-only pin)
 *   Reed (MC-38)→ GPIO 27 (INPUT_PULLUP, closed = door shut)
 *   Leak sensor → GPIO 26 (digital out, HIGH = wet)
 *   SIM900A TX  → GPIO 14 (ESP RX), RX ← GPIO 12 (ESP TX) via level shifting
 *
 * Free-tier notes: ThingSpeak requires ≥ 15 s between writes; this sketch
 * uploads every UPLOAD_INTERVAL_MS (60 s) which is well within limits.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "secrets.h" // WIFI_SSID, WIFI_PASS, THINGSPEAK_WRITE_KEY, SMS_RECIPIENT

// ------------------------------------------------------------------ pins
#define PIN_DHT 4
#define PIN_TRIG 5
#define PIN_ECHO 18
#define PIN_HX_DT 16
#define PIN_HX_SCK 17
#define PIN_GAS 34
#define PIN_REED 27
#define PIN_LEAK 26
#define PIN_GSM_RX 14 // ESP32 receives here (connect to SIM900A TX)
#define PIN_GSM_TX 12 // ESP32 transmits here (connect to SIM900A RX)

// ------------------------------------------------------------- behaviour
#define UPLOAD_INTERVAL_MS 60000UL
#define SMS_COOLDOWN_MS 900000UL // max one SMS per condition per 15 min
#define MASS_DROP_KG 0.15f       // alert when mass drops this much between reads
#define EMPTY_CM 25.0f           // distance to floor of empty compartment
#define FULL_CM 5.0f             // distance when stock is piled to the top
#define HX_CALIBRATION 420.0f    // scale factor — calibrate with a known mass
#define HX_TARE_ON_BOOT true

// Cold-chain thresholds — keep in sync with the dashboard Thresholds panel
struct Thresholds {
  float tempMin;      // °C
  float tempMax;      // °C
  float humidityMax;  // %RH
  float stockMinPct;  // %
  int gasThreshold;   // raw ADC
};
Thresholds TH = { 2.0f, 8.0f, 60.0f, 25.0f, 400 };

DHT dht(PIN_DHT, DHT22);

#include <HX711.h>
HX711 scale;

// ------------------------------------------------------------- GSM (SIM900A)
HardwareSerial gsm(1); // UART1 for the SIM900A
String smsRecipient = SMS_RECIPIENT;
unsigned long lastSmsAt = 0;

// ------------------------------------------------------------- state
float lastMassKg = -1.0f;
String lastEventCode = "OK";
unsigned long lastUploadMs = 0;
bool wifiOk = false;

// ------------------------------------------------------------------ helpers
float readTemperatureC() {
  float t = dht.readTemperature();
  return isnan(t) ? -999.0f : t;
}

float readHumidityPct() {
  float h = dht.readHumidity();
  return isnan(h) ? -1.0f : h;
}

float readMassKg() {
  if (!scale.is_ready()) return lastMassKg < 0 ? 0.0f : lastMassKg;
  long raw = scale.read_average(5);
  return (raw - scale.get_offset()) / HX_CALIBRATION;
}

/** HC-SR04 → fill percentage (100 % = full, 0 % = empty). */
int readStockPct() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 30000); // 30 ms timeout ≈ 5 m
  if (dur == 0) return -1;                   // no echo — sensor fault
  float distCm = dur * 0.0343f / 2.0f;
  if (distCm >= EMPTY_CM) return 0;
  if (distCm <= FULL_CM) return 100;
  return (int)((EMPTY_CM - distCm) * 100.0f / (EMPTY_CM - FULL_CM));
}

bool readDoorOpen() {
  return digitalRead(PIN_REED) == HIGH; // pull-up: reed open ⇒ door open
}

bool readLeakWet() {
  return digitalRead(PIN_LEAK) == HIGH;
}

int readGasRaw() {
  return analogRead(PIN_GAS); // 0–4095 on ESP32 (12-bit ADC)
}

/** Same priority order as the dashboard's deriveEventCode(). */
String deriveEventCode(float t, float rh, float mass, int stock,
                       bool doorOpen, bool wet, int gas) {
  if (wet) return "EVT-LEAK";
  if (t > TH.tempMax) return "EVT-T-HI";
  if (t < TH.tempMin) return "EVT-T-LO";
  if (rh > TH.humidityMax) return "EVT-RH-HI";
  if (stock >= 0 && stock < TH.stockMinPct) return "EVT-STK-LO";
  if (lastMassKg >= 0 && mass >= 0 && (lastMassKg - mass) >= MASS_DROP_KG) return "EVT-MASS";
  if (gas > TH.gasThreshold) return "EVT-GAS";
  if (doorOpen) return "EVT-DOOR";
  return "OK";
}

void sendSmsIfCritical(const String &code, const String &line2) {
  bool critical = (code == "EVT-LEAK") || (code == "EVT-T-HI") || (code == "EVT-T-LO");
  if (!critical || smsRecipient.length() < 8) return;
  unsigned long now = millis();
  if (now - lastSmsAt < SMS_COOLDOWN_MS) return;
  lastSmsAt = now;

  gsm.println("AT+CMGF=1"); // text mode
  delay(300);
  gsm.print("AT+CMGS=\"");
  gsm.print(smsRecipient);
  gsm.println("\"");
  delay(300);
  gsm.print("DAWARAKSH ALERT ");
  gsm.print(code);
  gsm.print(" · ");
  gsm.print(line2);
  gsm.write(26); // Ctrl+Z sends
  delay(3000);
}

bool uploadToThingSpeak(float t, float rh, float mass, int stock,
                        bool doorOpen, bool wet, int gas, const String &code) {
  HTTPClient http;
  String url = String("https://api.thingspeak.com/update?api_key=")
               + THINGSPEAK_WRITE_KEY
               + "&field1=" + String(t, 1)
               + "&field2=" + String(rh, 1)
               + "&field3=" + String(mass, 2)
               + "&field4=" + String(stock)
               + "&field5=" + (doorOpen ? "1" : "0")
               + "&field6=" + (wet ? "1" : "0")
               + "&field7=" + String(gas)
               + "&field8=" + code;
  http.begin(url);
  int status = http.GET();
  String body = http.getString();
  http.end();
  if (status == 200 && body.toInt() > 0) return true;
  Serial.printf("[ThingSpeak] write failed (HTTP %d, body '%s')\n", status, body.c_str());
  return false;
}

void connectWifi() {
  Serial.printf("[WiFi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print(".");
  }
  wifiOk = WiFi.status() == WL_CONNECTED;
  Serial.println(wifiOk ? " connected" : " FAILED (will retry next cycle)");
}

// ------------------------------------------------------------------ setup
void setup() {
  Serial.begin(115200);
  dht.begin();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_REED, INPUT_PULLUP);
  pinMode(PIN_LEAK, INPUT);
  analogReadResolution(12);

  scale.begin(PIN_HX_DT, PIN_HX_SCK);
  if (scale.is_ready() && HX_TARE_ON_BOOT) {
    Serial.println("[HX711] taring… keep the container empty");
    scale.set_scale(HX_CALIBRATION);
    scale.tare(20);
    lastMassKg = 0.0f;
  }

  gsm.begin(9600, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);
  delay(1000);
  gsm.println("AT"); // handshake — failure is non-fatal (SMS is a backup path)

  connectWifi();
}

// ------------------------------------------------------------------- loop
void loop() {
  unsigned long now = millis();
  if (now - lastUploadMs < UPLOAD_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastUploadMs = now;

  if (WiFi.status() != WL_CONNECTED) connectWifi();

  // ---- read sensors
  float t = readTemperatureC();
  float rh = readHumidityPct();
  float mass = readMassKg();
  int stock = readStockPct();
  bool doorOpen = readDoorOpen();
  bool wet = readLeakWet();
  int gas = readGasRaw();

  // DHT read can fail on cold start — retry once
  if (t < -100 || rh < 0) {
    delay(2000);
    t = readTemperatureC();
    rh = readHumidityPct();
  }

  String code = deriveEventCode(t, rh, mass, stock, doorOpen, wet, gas);

  Serial.printf("[DawaRaksh] %.1f°C %.0f%%RH %.2fkg %d%% door=%d leak=%d gas=%d → %s\n",
                t, rh, mass, stock, doorOpen, wet, gas, code.c_str());

  // ---- cloud upload
  if (wifiOk || WiFi.status() == WL_CONNECTED) {
    uploadToThingSpeak(t, rh, mass, stock, doorOpen, wet, gas, code);
  }

  // ---- GSM SMS backup for critical cold-chain breaks
  sendSmsIfCritical(code,
                    String("T=") + String(t, 1) + "C RH=" + String(rh, 0) + "%");

  // ---- bookkeeping
  if (mass >= 0) lastMassKg = mass;
  lastEventCode = code;
}
