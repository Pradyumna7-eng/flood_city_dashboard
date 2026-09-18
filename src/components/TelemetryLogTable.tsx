import React, { useState } from 'react';
import { Download, FileText, Search, Database } from 'lucide-react';
import { TelemetryReading, DangerLevel } from '../types';

interface TelemetryLogTableProps {
  logs: TelemetryReading[];
  onClearLogs: () => void;
}

export const TelemetryLogTable: React.FC<TelemetryLogTableProps> = ({
  logs,
  onClearLogs,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.dangerLevel !== filterLevel) {
      return false;
    }
    return true;
  });

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'DateTime', 'WaterLevel_cm', 'Current_ms', 'DangerScore_pct', 'DangerLevel', 'Source'];
    const rows = logs.map((l) => [
      l.timestamp,
      new Date(l.timestamp).toISOString(),
      l.waterLevel.toFixed(2),
      l.waterCurrent.toFixed(2),
      l.combinedDangerScore,
      l.dangerLevel,
      l.source,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flood_management_readings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPill = (level: DangerLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH_DANGER':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'CAUTION':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'SAFE':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recorded Data Readings
            </h3>
            <p className="text-xs text-slate-500">Collected telemetry history for project report</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV for Project</span>
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors px-2 py-1"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-slate-400">Show:</span>
        {['ALL', 'SAFE', 'CAUTION', 'HIGH_DANGER', 'CRITICAL'].map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setFilterLevel(lvl)}
            className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
              filterLevel === lvl
                ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {lvl === 'ALL' ? 'All Readings' : lvl}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-60 rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Water Level</th>
              <th className="py-2.5 px-3">Current Speed</th>
              <th className="py-2.5 px-3">Danger Status</th>
              <th className="py-2.5 px-3 text-right">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No records yet. Data will appear as it arrives.
                </td>
              </tr>
            ) : (
              filteredLogs.slice(-30).reverse().map((reading) => (
                <tr key={reading.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 text-slate-700 font-medium">
                    {new Date(reading.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3 font-bold text-blue-600">
                    {reading.waterLevel.toFixed(1)} cm
                  </td>
                  <td className="py-2 px-3 font-bold text-teal-600">
                    {reading.waterCurrent.toFixed(2)} m/s
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPill(reading.dangerLevel)}`}>
                      {reading.dangerLevel}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    {reading.source === 'ESP_HARDWARE' ? 'ESP Hardware' : 'Simulator'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
