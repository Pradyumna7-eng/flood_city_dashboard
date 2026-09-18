import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  ArrowRight,
  Volume2,
  VolumeX,
  CheckCircle2
} from 'lucide-react';
import { DangerAssessment, DangerLevel, ThresholdConfig } from '../types';

interface DangerStatusCardProps {
  assessment: DangerAssessment;
  dangerLevel: DangerLevel;
  dangerScore: number;
  waterLevel: number;
  waterCurrent: number;
  thresholds: ThresholdConfig;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const DangerStatusCard: React.FC<DangerStatusCardProps> = ({
  assessment,
  dangerLevel,
  dangerScore,
  waterLevel,
  waterCurrent,
  thresholds,
  isMuted,
  onToggleMute,
}) => {
  const isSafe = dangerLevel === 'SAFE';
  const isCaution = dangerLevel === 'CAUTION';
  const isHigh = dangerLevel === 'HIGH_DANGER';
  const isCritical = dangerLevel === 'CRITICAL';

  return (
    <div className={`rounded-2xl border-2 p-6 transition-all shadow-sm ${
      isCritical 
        ? 'bg-red-50 border-red-400 ring-2 ring-red-400/30' 
        : isHigh 
        ? 'bg-orange-50 border-orange-300' 
        : isCaution 
        ? 'bg-amber-50 border-amber-300' 
        : 'bg-emerald-50 border-emerald-300'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        
        {/* Main Status Header */}
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
            isCritical ? 'bg-red-600 text-white animate-bounce' :
            isHigh ? 'bg-orange-500 text-white' :
            isCaution ? 'bg-amber-500 text-white' :
            'bg-emerald-600 text-white'
          }`}>
            {isCritical ? <AlertOctagon className="w-7 h-7" /> :
             isHigh ? <AlertTriangle className="w-7 h-7" /> :
             isCaution ? <AlertTriangle className="w-7 h-7" /> :
             <ShieldCheck className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Current Danger Level
              </span>
              {isCritical && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                  Emergency Siren On
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {assessment.title}
            </h2>
          </div>
        </div>

        {/* Big Overall Risk Meter Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-white/90 px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Flood Risk</span>
            <span className={`text-xl font-extrabold ${assessment.textColor}`}>
              {dangerScore}% Risk
            </span>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
            isCritical ? 'bg-red-600' : isHigh ? 'bg-orange-500' : isCaution ? 'bg-amber-500' : 'bg-emerald-600'
          }`}>
            {isCritical ? '4/4' : isHigh ? '3/4' : isCaution ? '2/4' : '1/4'}
          </div>
        </div>
      </div>

      {/* Visual 4-Step Danger Progress Bar (Simple for anyone to understand) */}
      <div className="my-5">
        <div className="grid grid-cols-4 gap-2">
          {/* Step 1: Safe */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isSafe 
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300 font-bold' 
              : 'bg-white/80 text-slate-600 border-slate-200'
          }`}>
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>1. Safe</span>
              {isSafe && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className={`text-[11px] mt-0.5 ${isSafe ? 'text-emerald-100' : 'text-slate-400'}`}>
              Below {thresholds.cautionLevel} cm
            </div>
          </div>

          {/* Step 2: Caution */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isCaution 
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300 font-bold' 
              : 'bg-white/80 text-slate-600 border-slate-200'
          }`}>
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>2. Caution</span>
              {isCaution && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className={`text-[11px] mt-0.5 ${isCaution ? 'text-amber-100' : 'text-slate-400'}`}>
              {thresholds.cautionLevel} – {thresholds.highDangerLevel} cm
            </div>
          </div>

          {/* Step 3: High Danger */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isHigh 
              ? 'bg-orange-500 text-white border-orange-600 shadow-xs ring-2 ring-orange-300 font-bold' 
              : 'bg-white/80 text-slate-600 border-slate-200'
          }`}>
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>3. Danger</span>
              {isHigh && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className={`text-[11px] mt-0.5 ${isHigh ? 'text-orange-100' : 'text-slate-400'}`}>
              {thresholds.highDangerLevel} – {thresholds.criticalLevel} cm
            </div>
          </div>

          {/* Step 4: Critical */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isCritical 
              ? 'bg-red-600 text-white border-red-700 shadow-xs ring-2 ring-red-300 font-bold animate-pulse' 
              : 'bg-white/80 text-slate-600 border-slate-200'
          }`}>
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>4. Critical!</span>
              {isCritical && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div className={`text-[11px] mt-0.5 ${isCritical ? 'text-red-100' : 'text-slate-400'}`}>
              Over {thresholds.criticalLevel} cm
            </div>
          </div>
        </div>
      </div>

      {/* Clear Explanations in Plain Human Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* What this means */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            What is happening right now?
          </div>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {assessment.description}
          </p>
        </div>

        {/* What you should do */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            What should people do?
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            {assessment.actionRequired}
          </p>
        </div>
      </div>

      {/* Emergency Siren Controls if in danger */}
      {isCritical && (
        <div className="mt-4 p-3 bg-red-600 text-white rounded-xl flex items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 animate-spin" />
            <span>CRITICAL FLOOD EMERGENCY: Evacuate all low areas immediately!</span>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            className="px-3 py-1 bg-white text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold shrink-0 transition-colors"
          >
            {isMuted ? 'Turn Siren On' : 'Silence Siren'}
          </button>
        </div>
      )}
    </div>
  );
};
