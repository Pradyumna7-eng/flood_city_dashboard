import { EspConfig } from '../types';

export interface EspFetchResult {
  success: boolean;
  waterLevel: number;
  waterCurrent: number;
  batteryVoltage?: number;
  rssi?: number;
  rawResponse?: string;
  error?: string;
  latencyMs?: number;
}

// Helper to normalize the target URL
export function buildEspUrl(config: EspConfig): string {
  let ip = config.ipAddress.trim();
  if (!ip) ip = '192.168.1.184';

  // If user already typed http:// or https://, strip protocol to normalize
  const hasProtocol = ip.startsWith('http://') || ip.startsWith('https://');
  let protocol = 'http://';
  let hostAndPort = ip;

  if (hasProtocol) {
    const parts = ip.split('://');
    protocol = parts[0] + '://';
    hostAndPort = parts[1];
  }

  // Check if port is already part of the string
  if (!hostAndPort.includes(':') && config.port && config.port !== 80 && config.port !== 443) {
    // If it ends with a path, insert port before path
    const slashIdx = hostAndPort.indexOf('/');
    if (slashIdx !== -1) {
      hostAndPort = `${hostAndPort.slice(0, slashIdx)}:${config.port}${hostAndPort.slice(slashIdx)}`;
    } else {
      hostAndPort = `${hostAndPort}:${config.port}`;
    }
  }

  let fullUrl = `${protocol}${hostAndPort}`;
  if (!fullUrl.includes('/', 8)) {
    const path = config.endpointPath.startsWith('/') ? config.endpointPath : `/${config.endpointPath}`;
    fullUrl += path;
  }

  return fullUrl;
}

// Parse whatever format the ESP returns (JSON or CSV or Key-Value)
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
    const waterLevel =
      json.waterLevel ??
      json.water_level ??
      json.level ??
      json.depth ??
      (json.distance != null ? Math.max(0, 100 - Number(json.distance)) : 0);

    const waterCurrent =
      json.waterCurrent ??
      json.water_current ??
      json.current ??
      json.flow ??
      json.velocity ??
      json.flow_rate ??
      0;

    return {
      waterLevel: Number(waterLevel) || 0,
      waterCurrent: Number(waterCurrent) || 0,
      battery: json.battery != null ? Number(json.battery) : undefined,
      rssi: json.rssi != null ? Number(json.rssi) : undefined,
    };
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

// Fetch from ESP device via Direct Browser Fetch or Vite/Cloud Proxy
export async function fetchEspData(config: EspConfig): Promise<EspFetchResult> {
  const targetUrl = buildEspUrl(config);
  const startTime = performance.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    let response: Response;

    if (config.useProxy) {
      // Use local dev/server proxy to avoid browser Mixed Content and CORS
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
        error: `ESP HTTP ${response.status}: ${response.statusText} ${errText}`.trim(),
        latencyMs,
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
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    let errorMsg = err.message || 'Connection failed';
    if (err.name === 'AbortError') {
      errorMsg = 'ESP device timed out (3.5s limit). Check if ESP is powered on and connected to the same network.';
    } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMsg = 'Network or CORS error. In HTTPS mode, browsers block local HTTP requests. Enable "Use Backend Proxy" or run locally.';
    }

    return {
      success: false,
      waterLevel: 0,
      waterCurrent: 0,
      error: errorMsg,
      latencyMs,
    };
  }
}
