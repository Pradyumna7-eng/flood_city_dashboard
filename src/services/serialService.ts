// Web Serial API service for direct USB connection to ESP32 / ESP8266 boards
import { parseEspPayload } from './espService';

export interface SerialStatus {
  supported: boolean;
  connected: boolean;
  portName?: string;
  baudRate: number;
  lastLineReceived?: string;
  bytesReceived: number;
}

let activePort: any = null;
let reader: any = null;
let keepReading = false;
let readableStreamClosed: Promise<void> | null = null;
let bytesCounter = 0;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export async function requestAndConnectSerial(
  baudRate = 115200,
  onData: (data: { waterLevel: number; waterCurrent: number; battery?: number; rssi?: number; raw: string }) => void,
  onError: (errorMsg: string) => void,
  onStatusChange?: (connected: boolean) => void
): Promise<boolean> {
  if (!isWebSerialSupported()) {
    onError('Web Serial API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera on desktop.');
    return false;
  }

  try {
    // 1. Prompt user to select ESP serial port
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });

    activePort = port;
    keepReading = true;
    bytesCounter = 0;
    if (onStatusChange) onStatusChange(true);

    // 2. Start read loop
    const textDecoder = new TextDecoderStream();
    readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    readSerialLoop(reader, onData, onError, onStatusChange);
    return true;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      // User cancelled port picker dialog
      return false;
    }
    onError(err.message || 'Failed to open serial port');
    if (onStatusChange) onStatusChange(false);
    return false;
  }
}

async function readSerialLoop(
  serialReader: any,
  onData: (data: { waterLevel: number; waterCurrent: number; battery?: number; rssi?: number; raw: string }) => void,
  onError: (errorMsg: string) => void,
  onStatusChange?: (connected: boolean) => void
) {
  let lineBuffer = '';

  try {
    while (keepReading) {
      const { value, done } = await serialReader.read();
      if (done) {
        break;
      }
      if (value) {
        bytesCounter += value.length;
        lineBuffer += value;

        // Process line by line
        const lines = lineBuffer.split(/\r?\n/);
        // Keep the last partial line in buffer
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Attempt to parse sensor values from the serial line
          try {
            const parsed = parseEspPayload(trimmed);
            onData({
              ...parsed,
              raw: trimmed,
            });
          } catch {
            // Not every serial line is a reading (could be "WiFi connected", "Booting...", etc.)
          }
        }
      }
    }
  } catch (err: any) {
    if (keepReading) {
      onError(`Serial read error: ${err.message}`);
    }
  } finally {
    if (onStatusChange) onStatusChange(false);
  }
}

export async function disconnectSerial(): Promise<void> {
  keepReading = false;
  try {
    if (reader) {
      await reader.cancel();
      reader.releaseLock();
      reader = null;
    }
    if (readableStreamClosed) {
      await readableStreamClosed.catch(() => {});
      readableStreamClosed = null;
    }
    if (activePort) {
      await activePort.close();
      activePort = null;
    }
  } catch (err) {
    console.error('Error closing serial port:', err);
  }
}

export function isSerialConnected(): boolean {
  return activePort !== null && keepReading;
}
