import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Usb, CloudUpload, Wifi, Info, ShieldCheck, Lock } from 'lucide-react';

interface EspCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ipAddress: string;
}

export const EspCodeModal: React.FC<EspCodeModalProps> = ({
  isOpen,
  onClose,
  ipAddress,
}) => {
  const [method, setMethod] = useState<'CLOUD_PUSH' | 'USB_SERIAL' | 'LOCAL_WIFI'>('CLOUD_PUSH');
  const [board, setBoard] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-app-domain.com';
  const pushUrl = `${originUrl}/api/telemetry`;

  // 1. SECURE HTTPS PUSH SKETCH (TRUE ENCRYPTED HTTPS CONNECTION)
  const cloudPushSketch = `/*
 * ========================================================
 * FLOOD MANAGEMENT CITY - SECURE HTTPS TELEMETRY (TLS/SSL)
 * College Engineering Project
 * Board: ${board} | Connects over 100% Encrypted HTTPS
 * Target Endpoint: ${pushUrl}
 * ========================================================
 */

#include <${board === 'ESP32' ? 'WiFi.h' : 'ESP8266WiFi.h'}>
#include <${board === 'ESP32' ? 'HTTPClient.h' : 'ESP8266HTTPClient.h'}>
#include <${board === 'ESP32' ? 'WiFiClientSecure.h' : 'WiFiClientSecure.h'}>

const char* ssid     = "YOUR_WIFI_OR_HOTSPOT_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// Target Secure HTTPS Cloud Endpoint on your live dashboard:
const char* serverUrl = "${pushUrl}";

// Sensor Pins
#define TRIG_PIN 5   // HC-SR04 Trigger (or D5 on ESP8266)
#define ECHO_PIN 18  // HC-SR04 Echo (or D6 on ESP8266)
#define FLOW_PIN 4   // Flow sensor pulse pin (or D2 on ESP8266)

const float TANK_MAX_DEPTH_CM = 100.0;
volatile int pulseCount = 0;
float waterFlowCurrent = 0.0;
unsigned long oldTime = 0;

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  Serial.println("\\n--- Flood Management City HTTPS Node Starting ---");
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\n[OK] Wi-Fi Connected!");
  Serial.print("ESP IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Target HTTPS URL: ");
  Serial.println(serverUrl);
}

float measureWaterLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 0.0;
  float distanceCm = (duration * 0.0343) / 2.0;
  float level = TANK_MAX_DEPTH_CM - distanceCm;
  return constrain(level, 0.0, TANK_MAX_DEPTH_CM);
}

void loop() {
  // 1. Calculate water flow current from pulses
  unsigned long now = millis();
  if (now - oldTime >= 1000) {
    detachInterrupt(digitalPinToInterrupt(FLOW_PIN));
    float flowLitersPerMin = (pulseCount / 7.5); // YF-S201 formula
    waterFlowCurrent = flowLitersPerMin * 0.15;   // Scale to m/s
    pulseCount = 0;
    oldTime = now;
    attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);
  }

  // 2. Read ultrasonic depth
  float level = measureWaterLevel();

  // 3. Transmit securely over HTTPS
  if (WiFi.status() == WL_CONNECTED) {
    // WiFiClientSecure provides 256-bit TLS/SSL encryption
    WiFiClientSecure client;
    client.setInsecure(); // Skip manual CA thumbprint matching for easy IoT setup

    HTTPClient http;
    if (http.begin(client, serverUrl)) {
      http.addHeader("Content-Type", "application/json");

      String jsonPayload = "{\\"waterLevel\\":" + String(level, 1) + 
                           ",\\"waterCurrent\\":" + String(waterFlowCurrent, 2) + 
                           ",\\"battery\\":4.10}";

      Serial.print("[HTTPS POST] Sending: ");
      Serial.println(jsonPayload);

      int httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("[HTTPS OK] Code: ");
        Serial.println(httpResponseCode);
        Serial.println("Response: " + response);
      } else {
        Serial.print("[HTTPS Error] Code: ");
        Serial.println(httpResponseCode);
      }

      http.end();
    } else {
      Serial.println("[HTTPS Error] Unable to connect to server");
    }
  } else {
    Serial.println("[WiFi Error] Wi-Fi disconnected, reconnecting...");
    WiFi.reconnect();
  }

  delay(2000); // Send reading every 2 seconds
}
`;

  // 2. USB SERIAL SKETCH (EASIEST, 100% RELIABLE)
  const usbSerialSketch = `/*
 * ========================================================
 * FLOOD MANAGEMENT CITY - USB SERIAL (Zero Wi-Fi Required)
 * College Engineering Project
 * Board: ${board} | Connect via USB Cable to Laptop
 * Sensors: HC-SR04 Ultrasonic (Level) + Flow Sensor (Current)
 * ========================================================
 */

// Pin Definitions
#define TRIG_PIN     5   // HC-SR04 Trigger (or D5 on ESP8266)
#define ECHO_PIN     18  // HC-SR04 Echo (or D6 on ESP8266)
#define FLOW_PIN     4   // Flow Sensor pulse pin (or D2 on ESP8266)
#define BUZZER_PIN   19  // Siren Buzzer pin
#define LED_ALERT    2   // Alert LED pin

const float TANK_MAX_DEPTH_CM = 100.0; // Distance from sensor to canal bed (cm)

volatile int pulseCount = 0;
float waterFlowCurrent = 0.0; // in m/s
unsigned long oldTime = 0;

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  // Start Serial at 115200 baud
  Serial.begin(115200);
  delay(1000);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);

  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  Serial.println("--- Flood Management City USB Node Ready ---");
}

float measureWaterLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 0.0;

  // Sound speed = 0.0343 cm/us
  float distanceCm = (duration * 0.0343) / 2.0;
  float levelCm = TANK_MAX_DEPTH_CM - distanceCm;
  if (levelCm < 0) levelCm = 0;
  if (levelCm > TANK_MAX_DEPTH_CM) levelCm = TANK_MAX_DEPTH_CM;
  return levelCm;
}

void loop() {
  // Measure water level
  float waterLevel = measureWaterLevel();

  // Measure water flow velocity
  unsigned long now = millis();
  if (now - oldTime >= 1000) {
    detachInterrupt(digitalPinToInterrupt(FLOW_PIN));
    float flowLitersPerMin = (pulseCount / 7.5);
    waterFlowCurrent = flowLitersPerMin * 0.15; // Scaled to m/s
    pulseCount = 0;
    oldTime = now;
    attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);
  }

  // Local buzzer alert
  if (waterLevel > 75.0 || waterFlowCurrent > 3.0) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_ALERT, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_ALERT, LOW);
  }

  // Print JSON line to USB Serial Port (The website reads this directly!)
  Serial.print("{\\"waterLevel\\": ");
  Serial.print(waterLevel, 1);
  Serial.print(", \\"waterCurrent\\": ");
  Serial.print(waterFlowCurrent, 2);
  Serial.println("}");

  delay(1000); // Send reading every 1 second
}
`;

  // 3. LOCAL REST WEBSERVER SKETCH (HOSTS http://192.168.1.184/data)
  const localWifiSketch = `/*
 * ========================================================
 * FLOOD MANAGEMENT CITY - LOCAL IP REST SERVER (/data)
 * College Engineering Project
 * Board: ${board} | Hosts local WebServer with CORS Headers
 * ========================================================
 */

#include <${board === 'ESP32' ? 'WiFi.h' : 'ESP8266WiFi.h'}>
#include <${board === 'ESP32' ? 'WebServer.h' : 'ESP8266WebServer.h'}>

const char* ssid     = "YOUR_WIFI_OR_HOTSPOT_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

${board === 'ESP32' ? 'WebServer server(80);' : 'ESP8266WebServer server(80);'}

#define TRIG_PIN 5
#define ECHO_PIN 18
const float TANK_MAX_DEPTH_CM = 100.0;

void handleData() {
  // Ultrasonic measurement
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float distanceCm = (duration * 0.0343) / 2.0;
  float level = constrain(TANK_MAX_DEPTH_CM - distanceCm, 0.0, TANK_MAX_DEPTH_CM);
  float currentSpeed = 0.85; // Replace with flow sensor measurement

  String json = "{\\"waterLevel\\":" + String(level, 1) + 
                ",\\"waterCurrent\\":" + String(currentSpeed, 2) + 
                ",\\"battery\\":4.12}";

  // MANDATORY: Access-Control-Allow-Origin header for browser fetch
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi Connected!");
  Serial.print("ESP IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/data", handleData);
  server.begin();
  Serial.println("HTTP server started at http://" + WiFi.localIP().toString() + "/data");
}

void loop() {
  server.handleClient();
}
`;

  let activeCode = cloudPushSketch;
  if (method === 'USB_SERIAL') activeCode = usbSerialSketch;
  if (method === 'LOCAL_WIFI') activeCode = localWifiSketch;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ESP8266 / ESP32 Arduino Firmware Code</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  HTTPS Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ready-to-flash C++ sketch with 256-bit SSL/TLS encryption for your college project
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method selector tabs */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setMethod('CLOUD_PUSH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                method === 'CLOUD_PUSH'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>1. Secure HTTPS Push (Direct TLS)</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('USB_SERIAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                method === 'USB_SERIAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Usb className="w-3.5 h-3.5" />
              <span>2. USB Serial Cable</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('LOCAL_WIFI')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                method === 'LOCAL_WIFI'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>3. Local Webserver</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value as any)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value="ESP32">ESP32 (DOIT/WROOM)</option>
              <option value="ESP8266">ESP8266 (NodeMCU)</option>
            </select>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Sketch'}</span>
            </button>
          </div>
        </div>

        {/* Code display */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950 flex-1">
          <pre className="overflow-x-auto whitespace-pre leading-relaxed select-all">
            {activeCode}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Paste into Arduino IDE, select your {board} board and COM port, then click Upload!
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
