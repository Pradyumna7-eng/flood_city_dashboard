import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

let latestTelemetry: {
  waterLevel: number | null;
  waterCurrent: number | null;
  batteryVoltage?: number;
  rssi?: number;
  timestamp: number | null;
  source?: string;
  raw?: any;
} = {
  waterLevel: null,
  waterCurrent: null,
  timestamp: null,
};

function espTelemetryPlugin(): Plugin {
  return {
    name: 'esp-telemetry-plugin',
    configureServer(server) {
      // 1. Cloud Push & Pull Telemetry endpoint (/api/telemetry)
      server.middlewares.use('/api/telemetry', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const urlObj = new URL(req.url || '', 'http://localhost');

        // GET: Either read latest telemetry OR update via query params (e.g. ?level=45.2&current=1.8)
        if (req.method === 'GET') {
          const levelParam = urlObj.searchParams.get('level') ?? urlObj.searchParams.get('waterLevel');
          const currentParam =
            urlObj.searchParams.get('current') ??
            urlObj.searchParams.get('waterCurrent') ??
            urlObj.searchParams.get('flow');
          const battParam = urlObj.searchParams.get('battery') ?? urlObj.searchParams.get('batt');
          const rssiParam = urlObj.searchParams.get('rssi');

          if (levelParam !== null || currentParam !== null) {
            const levelVal = levelParam !== null ? parseFloat(levelParam) : (latestTelemetry.waterLevel ?? 0);
            const currentVal = currentParam !== null ? parseFloat(currentParam) : (latestTelemetry.waterCurrent ?? 0);
            latestTelemetry = {
              waterLevel: isNaN(levelVal) ? 0 : levelVal,
              waterCurrent: isNaN(currentVal) ? 0 : currentVal,
              batteryVoltage: battParam ? parseFloat(battParam) : undefined,
              rssi: rssiParam ? parseFloat(rssiParam) : undefined,
              timestamp: Date.now(),
              source: 'GET_QUERY',
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                message: 'Telemetry updated via GET query',
                data: latestTelemetry,
              })
            );
            return;
          }

          // Plain GET without params: return latest stored telemetry
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              hasData: latestTelemetry.timestamp !== null,
              data: latestTelemetry,
            })
          );
          return;
        }

        // POST: Accept JSON or form payload from ESP32 / ESP8266 HTTPClient
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 1e6) req.destroy();
          });

          req.on('end', () => {
            try {
              let parsed: any = {};
              const trimmed = body.trim();
              if (trimmed.startsWith('{')) {
                parsed = JSON.parse(trimmed);
              } else if (trimmed.includes(',')) {
                const parts = trimmed.split(',').map((p) => parseFloat(p.trim()));
                parsed = { waterLevel: parts[0], waterCurrent: parts[1] };
              } else {
                const params = new URLSearchParams(trimmed);
                parsed = {
                  waterLevel: params.get('waterLevel') ?? params.get('level'),
                  waterCurrent: params.get('waterCurrent') ?? params.get('current'),
                };
              }

              const level = parseFloat(parsed.waterLevel ?? parsed.water_level ?? parsed.level ?? parsed.depth ?? 0);
              const current = parseFloat(parsed.waterCurrent ?? parsed.water_current ?? parsed.current ?? parsed.flow ?? 0);
              const batt = parsed.battery != null ? parseFloat(parsed.battery) : undefined;
              const rssi = parsed.rssi != null ? parseFloat(parsed.rssi) : undefined;

              latestTelemetry = {
                waterLevel: isNaN(level) ? 0 : level,
                waterCurrent: isNaN(current) ? 0 : current,
                batteryVoltage: isNaN(batt as any) ? undefined : batt,
                rssi: isNaN(rssi as any) ? undefined : rssi,
                timestamp: Date.now(),
                source: 'POST_JSON',
                raw: body,
              };

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  message: 'Telemetry received by Flood Management City cloud server',
                  data: latestTelemetry,
                })
              );
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message, bodyReceived: body }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });

      // 2. ESP Proxy (with detection for Private IPs)
      server.middlewares.use('/api/esp-proxy', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const target = urlObj.searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
            return;
          }

          // Check if target is a private LAN IP
          try {
            const targetUrlObj = new URL(target);
            const hostname = targetUrlObj.hostname;
            const isPrivateIp =
              hostname === 'localhost' ||
              hostname === '127.0.0.1' ||
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

            if (isPrivateIp) {
              res.statusCode = 422;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(
                JSON.stringify({
                  error: 'PRIVATE_LAN_IP',
                  message: `The IP address "${hostname}" is on your local private Wi-Fi. The cloud server cannot reach private home networks across the internet. Switch to Direct Browser Fetch, Web Serial (USB cable), or send data to /api/telemetry.`,
                })
              );
              return;
            }
          } catch {
            // invalid URL format
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(target, {
            signal: controller.signal,
            headers: {
              Accept: 'application/json, text/plain, */*',
            },
          });
          clearTimeout(timeoutId);

          const text = await response.text();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(text);
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(
            JSON.stringify({
              error: err.name === 'AbortError' ? 'ESP device timed out (4s limit)' : err.message,
            })
          );
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), espTelemetryPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
