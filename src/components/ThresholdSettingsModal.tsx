import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check } from 'lucide-react';
import { ThresholdConfig } from '../types';
import { DEFAULT_THRESHOLDS } from '../utils/dangerEvaluation';

interface ThresholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: ThresholdConfig;
  onSave: (thresholds: ThresholdConfig) => void;
}

export const ThresholdSettingsModal: React.FC<ThresholdSettingsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSave,
}) => {
  const [local, setLocal] = useState<ThresholdConfig>({ ...thresholds });

  if (!isOpen) return null;

  const handleReset = () => {
    setLocal({ ...DEFAULT_THRESHOLDS });
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Calibrate Danger Levels
              </h3>
              <p className="text-xs text-slate-500">
                Adjust water height and speed trigger points for your college model
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-max-depth" className="block text-xs font-bold text-slate-700 mb-1">
                Max Container Depth (cm)
              </label>
              <input
                id="modal-max-depth"
                type="number"
                min="10"
                max="1000"
                value={local.maxLevel}
                onChange={(e) => setLocal({ ...local, maxLevel: parseFloat(e.target.value) || 100 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400">Total tank capacity</span>
            </div>

            <div>
              <label htmlFor="modal-caution-level" className="block text-xs font-bold text-amber-700 mb-1">
                Warning Level (cm)
              </label>
              <input
                id="modal-caution-level"
                type="number"
                min="1"
                max={local.highDangerLevel - 1}
                value={local.cautionLevel}
                onChange={(e) => setLocal({ ...local, cautionLevel: parseFloat(e.target.value) || 45 })}
                className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-sm text-amber-900 font-semibold focus:bg-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-amber-600">Starts 'Caution' state</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-high-danger" className="block text-xs font-bold text-orange-700 mb-1">
                High Danger Level (cm)
              </label>
              <input
                id="modal-high-danger"
                type="number"
                min={local.cautionLevel + 1}
                max={local.criticalLevel - 1}
                value={local.highDangerLevel}
                onChange={(e) => setLocal({ ...local, highDangerLevel: parseFloat(e.target.value) || 70 })}
                className="w-full bg-orange-50/50 border border-orange-300 rounded-xl px-3 py-2 text-sm text-orange-900 font-semibold focus:bg-white focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-orange-600">Road flood stage</span>
            </div>

            <div>
              <label htmlFor="modal-critical-level" className="block text-xs font-bold text-red-700 mb-1">
                Critical Flood Level (cm)
              </label>
              <input
                id="modal-critical-level"
                type="number"
                min={local.highDangerLevel + 1}
                max={local.maxLevel}
                value={local.criticalLevel}
                onChange={(e) => setLocal({ ...local, criticalLevel: parseFloat(e.target.value) || 88 })}
                className="w-full bg-red-50/50 border border-red-300 rounded-xl px-3 py-2 text-sm text-red-900 font-semibold focus:bg-white focus:outline-none focus:border-red-500"
              />
              <span className="text-[10px] text-red-600">Siren & Evacuation trigger</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-caution-current" className="block text-xs font-bold text-slate-700 mb-1">
                Warning Flow Speed (m/s)
              </label>
              <input
                id="modal-caution-current"
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={local.cautionCurrent}
                onChange={(e) => setLocal({ ...local, cautionCurrent: parseFloat(e.target.value) || 1.0 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="modal-critical-current" className="block text-xs font-bold text-red-700 mb-1">
                Critical Torrent Speed (m/s)
              </label>
              <input
                id="modal-critical-current"
                type="number"
                step="0.1"
                min="1.0"
                max="10.0"
                value={local.criticalCurrent}
                onChange={(e) => setLocal({ ...local, criticalCurrent: parseFloat(e.target.value) || 3.5 })}
                className="w-full bg-red-50/50 border border-red-300 rounded-xl px-3 py-2 text-sm text-red-900 font-semibold focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Save Limits</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
