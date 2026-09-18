import React from 'react';
import { 
  Wind, 
  Gauge, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { DangerLevel, ThresholdConfig } from '../types';

interface CurrentFlowGaugeProps {
  waterCurrent: number;
  waterLevel: number;
  dangerLevel: DangerLevel;
  thresholds: ThresholdConfig;
}

export const CurrentFlowGauge: React.FC<CurrentFlowGaugeProps> = ({
  waterCurrent,
  waterLevel,
  dangerLevel,
  thresholds,
}) => {
  const maxVelocity = 4.5;
  const clampedCurrent = Math.max(0, Math.min(waterCurrent, maxVelocity));
  const percent = Math.min(100, Math.round((clampedCurrent / maxVelocity) * 100));

  const kmh = (waterCurrent * 3.6).toFixed(1);

  let speedText = 'Calm & Gentle';
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  let speedColor = 'text-emerald-600';
  let friendlyAdvice = 'Water is moving peacefully. Safe for people and vehicles.';

  if (waterCurrent >= thresholds.criticalCurrent) {
    speedText = 'Dangerous Torrent!';
    badgeClass = 'bg-red-100 text-red-800 border-red-300';
    speedColor = 'text-red-600';
    friendlyAdvice = 'Extreme rushing current! Strong enough to wash away cars and destroy bridges.';
  } else if (waterCurrent >= thresholds.highDangerCurrent) {
    speedText = 'Fast & Hazardous';
    badgeClass = 'bg-orange-100 text-orange-800 border-orange-300';
    speedColor = 'text-orange-600';
    friendlyAdvice = 'Very fast water flow. Walking or driving across is strictly dangerous.';
  } else if (waterCurrent >= thresholds.cautionCurrent) {
    speedText = 'Moderate Runoff';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    speedColor = 'text-amber-600';
    friendlyAdvice = 'Current is picking up speed from rain. Stay back from canal banks.';
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Water Current (Flow Speed)
            </h3>
            <p className="text-xs text-slate-500">Water Velocity Sensor Channel</p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
          {speedText}
        </span>
      </div>

      {/* Main Body */}
      <div className="my-6 space-y-5">
        
        {/* Big Speed Value */}
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Flow Velocity
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                {waterCurrent.toFixed(2)}
              </span>
              <span className="text-xl font-bold text-teal-600">
                m/s
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block">Road Speed Equivalent</span>
            <span className="text-xl font-bold text-slate-800">{kmh} km/h</span>
          </div>
        </div>

        {/* Visual Speed Slider Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Calm (0 m/s)</span>
            <span>Warning (2 m/s)</span>
            <span>Critical (3.5+ m/s)</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                waterCurrent >= thresholds.criticalCurrent
                  ? 'bg-red-600'
                  : waterCurrent >= thresholds.highDangerCurrent
                  ? 'bg-orange-500'
                  : waterCurrent >= thresholds.cautionCurrent
                  ? 'bg-amber-500'
                  : 'bg-teal-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Human friendly advice card */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="text-xs font-bold text-slate-600 block mb-0.5">
            Safety Impact:
          </span>
          <p className="text-xs sm:text-sm text-slate-700 font-medium">
            {friendlyAdvice}
          </p>
        </div>

      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Sensor: Flow Sensor / Pulse Meter</span>
        <span>Danger Limit: {thresholds.criticalCurrent} m/s</span>
      </div>
    </div>
  );
};
