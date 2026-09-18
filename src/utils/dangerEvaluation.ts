import { DangerAssessment, DangerLevel, ThresholdConfig } from '../types';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  unit: 'cm',
  currentUnit: 'm/s',
  maxLevel: 100, // 100 cm full scale capacity
  cautionLevel: 45, // 45 cm - alert
  highDangerLevel: 70, // 70 cm - high danger
  criticalLevel: 88, // 88 cm - severe flood
  cautionCurrent: 1.0, // 1.0 m/s
  highDangerCurrent: 2.2, // 2.2 m/s
  criticalCurrent: 3.5, // 3.5 m/s
};

export function evaluateDanger(
  waterLevel: number,
  waterCurrent: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): {
  dangerLevel: DangerLevel;
  score: number; // 0 to 100
  assessment: DangerAssessment;
} {
  const levelRatio = Math.min(Math.max(waterLevel / thresholds.maxLevel, 0), 1.5);
  const currentRatio = Math.min(Math.max(waterCurrent / thresholds.criticalCurrent, 0), 1.5);

  const depthMeters = waterLevel / 100;
  const hydrodynamicForce = Number((depthMeters * Math.pow(Math.max(0.1, waterCurrent), 2) * 1.2).toFixed(1));

  // Weighted score (0 to 100)
  const weightedScore = Math.min(100, Math.round((levelRatio * 55 + currentRatio * 45) * 100 / 1.1));

  let dangerLevel: DangerLevel = 'SAFE';

  if (waterLevel >= thresholds.criticalLevel || waterCurrent >= thresholds.criticalCurrent || weightedScore >= 80) {
    dangerLevel = 'CRITICAL';
  } else if (waterLevel >= thresholds.highDangerLevel || waterCurrent >= thresholds.highDangerCurrent || weightedScore >= 60) {
    dangerLevel = 'HIGH_DANGER';
  } else if (waterLevel >= thresholds.cautionLevel || waterCurrent >= thresholds.cautionCurrent || weightedScore >= 35) {
    dangerLevel = 'CAUTION';
  } else {
    dangerLevel = 'SAFE';
  }

  const assessmentDetails: Record<DangerLevel, DangerAssessment> = {
    SAFE: {
      level: 'SAFE',
      color: '#16a34a', // green-600
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
      title: 'Safe — No Danger',
      description: 'Water depth is low and flowing peacefully. There is currently zero risk of flooding in the city.',
      actionRequired: 'All clear. Regular monitoring in progress.',
      evacuationRecommended: false,
      sirenActive: false,
      hydrodynamicForce,
    },
    CAUTION: {
      level: 'CAUTION',
      color: '#d97706', // amber-600
      textColor: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      title: 'Caution — Water Rising',
      description: 'Water levels are climbing and the current is speeding up. Low-lying areas and drains are filling.',
      actionRequired: 'Stay watchful. Keep away from canal banks and prepare for possible rain buildup.',
      evacuationRecommended: false,
      sirenActive: false,
      hydrodynamicForce,
    },
    HIGH_DANGER: {
      level: 'HIGH_DANGER',
      color: '#ea580c', // orange-600
      textColor: 'text-orange-900',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      title: 'High Danger — Flood Warning',
      description: 'Water is nearing the top of the banks and moving dangerously fast. Flooding is starting.',
      actionRequired: 'Stay indoors. Do not drive or walk through flooded roads or underpasses.',
      evacuationRecommended: false,
      sirenActive: false,
      hydrodynamicForce,
    },
    CRITICAL: {
      level: 'CRITICAL',
      color: '#dc2626', // red-600
      textColor: 'text-red-900',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      title: 'Critical Emergency — Severe Flood!',
      description: 'Extreme danger! Water has overflowed with violent currents strong enough to wash away cars.',
      actionRequired: 'Evacuate immediately to higher ground! Follow civil defense instructions.',
      evacuationRecommended: true,
      sirenActive: true,
      hydrodynamicForce,
    },
  };

  return {
    dangerLevel,
    score: weightedScore,
    assessment: assessmentDetails[dangerLevel],
  };
}
