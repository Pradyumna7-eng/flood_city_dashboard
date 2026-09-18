import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { EspConfigPanel } from './components/EspConfigPanel';
import { WaterLevelVisualizer } from './components/WaterLevelVisualizer';
import { CurrentFlowGauge } from './components/CurrentFlowGauge';
import { DangerStatusCard } from './components/DangerStatusCard';
import { LiveTelemetryChart } from './components/LiveTelemetryChart';
import { CityZonesOverview } from './components/CityZonesOverview';
import { TelemetryLogTable } from './components/TelemetryLogTable';
import { EspCodeModal } from './components/EspCodeModal';
import { ThresholdSettingsModal } from './components/ThresholdSettingsModal';
import { 
  CityZone, 
  DangerLevel, 
  EspConfig, 
  TelemetryReading, 
  ThresholdConfig 
} from './types';
import { DEFAULT_THRESHOLDS, evaluateDanger } from './utils/dangerEvaluation';
import { fetchEspData, buildEspUrl } from './services/espService';
import { alertAudio } from './utils/audioAlert';

const INITIAL_ZONES: CityZone[] = [
  {
    id: 'zone-1',
    name: 'Sector A: River Sluice Gate 01',
    location: 'Central River Embankment',
    type: 'River Sluice',
    waterLevel: 24.5,
    waterCurrent: 0.45,
    dangerLevel: 'SAFE',
    status: 'ONLINE',
    isEspConnected: true,
  },
  {
    id: 'zone-2',
    name: 'Sector B: Highway Underpass',
    location: 'Dip Road / Subway Canal',
    type: 'Urban Underpass',
    waterLevel: 18.2,
    waterCurrent: 0.30,
    dangerLevel: 'SAFE',
    status: 'MONITORING',
  },
  {
    id: 'zone-3',
    name: 'Sector C: North Canal Spillway',
    location: 'City Retention Basin',
    type: 'Spillway',
    waterLevel: 31.0,
    waterCurrent: 0.85,
    dangerLevel: 'SAFE',
    status: 'MONITORING',
  },
  {
    id: 'zone-4',
    name: 'Sector D: Downtown Storm Drain',
    location: 'Commercial Market Basin',
    type: 'Drainage Canal',
    waterLevel: 21.4,
    waterCurrent: 0.35,
    dangerLevel: 'SAFE',
    status: 'MONITORING',
  },
];

