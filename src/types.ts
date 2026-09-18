export type DangerLevel = 'SAFE' | 'CAUTION' | 'HIGH_DANGER' | 'CRITICAL';

export interface TelemetryReading {
  id: string;
  timestamp: number;
  waterLevel: number; // in centimeters (or configured unit)
  waterCurrent: number; // in m/s (flow velocity)
  rateOfRise: number; // cm/min
  combinedDangerScore: number; // 0 - 100%
  dangerLevel: DangerLevel;
  batteryVoltage?: number; // e.g. 3.9V or 4.2V
  rssi?: number; // dBm WiFi signal
  source: 'ESP_HARDWARE' | 'SIMULATOR';
}

export interface ThresholdConfig {
  unit: 'cm' | 'm' | 'in';
  currentUnit: 'm/s' | 'km/h' | 'L/min';
  maxLevel: number; // e.g. 100 cm
  cautionLevel: number; // e.g. 50 cm
  highDangerLevel: number; // e.g. 75 cm
  criticalLevel: number; // e.g. 90 cm
  cautionCurrent: number; // e.g. 1.2 m/s
  highDangerCurrent: number; // e.g. 2.5 m/s
  criticalCurrent: number; // e.g. 3.8 m/s
}

export interface EspConfig {
  ipAddress: string;
  port: number;
  endpointPath: string; // e.g. "/data"
  pollIntervalMs: number; // e.g. 2000
  useProxy: boolean; // whether to route through /api/esp-proxy to bypass mixed content
  connectionMode: 'hardware' | 'simulator';
  activeZoneId: string;
}

export interface CityZone {
  id: string;
  name: string;
  location: string;
  type: 'River Sluice' | 'Urban Underpass' | 'Drainage Canal' | 'Spillway';
  waterLevel: number;
  waterCurrent: number;
  dangerLevel: DangerLevel;
  status: 'ONLINE' | 'MONITORING' | 'DISCONNECTED';
  isEspConnected?: boolean;
}

export interface DangerAssessment {
  level: DangerLevel;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  title: string;
  description: string;
  actionRequired: string;
  evacuationRecommended: boolean;
  sirenActive: boolean;
  hydrodynamicForce: number; // kN/m or qualitative scale
}
