/*
 * DawaRaksh firmware secrets — copy to secrets.h and fill in your values.
 * NEVER commit the real secrets.h to git (it is listed in .gitignore).
 */

#define WIFI_SSID "YourWiFiName"
#define WIFI_PASS "YourWiFiPassword"

// ThingSpeak → Channel → API Keys → Write API Key
#define THINGSPEAK_WRITE_KEY "YOUR_WRITE_KEY"

// Recipient for SIM900A SMS alerts ("+91XXXXXXXXXX"), or "" to disable SMS.
#define SMS_RECIPIENT "+910000000000"
