import { EspConfig } from '../types';

export interface EspFetchResult {
  success: boolean;
  waterLevel: number;
  waterCurrent: number;
  batteryVoltage?: number;
  rssi?: number;
  rawResponse?: string;
  error?: string;
  diagnosticAdvice?: string;
  latencyMs?: number;
  sourceType?: 'WIFI_IP' | 'CLOUD_PUSH' | 'THINGSPEAK' | 'USB_SERIAL';
}

// Helper to normalize the target URL
export function buildEspUrl(config: EspConfig): string {
  let ip = (config.ipAddress || '').trim();
  if (!ip) ip = '192.168.1.184';

  let protocol = config.protocol || 'https://';
  let hostAndPort = ip;

  // If user typed http:// or https:// in the input box, respect their input
  if (ip.startsWith('http://')) {
    protocol = 'http://';
    hostAndPort = ip.slice(7);
  } else if (ip.startsWith('https://')) {
    protocol = 'https://';
    hostAndPort = ip.slice(8);
  }

  // Check if port is already part of the string
  const defaultPort = protocol === 'https://' ? 443 : 80;
  if (!hostAndPort.includes(':') && config.port && config.port !== defaultPort) {
    const slashIdx = hostAndPort.indexOf('/');
    if (slashIdx !== -1) {
      hostAndPort = `${hostAndPort.slice(0, slashIdx)}:${config.port}${hostAndPort.slice(slashIdx)}`;
    } else {
      hostAndPort = `${hostAndPort}:${config.port}`;
    }
  }

  let fullUrl = `${protocol}${hostAndPort}`;
  if (!fullUrl.includes('/', protocol.length)) {
    const path = config.endpointPath.startsWith('/') ? config.endpointPath : `/${config.endpointPath}`;
    fullUrl += path;
  }

  return fullUrl;
}

// Check if an IP/hostname is a private local network address
export function isPrivateLanAddress(urlOrIp: string): boolean {
  try {
    const clean = urlOrIp.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    return (
      clean === 'localhost' ||
      clean === '127.0.0.1' ||
      clean.startsWith('192.168.') ||
      clean.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)
    );
  } catch {
    return false;
  }
}

// Parse whatever format the ESP returns (JSON or CSV or Key-Value or ThingSpeak)
export function parseEspPayload(text: string): {
  waterLevel: number;
  waterCurrent: number;
  battery?: number;
  rssi?: number;
} {
  const trimmed = text.trim();

  // 1. Try parsing JSON
  try {
    const json = JSON.parse(trimmed);

    // Support ThingSpeak JSON format
    if (json.feeds && Array.isArray(json.feeds) && json.feeds.length > 0) {
      const lastFeed = json.feeds[json.feeds.length - 1];
      const level = parseFloat(lastFeed.field1);
      const current = parseFloat(lastFeed.field2);
      const batt = lastFeed.field3 ? parseFloat(lastFeed.field3) : undefined;
      return {
        waterLevel: isNaN(level) ? 0 : level,
        waterCurrent: isNaN(current) ? 0 : current,
        battery: isNaN(batt as any) ? undefined : batt,
      };
    }

    // Support standard sensor JSON keys
    const waterLevel =
      json.waterLevel ??
      json.water_level ??
      json.level ??
      json.depth ??
      json.distance_cm ??
      (json.distance != null ? Math.max(0, 100 - Number(json.distance)) : undefined) ??
      json.WL ??
      json.wl;

    const waterCurrent =
      json.waterCurrent ??
      json.water_current ??
      json.current ??
      json.flow ??
      json.velocity ??
      json.flow_rate ??
      json.flowRate ??
      json.CURR ??
      json.curr;

    if (waterLevel != null || waterCurrent != null) {
      return {
        waterLevel: Number(waterLevel) || 0,
        waterCurrent: Number(waterCurrent) || 0,
        battery: json.battery != null ? Number(json.battery) : undefined,
        rssi: json.rssi != null ? Number(json.rssi) : undefined,
      };
    }
  } catch {
    // Not valid JSON, try text formats
  }

  // 2. Try comma-separated e.g. "45.2, 1.8" or "45.2,1.8,3.9,-65"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
    if (parts.length >= 2) {
      return {
        waterLevel: parts[0],
        waterCurrent: parts[1],
        battery: parts[2],
        rssi: parts[3],
      };
    }
  }

  // 3. Try key-value pairs e.g. "LEVEL:45.2 CURRENT:1.8" or "WL=45.2;CURR=1.8"
  const levelMatch = trimmed.match(/(?:level|wl|depth|water)\s*[:=]\s*([\d.]+)/i);
  const currentMatch = trimmed.match(/(?:current|curr|flow|vel|velocity)\s*[:=]\s*([\d.]+)/i);

  if (levelMatch || currentMatch) {
    return {
      waterLevel: levelMatch ? parseFloat(levelMatch[1]) : 0,
      waterCurrent: currentMatch ? parseFloat(currentMatch[1]) : 0,
    };
  }

  // 4. Single number (assumed water level)
  const singleNum = parseFloat(trimmed);
  if (!isNaN(singleNum)) {
    return {
      waterLevel: singleNum,
      waterCurrent: 0,
    };
  }

  throw new Error(`Unable to parse sensor payload from ESP: "${text.slice(0, 80)}"`);
}

