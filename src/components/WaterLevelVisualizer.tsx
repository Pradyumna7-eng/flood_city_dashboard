import React from 'react';
import { 
  Waves, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DangerLevel, ThresholdConfig } from '../types';

interface WaterLevelVisualizerProps {
  waterLevel: number;
  rateOfRise: number;
  dangerLevel: DangerLevel;
  thresholds: ThresholdConfig;
}

export const WaterLevelVisualizer: React.FC<WaterLevelVisualizerProps> = ({
  waterLevel,
  rateOfRise,
  dangerLevel,
  thresholds,
}) => {
  const max = thresholds.maxLevel;
  const clampedLevel = Math.max(0, Math.min(waterLevel, max * 1.15));
  const percentage = Math.min(100, Math.round((clampedLevel / max) * 100));

  let fillGradient = 'from-blue-400 to-blue-600';
  let badgeText = 'Safe Depth';
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';

  if (waterLevel >= thresholds.criticalLevel) {
    fillGradient = 'from-red-500 to-red-700';
    badgeText = 'Critical Overflow!';
    badgeClass = 'bg-red-100 text-red-800 border-red-300';
  } else if (waterLevel >= thresholds.highDangerLevel) {
    fillGradient = 'from-orange-400 to-orange-600';
    badgeText = 'Dangerously High';
    badgeClass = 'bg-orange-100 text-orange-800 border-orange-300';
  } else if (waterLevel >= thresholds.cautionLevel) {
    fillGradient = 'from-amber-400 to-blue-500';
    badgeText = 'Warning: Water Rising';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Water Level (Depth)
            </h3>
            <p className="text-xs text-slate-500">Ultrasonic Sensor Reading</p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
          {badgeText}
        </span>
      </div>

      {/* Main Body */}
      <div className="my-6 grid grid-cols-12 gap-6 items-center">
        
        {/* Animated Water Tank Graphic */}
        <div className="col-span-5 sm:col-span-4 flex flex-col items-center">
          <div className="relative w-24 sm:w-28 h-56 bg-slate-50 border-2 border-slate-300 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-end">
            
            {/* Guide markers */}
            <div 
              className="absolute w-full border-t-2 border-dashed border-red-500 z-20 flex items-center justify-end pr-1 pointer-events-none"
              style={{ bottom: `${(thresholds.criticalLevel / max) * 100}%` }}
            >
              <span className="text-[9px] font-bold bg-white text-red-600 px-1 rounded shadow-xs">
                Danger {thresholds.criticalLevel}cm
              </span>
            </div>

            <div 
              className="absolute w-full border-t border-dashed border-amber-500 z-20 flex items-center justify-end pr-1 pointer-events-none"
              style={{ bottom: `${(thresholds.cautionLevel / max) * 100}%` }}
            >
              <span className="text-[9px] font-bold bg-white text-amber-600 px-1 rounded shadow-xs">
                Warning {thresholds.cautionLevel}cm
              </span>
            </div>

            {/* Rising Water Body */}
            <div
              className={`w-full bg-gradient-to-t ${fillGradient} transition-all duration-700 ease-out relative z-10`}
              style={{ height: `${percentage}%` }}
            >
              {/* Wave surface ripples */}
              <div className="absolute -top-2 left-0 right-0 h-3 overflow-hidden opacity-60">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full text-white">
                  <path d="M0,50 C150,150 350,-50 500,50 L500,150 L0,150 Z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-medium mt-2">
            Capacity: {percentage}% Full
          </span>
        </div>

        {/* Big Numbers & Simple Human Insights */}
        <div className="col-span-7 sm:col-span-8 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Depth
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                {waterLevel.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-blue-600">
                cm
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Equal to <strong className="text-slate-800">{(waterLevel / 100).toFixed(2)} meters</strong> deep
            </p>
          </div>

          {/* Simple Trend Indicator */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Water Movement Trend
              </span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                {rateOfRise > 0.2 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-700">Rising (+{rateOfRise.toFixed(1)} cm/min)</span>
                  </>
                ) : rateOfRise < -0.2 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Receding ({rateOfRise.toFixed(1)} cm/min)</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">Stable (Not rising)</span>
                  </>
                )}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Channel Height: {max} cm</span>
        <span>Overflow Stage: {thresholds.criticalLevel} cm</span>
      </div>
    </div>
  );
};
