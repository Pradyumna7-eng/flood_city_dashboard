import React from 'react';
import { 
  Droplets, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Code2, 
  CheckCircle2, 
  AlertTriangle,
  Radio
} from 'lucide-react';
import { DangerLevel } from '../types';

interface HeaderProps {
  dangerLevel: DangerLevel;
  waterLevel: number;
  waterCurrent: number;
  ipAddress: string;
  isSimulator: boolean;
  onOpenCodeModal: () => void;
  onOpenThresholdModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dangerLevel,
  waterLevel,
  waterCurrent,
  ipAddress,
  isSimulator,
  onOpenCodeModal,
  onOpenThresholdModal,
  isMuted,
  onToggleMute,
}) => {
  const getBadge = () => {
    switch (dangerLevel) {
      case 'CRITICAL':
        return {
          text: 'CRITICAL DANGER',
          classes: 'bg-red-100 text-red-700 border-red-300 animate-pulse',
          dot: 'bg-red-600',
        };
      case 'HIGH_DANGER':
        return {
          text: 'FLOOD WARNING',
          classes: 'bg-orange-100 text-orange-700 border-orange-300',
          dot: 'bg-orange-600',
        };
      case 'CAUTION':
        return {
          text: 'WATER RISING',
          classes: 'bg-amber-100 text-amber-700 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'SAFE':
      default:
        return {
          text: 'NORMAL & SAFE',
          classes: 'bg-emerald-100 text-emerald-700 border-emerald-300',
          dot: 'bg-emerald-600',
        };
    }
  };

  const badge = getBadge();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Logo & College Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Flood Management City
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  College Project
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>Real-Time Water Level & Current Monitor</span>
                <span>•</span>
                <span className="font-medium text-slate-700">
                  {isSimulator ? 'Demo Mode' : `ESP IP: ${ipAddress}`}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons & Simple Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Pill */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${badge.classes}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>{badge.text}</span>
            </div>

            {/* Siren Audio Toggle */}
            <button
              id="header-siren-toggle-btn"
              type="button"
              onClick={onToggleMute}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                isMuted
                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-red-600" />}
              <span>{isMuted ? 'Alarm Muted' : 'Alarm Ready'}</span>
            </button>

            {/* Threshold Settings */}
            <button
              id="header-thresholds-btn"
              type="button"
              onClick={onOpenThresholdModal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>Change Limits</span>
            </button>

            {/* ESP Code */}
            <button
              id="header-arduino-code-btn"
              type="button"
              onClick={onOpenCodeModal}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>ESP Code</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