// Fetch from Cloud Webhook /api/telemetry (ESP pushes to this URL)
export async function fetchCloudTelemetry(): Promise<EspFetchResult> {
  const startTime = performance.now();
  try {
    const response = await fetch('/api/telemetry', {
      headers: { Accept: 'application/json' },
    });
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        success: false,
        waterLevel: 0,
        waterCurrent: 0,
        error: `Cloud telemetry server returned HTTP ${response.status}`,
        latencyMs,
        sourceType: 'CLOUD_PUSH',
      };
    }

    const data = await response.json();
    if (data.hasData && data.data && data.data.timestamp) {
      const ageSeconds = Math.round((Date.now() - data.data.timestamp) / 1000);
      return {
        success: true,
        waterLevel: Number(data.data.waterLevel) || 0,
        waterCurrent: Number(data.data.waterCurrent) || 0,
        batteryVoltage: data.data.batteryVoltage,
        rssi: data.data.rssi,
        rawResponse: JSON.stringify(data.data),
        latencyMs,
        sourceType: 'CLOUD_PUSH',
        diagnosticAdvice: `Live reading received ${ageSeconds}s ago via ESP HTTP Push to /api/telemetry`,
      };
    } else {
      return {
        success: false,
        waterLevel: 0,
        waterCurrent: 0,
        error: 'Waiting for ESP to send telemetry data to /api/telemetry.',
        diagnosticAdvice: 'Your ESP board can send HTTP POST or GET to this website’s /api/telemetry endpoint. Check the "Arduino Code" tab for copy-paste code.',
        latencyMs,
        sourceType: 'CLOUD_PUSH',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      waterLevel: 0,
      waterCurrent: 0,
      error: `Cloud telemetry check failed: ${err.message}`,
      latencyMs: Math.round(performance.now() - startTime),
      sourceType: 'CLOUD_PUSH',
    };
  }
}

// Fetch from ThingSpeak Channel
export async function fetchThingspeakChannel(channelId: string, readKey?: string): Promise<EspFetchResult> {
  const startTime = performance.now();
  const cleanId = channelId.trim();
  if (!cleanId) {
    return {
      success: false,
      waterLevel: 0,
      waterCurrent: 0,
      error: 'Please enter your ThingSpeak Channel ID (e.g. 1234567)',
      sourceType: 'THINGSPEAK',
    };
  }

  const url = `https://api.thingspeak.com/channels/${encodeURIComponent(cleanId)}/feeds.json?results=1${
    readKey ? `&api_key=${encodeURIComponent(readKey.trim())}` : ''
  }`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      return {
        success: false,
        waterLevel: 0,
        waterCurrent: 0,
        error: `ThingSpeak HTTP ${res.status}: ${res.statusText}`,
        latencyMs,
        sourceType: 'THINGSPEAK',
      };
    }

    const json = await res.json();
    if (!json.feeds || json.feeds.length === 0) {
      return {
        success: false,
        waterLevel: 0,
        waterCurrent: 0,
        error: `No feed data found in ThingSpeak channel ${cleanId}.`,
        latencyMs,
        sourceType: 'THINGSPEAK',
      };
    }

    const lastFeed = json.feeds[0];
    const level = parseFloat(lastFeed.field1);
    const current = parseFloat(lastFeed.field2);
    const batt = lastFeed.field3 ? parseFloat(lastFeed.field3) : undefined;

    return {
      success: true,
      waterLevel: isNaN(level) ? 0 : level,
      waterCurrent: isNaN(current) ? 0 : current,
      batteryVoltage: isNaN(batt as any) ? undefined : batt,
      rawResponse: JSON.stringify(lastFeed),
      latencyMs,
      sourceType: 'THINGSPEAK',
      diagnosticAdvice: `Connected to ThingSpeak Channel ${cleanId}. Last entry at ${lastFeed.created_at}`,
    };
  } catch (err: any) {
    return {
      success: false,
      waterLevel: 0,
      waterCurrent: 0,
      error: `Failed to query ThingSpeak: ${err.message}`,
      latencyMs: Math.round(performance.now() - startTime),
      sourceType: 'THINGSPEAK',
    };
  }
}

