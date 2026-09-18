import React from 'react';
import { 
  AreaChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { Activity, Clock } from 'lucide-react';
import { TelemetryReading, ThresholdConfig } from '../types';

interface LiveTelemetryChartProps {
  history: TelemetryReading[];
  thresholds: ThresholdConfig;
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  history,
  thresholds,
}) => {
  const chartData = history.slice(-25).map((r) => {
    const d = new Date(r.timestamp);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    return {
      time: timeStr,
      waterLevel: Number(r.waterLevel.toFixed(1)),
      waterCurrent: Number(r.waterCurrent.toFixed(2)),
      dangerScore: r.combinedDangerScore,
    };
  });

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Live Water Level & Current Trend
            </h3>
            <p className="text-xs text-slate-500">Real-time timeline of sensor readings</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span>Water Level (cm)</span>
          </span>
          <span className="flex items-center gap-1.5 text-teal-600">
            <span className="w-3 h-1 bg-teal-500 inline-block rounded" />
            <span>Current Speed (m/s)</span>
          </span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            Connecting to sensor stream...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="waterLevelLightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
              />

              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                stroke="#3b82f6"
                tick={{ fill: '#3b82f6', fontSize: 11 }}
                tickLine={false}
                unit="cm"
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 5]}
                stroke="#0d9488"
                tick={{ fill: '#0d9488', fontSize: 11 }}
                tickLine={false}
                unit="m/s"
              />

              {/* Danger Warning Line */}
              <ReferenceLine
                yAxisId="left"
                y={thresholds.criticalLevel}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: 'Danger Line',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="text-slate-400 border-b border-slate-700 pb-1">Time: {data.time}</div>
                        <div className="text-blue-300 font-bold">Water Level: {data.waterLevel} cm</div>
                        <div className="text-teal-300 font-bold">Current: {data.waterCurrent} m/s</div>
                        <div className="text-slate-300">Danger Risk: {data.dangerScore}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="waterLevel"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#waterLevelLightGrad)"
                isAnimationActive={false}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="waterCurrent"
                stroke="#0d9488"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