export default function App() {
  // ---- Thresholds & Limits State ----
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);

  // ---- ESP Configuration State ----
  const [espConfig, setEspConfig] = useState<EspConfig>(() => {
    try {
      const saved = localStorage.getItem('fmc_esp_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      ipAddress: '192.168.1.184',
      port: 80,
      endpointPath: '/data',
      pollIntervalMs: 2000,
      useProxy: true,
      connectionMode: 'hardware',
      activeZoneId: 'zone-1',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('fmc_esp_config', JSON.stringify(espConfig));
    } catch {
      // ignore
    }
  }, [espConfig]);

  // ---- Telemetry Real-time Values ----
  const [waterLevel, setWaterLevel] = useState<number>(24.5);
  const [waterCurrent, setWaterCurrent] = useState<number>(0.45);
  const [rateOfRise, setRateOfRise] = useState<number>(0.0);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryReading[]>([]);
  const [zones, setZones] = useState<CityZone[]>(INITIAL_ZONES);

  // ---- Connection Test Status ----
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    rawPayload?: string;
  } | null>(null);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);
  const [fetchCount, setFetchCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);

  // ---- Interactive Demo Mode State ----
  const [simWaterLevel, setSimWaterLevel] = useState<number>(24.0);
  const [simWaterCurrent, setSimWaterCurrent] = useState<number>(0.45);
  const [activeScenario, setActiveScenario] = useState<'NORMAL' | 'RISING_MONSOON' | 'HIGH_FLOOD' | 'FLASH_SURGE' | 'MANUAL'>('NORMAL');
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(true);

  // ---- Modals & Siren Audio ----
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [codeModalOpen, setCodeModalOpen] = useState<boolean>(false);
  const [thresholdModalOpen, setThresholdModalOpen] = useState<boolean>(false);

  // Refs for tracking changes
  const prevLevelRef = useRef<number>(24.5);
  const prevTimestampRef = useRef<number>(Date.now());
  const prevDangerLevelRef = useRef<DangerLevel>('SAFE');

  // Danger Assessment Calculation
  const { dangerLevel, score: dangerScore, assessment } = evaluateDanger(
    waterLevel,
    waterCurrent,
    thresholds
  );

  // Siren Audio Control
  useEffect(() => {
    if (dangerLevel === 'CRITICAL' && !isMuted) {
      alertAudio.playCriticalSiren();
    } else {
      alertAudio.stopAlert();
    }

    if (
      dangerLevel !== prevDangerLevelRef.current &&
      (dangerLevel === 'CAUTION' || dangerLevel === 'HIGH_DANGER') &&
      !isMuted
    ) {
      alertAudio.playWarningBeep();
    }
    prevDangerLevelRef.current = dangerLevel;
  }, [dangerLevel, isMuted]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    alertAudio.setMuted(nextMuted);
    if (!nextMuted) {
      alertAudio.playWarningBeep();
    }
  };

  // Record Telemetry
  const recordTelemetry = useCallback(
    (level: number, current: number, source: 'ESP_HARDWARE' | 'SIMULATOR') => {
      const now = Date.now();
      const elapsedMin = Math.max(0.01, (now - prevTimestampRef.current) / 60000);
      const deltaLevel = level - prevLevelRef.current;
      const computedRate = parseFloat((deltaLevel / elapsedMin).toFixed(1));

      prevLevelRef.current = level;
      prevTimestampRef.current = now;
      setRateOfRise(computedRate);

      const dangerInfo = evaluateDanger(level, current, thresholds);

      const newReading: TelemetryReading = {
        id: `reading-${now}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: now,
        waterLevel: level,
        waterCurrent: current,
        rateOfRise: computedRate,
        combinedDangerScore: dangerInfo.score,
        dangerLevel: dangerInfo.dangerLevel,
        source,
      };

      setTelemetryHistory((prev) => {
        const updated = [...prev, newReading];
        return updated.length > 200 ? updated.slice(-200) : updated;
      });

      // Update active zone
      setZones((prevZones) =>
        prevZones.map((z) => {
          if (z.id === espConfig.activeZoneId) {
            return {
              ...z,
              waterLevel: level,
              waterCurrent: current,
              dangerLevel: dangerInfo.dangerLevel,
            };
          }
          return z;
        })
      );
    },
    [thresholds, espConfig.activeZoneId]
  );

  // Manual Ping / Connect button
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await fetchEspData(espConfig);
      if (result.success) {
        setTestResult({
          success: true,
          message: `Connected successfully! Depth: ${result.waterLevel.toFixed(1)} cm, Speed: ${result.waterCurrent.toFixed(2)} m/s (${result.latencyMs}ms response)`,
          latencyMs: result.latencyMs,
          rawPayload: result.rawResponse,
        });
        setWaterLevel(result.waterLevel);
        setWaterCurrent(result.waterCurrent);
        setLastSuccessfulFetch(new Date());
        setFetchCount((c) => c + 1);
        recordTelemetry(result.waterLevel, result.waterCurrent, 'ESP_HARDWARE');
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Could not connect. Ensure your computer is on the same Wi-Fi as the ESP.',
          latencyMs: result.latencyMs,
        });
        setErrorCount((c) => c + 1);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error.',
      });
      setErrorCount((c) => c + 1);
    } finally {
      setIsTesting(false);
    }
  };

  // Scenario switch
  const handleSelectScenario = (sc: 'NORMAL' | 'RISING_MONSOON' | 'HIGH_FLOOD' | 'FLASH_SURGE' | 'MANUAL') => {
    setActiveScenario(sc);
    switch (sc) {
      case 'NORMAL':
        setSimWaterLevel(22.0);
        setSimWaterCurrent(0.40);
        break;
      case 'RISING_MONSOON':
        setSimWaterLevel(54.0);
        setSimWaterCurrent(1.65);
        break;
      case 'HIGH_FLOOD':
        setSimWaterLevel(78.5);
        setSimWaterCurrent(2.85);
        break;
      case 'FLASH_SURGE':
        setSimWaterLevel(94.0);
        setSimWaterCurrent(4.15);
        break;
      case 'MANUAL':
        break;
    }
  };

  // Main polling loop
  useEffect(() => {
    const interval = setInterval(async () => {
      if (espConfig.connectionMode === 'hardware') {
        try {
          const result = await fetchEspData(espConfig);
          if (result.success) {
            setWaterLevel(result.waterLevel);
            setWaterCurrent(result.waterCurrent);
            setLastSuccessfulFetch(new Date());
            setFetchCount((c) => c + 1);
            recordTelemetry(result.waterLevel, result.waterCurrent, 'ESP_HARDWARE');
          } else {
            setErrorCount((c) => c + 1);
          }
        } catch {
          setErrorCount((c) => c + 1);
        }
      } else {
        // DEMO SIMULATION
        let targetLevel = simWaterLevel;
        let targetCurrent = simWaterCurrent;

        if (noiseEnabled) {
          const noiseL = (Math.random() - 0.5) * 0.6;
          const noiseC = (Math.random() - 0.5) * 0.05;
          targetLevel = Math.max(0, targetLevel + noiseL);
          targetCurrent = Math.max(0, targetCurrent + noiseC);
        }

        if (activeScenario === 'RISING_MONSOON' && targetLevel < 65) {
          targetLevel += 0.2;
          setSimWaterLevel(targetLevel);
        }

        setWaterLevel(targetLevel);
        setWaterCurrent(targetCurrent);
        setLastSuccessfulFetch(new Date());
        setFetchCount((c) => c + 1);
        recordTelemetry(targetLevel, targetCurrent, 'SIMULATOR');
      }
    }, espConfig.pollIntervalMs);

    return () => clearInterval(interval);
  }, [espConfig, simWaterLevel, simWaterCurrent, noiseEnabled, activeScenario, recordTelemetry]);

  // Seed history
  useEffect(() => {
    if (telemetryHistory.length === 0) {
      const now = Date.now();
      const initialLogs: TelemetryReading[] = [];
      for (let i = 12; i >= 0; i--) {
        const t = now - i * 3000;
        const baseLevel = 22 + Math.sin(i / 2) * 1.5;
        const baseCurrent = 0.42 + Math.cos(i / 2) * 0.06;
        const ev = evaluateDanger(baseLevel, baseCurrent, thresholds);
        initialLogs.push({
          id: `seed-${t}`,
          timestamp: t,
          waterLevel: baseLevel,
          waterCurrent: baseCurrent,
          rateOfRise: 0.1,
          combinedDangerScore: ev.score,
          dangerLevel: ev.dangerLevel,
          source: 'SIMULATOR',
        });
      }
      setTelemetryHistory(initialLogs);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <Header
        dangerLevel={dangerLevel}
        waterLevel={waterLevel}
        waterCurrent={waterCurrent}
        ipAddress={espConfig.ipAddress}
        isSimulator={espConfig.connectionMode === 'simulator'}
        onOpenCodeModal={() => setCodeModalOpen(true)}
        onOpenThresholdModal={() => setThresholdModalOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* 1. Hero Danger Status: Crystal clear for anyone to understand */}
        <DangerStatusCard
          assessment={assessment}
          dangerLevel={dangerLevel}
          dangerScore={dangerScore}
          waterLevel={waterLevel}
          waterCurrent={waterCurrent}
          thresholds={thresholds}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />

        {/* 2. Real-Time Telemetry: Depth & Current Flow Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WaterLevelVisualizer
            waterLevel={waterLevel}
            rateOfRise={rateOfRise}
            dangerLevel={dangerLevel}
            thresholds={thresholds}
          />

          <CurrentFlowGauge
            waterCurrent={waterCurrent}
            waterLevel={waterLevel}
            dangerLevel={dangerLevel}
            thresholds={thresholds}
          />
        </div>

        {/* 3. ESP Wi-Fi IP Configuration & Presentation Demo Section */}
        <EspConfigPanel
          config={espConfig}
          onChangeConfig={(changes) => setEspConfig((prev) => ({ ...prev, ...changes }))}
          onTestConnection={handleTestConnection}
          isTesting={isTesting}
          testResult={testResult}
          lastSuccessfulFetch={lastSuccessfulFetch}
          fetchCount={fetchCount}
          errorCount={errorCount}
          simWaterLevel={simWaterLevel}
          simWaterCurrent={simWaterCurrent}
          onUpdateSimValues={(lvl, curr) => {
            setSimWaterLevel(lvl);
            setSimWaterCurrent(curr);
          }}
          activeScenario={activeScenario}
          onSelectScenario={handleSelectScenario}
          noiseEnabled={noiseEnabled}
          onToggleNoise={() => setNoiseEnabled(!noiseEnabled)}
        />

        {/* 4. Real-time Timeline Trend Chart */}
        <LiveTelemetryChart
          history={telemetryHistory}
          thresholds={thresholds}
        />

        {/* 5. City Sectors Overview */}
        <CityZonesOverview
          zones={zones}
          activeZoneId={espConfig.activeZoneId}
          onSelectZone={(zId) => setEspConfig((prev) => ({ ...prev, activeZoneId: zId }))}
          espIpAddress={espConfig.ipAddress}
        />

        {/* 6. Data History & Download for Project Submission */}
        <TelemetryLogTable
          logs={telemetryHistory}
          onClearLogs={() => setTelemetryHistory([])}
        />

      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Flood Management City • College Project Dashboard</span>
          <span>Dual Sensor Monitoring: Water Level (cm) & Current Flow (m/s)</span>
        </div>
      </footer>

      {/* Arduino Code Generator Modal */}
      <EspCodeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        ipAddress={espConfig.ipAddress}
      />

      {/* Danger Threshold Calibration Modal */}
      <ThresholdSettingsModal
        isOpen={thresholdModalOpen}
        onClose={() => setThresholdModalOpen(false)}
        thresholds={thresholds}
        onSave={(newThresh) => setThresholds(newThresh)}
      />

    </div>
  );
}
