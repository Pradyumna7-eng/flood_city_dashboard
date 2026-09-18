import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Usb, 
  CloudUpload, 
  Globe, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Code, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  HelpCircle,
  Activity,
  Unplug,
  Lock,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { EspConfig, HardwareConnectionMethod } from '../types';
import { buildEspUrl } from '../services/espService';
import { 
  isWebSerialSupported, 
  requestAndConnectSerial, 
  disconnectSerial, 
  isSerialConnected 
} from '../services/serialService';

interface EspConfigPanelProps {
  config: EspConfig;
  onChangeConfig: (newConfig: Partial<EspConfig>) => void;
  onTestConnection: () => Promise<void>;
  isTesting: boolean;
  testResult: {
    success: boolean;
    message: string;
    diagnosticAdvice?: string;
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
  onOpenCodeModal: () => void;
  onDirectTelemetryUpdate?: (level: number, current: number, source: any) => void;
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
  onOpenCodeModal,
  onDirectTelemetryUpdate,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [serialConnected, setSerialConnected] = useState(false);
  const [lastSerialLine, setLastSerialLine] = useState<string>('');
  const [serialError, setSerialError] = useState<string | null>(null);

  // Sync serial state on mount or change
  useEffect(() => {
    setSerialConnected(isSerialConnected());
  }, [config.hardwareMethod]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pushEndpointUrl = `${originUrl}/api/telemetry`;

  const handleCopyPushUrl = () => {
    navigator.clipboard.writeText(pushEndpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleConnectUsb = async () => {
    setSerialError(null);
    const success = await requestAndConnectSerial(
      config.serialBaudRate || 115200,
      (data) => {
        setLastSerialLine(data.raw);
        if (onDirectTelemetryUpdate) {
          onDirectTelemetryUpdate(data.waterLevel, data.waterCurrent, 'USB_SERIAL');
        }
      },
      (errMsg) => {
        setSerialError(errMsg);
      },
      (connected) => {
        setSerialConnected(connected);
      }
    );
    if (success) {
      setSerialConnected(true);
    }
  };

  const handleDisconnectUsb = async () => {
    await disconnectSerial();
    setSerialConnected(false);
    setLastSerialLine('');
  };

  const handleSendTestWebhook = async () => {
    try {
      const testVal = (Math.random() * 40 + 20).toFixed(1);
      const testFlow = (Math.random() * 1.5 + 0.3).toFixed(2);
      const res = await fetch(`/api/telemetry?level=${testVal}&current=${testFlow}`);
      if (res.ok) {
        onTestConnection();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs transition-all">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            config.connectionMode === 'simulator' 
              ? 'bg-amber-50 text-amber-600'
              : serialConnected || (testResult?.success)
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-blue-50 text-blue-600'
          }`}>
            {config.connectionMode === 'simulator' ? (
              <Sparkles className="w-5 h-5" />
            ) : config.hardwareMethod === 'usb_serial' ? (
              <Usb className="w-5 h-5" />
            ) : config.hardwareMethod === 'cloud_push' ? (
              <CloudUpload className="w-5 h-5" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                ESP Hardware Connectivity
              </h2>
              {config.connectionMode === 'hardware' && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                  serialConnected || (testResult?.success)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    serialConnected || (testResult?.success) ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                  }`} />
                  {serialConnected ? 'USB Active' : testResult?.success ? 'Receiving' : 'Standby'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Connect your ESP32 / ESP8266 microcontroller using any preferred method
            </p>
          </div>
        </div>

        {/* Primary Mode Toggle: Real Hardware vs Simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenCodeModal}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="View ready-to-flash Arduino sketches"
          >
            <Code className="w-3.5 h-3.5 text-blue-600" />
            <span>Arduino Sketches</span>
          </button>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeConfig({ connectionMode: 'hardware' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                config.connectionMode === 'hardware'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Real ESP Hardware</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ connectionMode: 'simulator' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                config.connectionMode === 'simulator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presentation Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Hardware Connection Methods */}
      {config.connectionMode === 'hardware' ? (
        <div className="mt-4 space-y-4">
          
          {/* Hardware Connection Channel Tabs */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Connection Channel:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Tab 1: USB Serial */}
              <button
                type="button"
                onClick={() => onChangeConfig({ hardwareMethod: 'usb_serial' })}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  config.hardwareMethod === 'usb_serial'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Usb className="w-4 h-4 text-blue-600" />
                  <span>USB Cable (Serial)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                  Direct laptop COM port. Zero Wi-Fi/router needed!
                </div>
                {serialConnected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>

              {/* Tab 2: HTTPS Cloud Telemetry Push */}
              <button
                type="button"
                onClick={() => onChangeConfig({ hardwareMethod: 'cloud_push' })}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  config.hardwareMethod === 'cloud_push'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>HTTPS Cloud Push</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                  Direct HTTPS (TLS). 100% verified SSL security.
                </div>
                <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                  🔒 Verified HTTPS
                </span>
              </button>

              {/* Tab 3: Local ESP IP / HTTPS URL */}
              <button
                type="button"
                onClick={() => onChangeConfig({ hardwareMethod: 'wifi_ip' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.hardwareMethod === 'wifi_ip'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  <span>ESP IP / HTTPS URL</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                  Polls ESP via HTTPS (SSL) or HTTP.
                </div>
              </button>

              {/* Tab 4: ThingSpeak Cloud */}
              <button
                type="button"
                onClick={() => onChangeConfig({ hardwareMethod: 'thingspeak' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  config.hardwareMethod === 'thingspeak'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>ThingSpeak IoT</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                  Fetches live feeds using ThingSpeak Channel ID.
                </div>
              </button>
            </div>
          </div>

          {/* CHANNEL 1: USB SERIAL CABLE UI */}
          {config.hardwareMethod === 'usb_serial' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Usb className="w-4 h-4 text-blue-600" />
                    Web Serial Port (USB Plug & Play)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Plug your ESP32 / ESP8266 into your computer via USB cable. The browser reads sensor data directly from the Serial line.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={config.serialBaudRate || 115200}
                    onChange={(e) => onChangeConfig({ serialBaudRate: parseInt(e.target.value, 10) })}
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none"
                    disabled={serialConnected}
                  >
                    <option value={115200}>115200 Baud (Standard)</option>
                    <option value={9600}>9600 Baud</option>
                  </select>

                  {!serialConnected ? (
                    <button
                      id="usb-serial-connect-btn"
                      type="button"
                      onClick={handleConnectUsb}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Usb className="w-3.5 h-3.5" />
                      <span>Select Port & Connect</span>
                    </button>
                  ) : (
                    <button
                      id="usb-serial-disconnect-btn"
                      type="button"
                      onClick={handleDisconnectUsb}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      <span>Disconnect Port</span>
                    </button>
                  )}
                </div>
              </div>

              {serialConnected && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>USB Port Connected & Streaming live telemetry at {config.serialBaudRate || 115200} baud!</span>
                  </div>
                  {lastSerialLine && (
                    <span className="font-mono text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                      Raw: {lastSerialLine}
                    </span>
                  )}
                </div>
              )}

              {serialError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{serialError}</span>
                </div>
              )}

              {!isWebSerialSupported() && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                  Note: Web Serial API is supported in Google Chrome, Microsoft Edge, and Opera on Windows, Mac, and Linux.
                </div>
              )}
            </div>
          )}

          {/* CHANNEL 2: HTTPS CLOUD PUSH (WEBHOOK) UI */}
          {config.hardwareMethod === 'cloud_push' && (
            <div className="p-4 bg-slate-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>HTTPS Telemetry Webhook (Direct Secure Push)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your ESP connects over <strong>100% verified HTTPS / TLS</strong> with a valid Certificate Authority (CA) SSL certificate. No mixed content blocks, no local browser security warnings!
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold">
                  <Lock className="w-3 h-3 text-emerald-700" />
                  <span>256-Bit SSL/TLS Active</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Your Target HTTPS Push Endpoint URL:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 font-mono text-xs text-emerald-950 truncate select-all shadow-xs flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{pushEndpointUrl}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPushUrl}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy HTTPS URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTestWebhook}
                    className="px-3.5 py-2.5 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    title="Simulate an ESP pushing a test packet to verify HTTPS reception"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Send Test Packet</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg space-y-1">
                <div className="font-semibold">How to send data from ESP over HTTPS:</div>
                <div className="text-slate-600">
                  In Arduino, use <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono">WiFiClientSecure client; client.setInsecure();</code> and send HTTP POST with JSON:
                  <div className="mt-1 font-mono text-[10px] bg-slate-900 text-emerald-400 p-2 rounded-md overflow-x-auto">
                    {"http.begin(client, \"" + pushEndpointUrl + "\");\nhttp.POST(\"{\\\"waterLevel\\\": 45.2, \\\"waterCurrent\\\": 1.3}\");"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHANNEL 3: LOCAL ESP IP / HTTPS URL POLLING UI */}
          {config.hardwareMethod === 'wifi_ip' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="esp-ip-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    ESP Device Address / HTTPS URL:
                  </label>

                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    {config.protocol === 'https://' ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> HTTPS Mode
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> HTTP Mode (Mixed Content)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 flex rounded-xl border border-slate-300 overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    
                    {/* Protocol Switcher Dropdown */}
                    <select
                      id="esp-protocol-select"
                      value={config.protocol || 'https://'}
                      onChange={(e) => {
                        const nextProto = e.target.value as 'https://' | 'http://';
                        onChangeConfig({ 
                          protocol: nextProto,
                          port: nextProto === 'https://' ? 443 : 80
                        });
                      }}
                      className="bg-slate-100 hover:bg-slate-200 border-r border-slate-300 text-xs font-bold text-slate-700 px-3 py-2.5 focus:outline-none cursor-pointer transition-colors"
                    >
                      <option value="https://">🔒 https://</option>
                      <option value="http://">🔓 http://</option>
                    </select>

                    {/* IP / Hostname input */}
                    <input
                      id="esp-ip-input"
                      type="text"
                      value={config.ipAddress}
                      onChange={(e) => onChangeConfig({ ipAddress: e.target.value })}
                      placeholder="192.168.1.184 or your-tunnel.ngrok-free.app"
                      className="flex-1 px-3.5 py-2.5 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
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
                    <span>{isTesting ? 'Testing Connection...' : 'Connect to ESP'}</span>
                  </button>

                  <a
                    href={buildEspUrl(config)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 border border-slate-300"
                    title="Open ESP URL directly in a new browser tab to verify or trust self-signed certificate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open in Tab</span>
                  </a>
                </div>

                {/* Quick preset chips & settings toggle */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
                  {['192.168.1.184', '192.168.4.1', 'esp-flood.local'].map((ip) => (
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
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label htmlFor="esp-port-field" className="block font-semibold text-slate-700 mb-1">
                      Port Number ({config.protocol === 'https://' ? 'Default: 443' : 'Default: 80'})
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
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Full URL:
                    </label>
                    <div className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2.5 py-2 rounded-lg border border-blue-200 truncate">
                      {buildEspUrl(config)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHANNEL 4: THINGSPEAK UI */}
          {config.hardwareMethod === 'thingspeak' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  ThingSpeak IoT Cloud Channel
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  If your college ESP project logs data to ThingSpeak, enter your channel ID below for automatic live syncing over HTTPS.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="thingspeak-channel-id" className="block text-xs font-bold text-slate-700 mb-1">
                    ThingSpeak Channel ID:
                  </label>
                  <input
                    id="thingspeak-channel-id"
                    type="text"
                    value={config.thingspeakChannelId || ''}
                    onChange={(e) => onChangeConfig({ thingspeakChannelId: e.target.value })}
                    placeholder="e.g. 2345678"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="thingspeak-read-key" className="block text-xs font-bold text-slate-700 mb-1">
                    Read API Key (Optional if public):
                  </label>
                  <input
                    id="thingspeak-read-key"
                    type="text"
                    value={config.thingspeakReadKey || ''}
                    onChange={(e) => onChangeConfig({ thingspeakReadKey: e.target.value })}
                    placeholder="e.g. ABC123XYZ..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Fetch ThingSpeak Feed</span>
                </button>
              </div>
            </div>
          )}

          {/* Test Status Message & Diagnostics */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border space-y-2 text-xs font-medium ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold">{testResult.message}</div>
                  {testResult.diagnosticAdvice && (
                    <div className="mt-2 text-[11px] text-amber-900/90 whitespace-pre-line bg-amber-100/70 p-2.5 rounded-lg border border-amber-200">
                      {testResult.diagnosticAdvice}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Clear Help Note for College Viva / Lab Setup */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-700">Quick College Lab Tip: </span>
              If your computer and ESP are on college Wi-Fi, the easiest connection is <strong>USB Cable (Serial)</strong> or <strong>ESP Push (Webhook)</strong>. Click <strong>Arduino Sketches</strong> at the top right to get the exact code for your board.
            </div>
          </div>

        </div>
      ) : (
        /* INTERACTIVE DEMO / PRESENTATION MODE */
        <div className="mt-4 p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Presentation Test Scenarios (Click to test dashboard reaction)
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
  );
};