// Fetch from ESP device via Direct Browser Fetch or Vite Proxy
export async function fetchEspWifi(config: EspConfig): Promise<EspFetchResult> {
  const targetUrl = buildEspUrl(config);
  const startTime = performance.now();
  const isPrivate = isPrivateLanAddress(config.ipAddress);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    let response: Response;

    // If it's a private LAN IP (192.168.x.x), we must do Direct Browser Fetch,
    // because cloud servers in Google Cloud data centers cannot connect to private home routers.
    const shouldDirectFetch = !config.useProxy || isPrivate;

    if (!shouldDirectFetch) {
      // Use local/dev proxy for public IPs or ngrok tunnels
      const proxyUrl = `/api/esp-proxy?url=${encodeURIComponent(targetUrl)}`;
      response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/plain, */*' },
      });
    } else {
      // Direct browser-to-ESP fetch
      response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/plain, */*' },
        mode: 'cors',
      });
    }

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        waterLevel: 0,
        waterCurrent: 0,
        error: `ESP HTTP ${response.status}: ${response.statusText}`,
        rawResponse: errText,
        diagnosticAdvice: isPrivate
          ? 'ESP responded with an HTTP error. Verify your Arduino WebServer endpoint.'
          : 'Check if the target URL is accessible.',
        latencyMs,
        sourceType: 'WIFI_IP',
      };
    }

    const rawText = await response.text();
    const parsed = parseEspPayload(rawText);

    return {
      success: true,
      waterLevel: parsed.waterLevel,
      waterCurrent: parsed.waterCurrent,
      batteryVoltage: parsed.battery,
      rssi: parsed.rssi,
      rawResponse: rawText,
      latencyMs,
      sourceType: 'WIFI_IP',
      diagnosticAdvice: `Direct connection to ${targetUrl} active`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    let errorMsg = err.message || 'Connection failed';
    let diagnosticAdvice = '';

    if (err.name === 'AbortError') {
      errorMsg = `Connection to ${targetUrl} timed out (3.5s limit).`;
      diagnosticAdvice = isPrivate
        ? 'ESP did not reply in time. Verify: 1) ESP is powered on. 2) Laptop and ESP are on the exact same Wi-Fi. 3) IP address matches Serial Monitor.'
        : 'Target server is taking too long to respond.';
    } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMsg = `Browser blocked request to ${targetUrl}.`;
      if (targetUrl.startsWith('https://')) {
        diagnosticAdvice =
          'HTTPS SSL / CERTIFICATE ISSUE:\n' +
          '1. If your ESP is running a local HTTPS server with a self-signed certificate, Chrome/Edge blocks it by default. Click "Open ESP in New Tab", click "Advanced -> Proceed to unsafe", then return here.\n' +
          '2. RECOMMENDED HTTPS SOLUTION: Switch to "HTTPS Cloud Push" above! Your ESP connects securely to our live Cloud endpoint with a valid CA-signed SSL certificate — 100% verified HTTPS with zero browser security warnings!';
      } else if (isPrivate) {
        diagnosticAdvice =
          'MIXED CONTENT / CORS BLOCK: Because this dashboard runs on HTTPS, browsers block insecure HTTP to local 192.168.x.x addresses.\n\n' +
          'Quick fixes:\n' +
          '1. Switch protocol: Toggle the protocol selector to "https://" if your ESP has SSL enabled or using an HTTPS tunnel.\n' +
          '2. Chrome Fix: Click the Tune/Lock icon next to the URL in address bar -> Site settings -> Insecure content -> set to "Allow" -> reload.\n' +
          '3. HTTPS Cloud Push: Switch to "HTTPS Cloud Push" above for native HTTPS telemetry without any browser blocks!\n' +
          '4. USB Serial: Direct USB cable connection with zero network hurdles.';
      } else {
        diagnosticAdvice = 'CORS error: ensure your ESP sends the header: Access-Control-Allow-Origin: *';
      }
    }

    return {
      success: false,
      waterLevel: 0,
      waterCurrent: 0,
      error: errorMsg,
      diagnosticAdvice,
      latencyMs,
      sourceType: 'WIFI_IP',
    };
  }
}

// Master fetch router based on config.hardwareMethod
export async function fetchEspData(config: EspConfig): Promise<EspFetchResult> {
  if (config.hardwareMethod === 'cloud_push') {
    return fetchCloudTelemetry();
  }

  if (config.hardwareMethod === 'thingspeak') {
    return fetchThingspeakChannel(config.thingspeakChannelId, config.thingspeakReadKey);
  }

  // Default: Wi-Fi IP fetch
  return fetchEspWifi(config);
}
