import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import { EspConfig } from '../types';
import { buildEspUrl } from '../services/espService';

interface EspConfigPanelProps {
  config: EspConfig;
  onChangeConfig: (newConfig: Partial<EspConfig>) => void;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
  testResult: {
    success: boolean;
    message: string;
    latencyMs?: number;
    rawPayload?: string;
  } | null;
  lastSuccessfulFetch: Date | null;
  fetchCount: number;
  errorCount: number;
  simWaterLevel: number;
  simWaterCurrent: number;
  onUpdateSimValues: (level: number, current: number) => void;
  activeScenario: string;
  onSelectScenario: (scenario: 'NORMAL' | 'RISING_MONSOON' | 'HIGH_FLOOD' | 'FLASH_SURGE' | 'MANUAL') => void;
  noiseEnabled: boolean;
  onToggleNoise: () => void;
}

export const EspConfigPanel: React.FC<EspConfigPanelProps> = ({
  config,
  onChangeConfig,
  onTestConnection,
  isTesting,
  testResult,
  lastSuccessfulFetch,
  simWaterLevel,
  simWaterCurrent,
  onUpdateSimValues,
  activeScenario,
  onSelectScenario,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
      
      {/* Top Bar: Title & Simple Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ESP Microcontroller Connection
            </h2>
            <p className="text-xs text-slate-500">
              Fetch real water level and current data from your ESP32 / ESP8266 Wi-Fi board
            </p>
          </div>
        </div>

        {/* Big Clean Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChangeConfig({ connectionMode: 'hardware' })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              config.connectionMode === 'hardware'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Real ESP Device</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeConfig({ connectionMode: 'simulator' })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              config.connectionMode === 'simulator'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo</span>
          </button>
        </div>
      </div>

      {/* Manual IP Section */}
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="esp-ip-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Enter ESP Device IP Address:
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-mono select-none">
                http://
              </span>
              <input
                id="esp-ip-input"
                type="text"
                value={config.ipAddress}
                onChange={(e) => onChangeConfig({ ipAddress: e.target.value })}
                placeholder="192.168.1.184"
                className="w-full pl-16 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              id="esp-connect-check-btn"
              type="button"
              onClick={onTestConnection}
              disabled={isTesting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Connecting...' : 'Connect to ESP'}</span>
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
            {['192.168.1.184', '192.168.4.1', '192.168.0.100'].map((ip) => (
              <button
                key={ip}
                type="button"
                onClick={() => onChangeConfig({ ipAddress: ip })}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  config.ipAddress === ip
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ip}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium ml-auto flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced' : 'Port & Route Settings'}</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        {showAdvanced && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="esp-port-field" className="block font-semibold text-slate-700 mb-1">
                Port Number (Default: 80)
              </label>
              <input
                id="esp-port-field"
                type="number"
                value={config.port}
                onChange={(e) => onChangeConfig({ port: parseInt(e.target.value, 10) || 80 })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
              />
            </div>
            <div>
              <label htmlFor="esp-path-field" className="block font-semibold text-slate-700 mb-1">
                Data URL Path (Default: /data)
              </label>
              <input
                id="esp-path-field"
                type="text"
                value={config.endpointPath}
                onChange={(e) => onChangeConfig({ endpointPath: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Friendly Test Status Message */}
        {testResult && (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="flex-1">{testResult.message}</span>
          </div>
        )}

        {/* Interactive Demo Mode Controls (Easy testing for presentations) */}
        {config.connectionMode === 'simulator' && (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Presentation Test Scenarios (Click to test reactions)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectScenario('NORMAL')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeScenario === 'NORMAL'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">1. Normal Day</div>
                <div className={`text-[11px] mt-0.5 ${activeScenario === 'NORMAL' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Safe Level (22 cm, 0.4 m/s)
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectScenario('RISING_MONSOON')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeScenario === 'RISING_MONSOON'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">2. Heavy Rain</div>
                <div className={`text-[11px] mt-0.5 ${activeScenario === 'RISING_MONSOON' ? 'text-amber-100' : 'text-slate-500'}`}>
                  Warning (54 cm, 1.6 m/s)
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectScenario('FLASH_SURGE')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeScenario === 'FLASH_SURGE'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs animate-pulse'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">3. Flash Flood!</div>
                <div className={`text-[11px] mt-0.5 ${activeScenario === 'FLASH_SURGE' ? 'text-red-100' : 'text-slate-500'}`}>
                  Critical Danger (94 cm, 4.1 m/s)
                </div>
              </button>
            </div>

            {/* Custom Sliders for Evaluator Testing */}
            <div className="pt-2 border-t border-blue-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Water Depth Slider:</span>
                  <span className="text-blue-700 font-bold">{simWaterLevel.toFixed(1)} cm</span>
                </div>
                <input
                  id="demo-level-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={simWaterLevel}
                  onChange={(e) => {
                    onSelectScenario('MANUAL');
                    onUpdateSimValues(parseFloat(e.target.value), simWaterCurrent);
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Water Current Slider:</span>
                  <span className="text-teal-700 font-bold">{simWaterCurrent.toFixed(2)} m/s</span>
                </div>
                <input
                  id="demo-current-slider"
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.1"
                  value={simWaterCurrent}
                  onChange={(e) => {
                    onSelectScenario('MANUAL');
                    onUpdateSimValues(simWaterLevel, parseFloat(e.target.value));
                  }}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
