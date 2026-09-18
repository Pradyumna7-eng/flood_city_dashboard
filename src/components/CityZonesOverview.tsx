import React from 'react';
import { MapPin, ArrowUpRight, Cpu } from 'lucide-react';
import { CityZone, DangerLevel } from '../types';

interface CityZonesOverviewProps {
  zones: CityZone[];
  activeZoneId: string;
  onSelectZone: (zoneId: string) => void;
  espIpAddress: string;
}

export const CityZonesOverview: React.FC<CityZonesOverviewProps> = ({
  zones,
  activeZoneId,
  onSelectZone,
  espIpAddress,
}) => {
  const getBadge = (level: DangerLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'HIGH_DANGER':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'CAUTION':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'SAFE':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              City Monitoring Locations
            </h3>
            <p className="text-xs text-slate-500">Key drainage areas in Flood Management City</p>
          </div>
        </div>

        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
          4 Locations Monitored
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {zones.map((zone) => {
          const isSelected = zone.id === activeZoneId;

          return (
            <div
              key={zone.id}
              onClick={() => onSelectZone(zone.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-400/20 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{zone.type}</span>
                {zone.isEspConnected && (
                  <span className="flex items-center gap-1 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                    <Cpu className="w-3 h-3" />
                    ESP Live
                  </span>
                )}
              </div>

              <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>{zone.name}</span>
                {isSelected && <ArrowUpRight className="w-4 h-4 text-blue-600" />}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Water Depth</span>
                  <span className="font-bold text-slate-800">{zone.waterLevel.toFixed(1)} cm</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Flow Speed</span>
                  <span className="font-bold text-slate-800">{zone.waterCurrent.toFixed(2)} m/s</span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadge(zone.dangerLevel)}`}>
                  {zone.dangerLevel}
                </span>
                <span className="text-[11px] text-slate-400">
                  {zone.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
