import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, Info, ExternalLink } from 'lucide-react';

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
  const [board, setBoard] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const esp32Code = `/*
 * ========================================================
 * FLOOD MANAGEMENT CITY - ESP32 IOT TELEMETRY NODE
 * College Engineering Project
 * Sensors: HC-SR04 Ultrasonic (Level) + YF-S201 (Flow Current)
 * ========================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h> // Install "ArduinoJson" by Benoit Blanchon in Library Manager

// ---- Wi-Fi Configuration ----
const char* ssid     = "YOUR_WIFI_SSID";     // Replace with your hotspot / Wi-Fi name
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your Wi-Fi password

WebServer server(80);

// ---- Pin Definitions ----
#define TRIG_PIN     5   // Ultrasonic HC-SR04 Trigger Pin
#define ECHO_PIN     18  // Ultrasonic HC-SR04 Echo Pin
#define FLOW_PIN     4   // Flow / Current Sensor Pulse Pin (or ACS712 on ADC)
#define BUZZER_PIN   19  // Local Emergency Siren Buzzer
#define LED_ALERT    2   // Onboard Blue Alert LED

// ---- Tank / Canal Calibration ----
const float TANK_MAX_DEPTH_CM = 100.0; // Total height from sensor to canal bed

volatile int pulseCount = 0;
float waterFlowCurrent = 0.0; // in m/s
unsigned long oldTime = 0;

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n--- Flood Management City ESP32 Node Starting ---");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);

  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  // Connect to Local Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_ALERT, !digitalRead(LED_ALERT));
  }
  digitalWrite(LED_ALERT, LOW);

  Serial.println("\\nWi-Fi Connected!");
  Serial.print("Node IP Address: ");
  Serial.println(WiFi.localIP());

  // Configure REST Endpoint
  server.on("/data", HTTP_GET, handleGetData);
  server.on("/", HTTP_GET, handleRoot);

  server.begin();
  Serial.println("HTTP Telemetry Server Started on Port 80 (/data)");
}

float measureWaterLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 0.0;

  // Speed of sound = 0.0343 cm/us
  float distanceCm = (duration * 0.0343) / 2.0;

  // Water level = Total Tank Height - Echo Distance
  float levelCm = TANK_MAX_DEPTH_CM - distanceCm;
  if (levelCm < 0) levelCm = 0;
  if (levelCm > TANK_MAX_DEPTH_CM) levelCm = TANK_MAX_DEPTH_CM;
  return levelCm;
}

float calculateCurrentFlow() {
  unsigned long now = millis();
  if (now - oldTime >= 1000) {
    detachInterrupt(digitalPinToInterrupt(FLOW_PIN));
    // YF-S201 calibration: 7.5 pulses per second ~= 1 L/min
    // Flow velocity (m/s) approx = (pulseCount / 7.5) * 0.12
    float flowLitersPerMin = (pulseCount / 7.5);
    waterFlowCurrent = flowLitersPerMin * 0.15; // Scaled to flume velocity (m/s)

    pulseCount = 0;
    oldTime = now;
    attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);
  }
  return waterFlowCurrent;
}

void handleGetData() {
  float waterLevel = measureWaterLevel();
  float currentFlow = calculateCurrentFlow();

  // Local physical alert trigger on ESP board
  if (waterLevel > 75.0 || currentFlow > 3.0) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_ALERT, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_ALERT, LOW);
  }

  // Create JSON document
  StaticJsonDocument<256> doc;
  doc["waterLevel"] = round(waterLevel * 10.0) / 10.0;
  doc["current"]    = round(currentFlow * 100.0) / 100.0;
  doc["battery"]    = 4.12;
  doc["rssi"]       = WiFi.RSSI();
  doc["timestamp"]  = millis();

  String jsonString;
  serializeJson(doc, jsonString);

  // CRITICAL: Send CORS headers so browsers accept cross-origin requests
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(200, "application/json", jsonString);

  Serial.print("Telemetry Sent -> Level: ");
  Serial.print(waterLevel);
  Serial.print(" cm, Current: ");
  Serial.print(currentFlow);
  Serial.println(" m/s");
}

void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "Flood Management City ESP32 Node Online. Fetch /data");
}

void loop() {
  server.handleClient();
  calculateCurrentFlow();
}
`;

  const esp8266Code = `/*
 * ========================================================
 * FLOOD MANAGEMENT CITY - ESP8266 (NodeMCU) IOT TELEMETRY
 * College Engineering Project
 * Sensors: HC-SR04 (Level) + Flow / Current Sensor
 * ========================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

ESP8266WebServer server(80);

// Pin Definitions for NodeMCU
#define TRIG_PIN D5 // GPIO14
#define ECHO_PIN D6 // GPIO12
#define FLOW_PIN D2 // GPIO4 (Interrupt capable)
#define BUZZER_PIN D7
#define LED_ALERT D4 // Builtin LED (active LOW on NodeMCU)

const float TANK_MAX_DEPTH_CM = 100.0;

volatile int pulseCount = 0;
float waterFlowCurrent = 0.0;
unsigned long oldTime = 0;

void ICACHE_RAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);

  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi Connected! Node IP:");
  Serial.println(WiFi.localIP());

  server.on("/data", HTTP_GET, []() {
    // Measure Ultrasonic Level
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    float distanceCm = (duration * 0.0343) / 2.0;
    float waterLevel = constrain(TANK_MAX_DEPTH_CM - distanceCm, 0.0, TANK_MAX_DEPTH_CM);

    // Build JSON
    StaticJsonDocument<256> doc;
    doc["waterLevel"] = round(waterLevel * 10.0) / 10.0;
    doc["current"] = round(waterFlowCurrent * 100.0) / 100.0;
    doc["battery"] = 3.95;
    doc["rssi"] = WiFi.RSSI();

    String out;
    serializeJson(doc, out);

    // Enable CORS
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", out);
  });

  server.begin();
}

void loop() {
  server.handleClient();

  if (millis() - oldTime >= 1000) {
    waterFlowCurrent = (pulseCount / 7.5) * 0.15;
    pulseCount = 0;
    oldTime = millis();
  }
}
`;

  const activeCode = board === 'ESP32' ? esp32Code : esp8266Code;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                ESP8266 / ESP32 Arduino Firmware Code
              </h3>
              <p className="text-xs text-slate-400">
                Ready-to-flash C++ sketch with CORS headers, HC-SR04 ultrasonic, and flow current
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

        {/* Board Selection Tabs & Action */}
        <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBoard('ESP32')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                board === 'ESP32'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              ESP32 (DOIT DevKit / WROOM)
            </button>
            <button
              type="button"
              onClick={() => setBoard('ESP8266')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                board === 'ESP8266'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              ESP8266 (NodeMCU / D1 Mini)
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Sketch'}</span>
          </button>
        </div>

        {/* Code View */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950">
          <pre className="overflow-x-auto whitespace-pre leading-relaxed">
            {activeCode}
          </pre>
        </div>

        {/* Footer Notes */}
        <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Info className="w-4 h-4" />
            Remember to replace YOUR_WIFI_SSID and PASSWORD before flashing in Arduino IDE.
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
