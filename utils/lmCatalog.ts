export const CONSULT_TECHNICAL_MESSAGE = "Consultar dpto. técnico";
export const VOLTAGE_DROP_LIMIT_PERCENT = 3;

export const INTENSITY_OPTIONS = [40, 60, 80, 100, 140, 160, 200] as const;

export type IntensityOption = (typeof INTENSITY_OPTIONS)[number];

export const IMPEDANCE_BY_INTENSITY_OHM_PER_M: Record<IntensityOption, number> = {
  40: 0.002,
  60: 0.00175,
  80: 0.00118,
  100: 0.001,
  140: 0.00075,
  160: 0.00065,
  200: 0.00055,
};

export const selectIntensityToInstall = (
  intensityNominal: number,
  { zeroAsNoSelection = false } = {}
) => {
  if (!Number.isFinite(intensityNominal)) {
    return null;
  }
  if (zeroAsNoSelection && intensityNominal <= 0) {
    return 0;
  }
  for (const option of INTENSITY_OPTIONS) {
    if (intensityNominal < option) {
      return option;
    }
  }
  if (intensityNominal > 200) {
    return CONSULT_TECHNICAL_MESSAGE;
  }
  return null;
};

export const selectFeedingIntensityToInstall = (intensityNominal: number) => {
  const selected = selectIntensityToInstall(intensityNominal);
  return selected === CONSULT_TECHNICAL_MESSAGE ? 0 : selected;
};

export const getImpedanceOhmPerM = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number" || !Number.isFinite(intensityToInstall)) {
    return null;
  }
  const impedance = IMPEDANCE_BY_INTENSITY_OHM_PER_M[intensityToInstall as IntensityOption];
  return impedance === undefined ? null : impedance;
};

export const calculateVoltageDropVolts = ({
  intensityNominal,
  lengthMeters,
  intensityToInstall,
}: {
  intensityNominal: number;
  lengthMeters: number;
  intensityToInstall: number | string | null;
}) => {
  if (!Number.isFinite(intensityNominal) || intensityNominal <= 0) {
    return null;
  }
  if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
    return null;
  }
  const impedance = getImpedanceOhmPerM(intensityToInstall);
  if (impedance === null) {
    return null;
  }
  return Math.sqrt(3) * intensityNominal * lengthMeters * impedance;
};

export const getEffectiveVoltageDropLength = ({
  totalDistance,
  feedingPointPosition,
  feedingPointPositionDistance,
}: {
  totalDistance: number;
  feedingPointPosition: string;
  feedingPointPositionDistance?: number | null;
}) => {
  if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
    return null;
  }

  if (feedingPointPosition === "central") {
    return totalDistance / 2;
  }

  if (feedingPointPosition === "distance") {
    const distanceFromExtreme = Number(feedingPointPositionDistance);
    if (!Number.isFinite(distanceFromExtreme) || distanceFromExtreme < 0) {
      return null;
    }
    return Math.max(distanceFromExtreme, totalDistance - distanceFromExtreme);
  }

  return totalDistance;
};

export const calculateVoltageDropPercent = ({
  dropVolts,
  nominalVoltage,
}: {
  dropVolts: number | null;
  nominalVoltage: number;
}) => {
  if (!Number.isFinite(nominalVoltage) || nominalVoltage === 0) {
    return null;
  }
  if (!Number.isFinite(dropVolts)) {
    return null;
  }
  return ((dropVolts as number) / nominalVoltage) * 100;
};

export const getVoltageDropOfferMessage = (dropPercent: number | null, fallback = "VER OPCIONES") => {
  if (!Number.isFinite(dropPercent)) {
    return null;
  }
  return (dropPercent as number) < VOLTAGE_DROP_LIMIT_PERCENT
    ? "SE PUEDE OFERTAR ESTA LÍNEA (<3%)"
    : fallback;
};

export const isVoltageDropAccepted = (dropPercent: number | null) =>
  Number.isFinite(dropPercent) && (dropPercent as number) < VOLTAGE_DROP_LIMIT_PERCENT;

export const getSupportsSO4Count = (intensityToInstall: number | string | null, lengthMeters: number) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  if (!Number.isFinite(lengthMeters)) {
    return null;
  }
  let supportsRaw = 0;
  if (intensityToInstall < 101) {
    supportsRaw = lengthMeters / 2;
  } else if (intensityToInstall > 102) {
    supportsRaw = lengthMeters * (3 / 4);
  }
  return Math.ceil(supportsRaw);
};

export const getEmpalmesEMP4LineCount = (lengthMeters: number) => {
  if (!Number.isFinite(lengthMeters)) {
    return null;
  }
  return Math.ceil(lengthMeters / 4 - 1);
};

export const getEmpalmesEMP4IntermediaCount = (lengthMeters: number, recommendedFeedingType: string | null) => {
  if (!Number.isFinite(lengthMeters)) {
    return null;
  }
  let empalmesRaw = 0;
  switch (recommendedFeedingType) {
    case "ALIMENTACIÓN CENTRAL = L/2":
      empalmesRaw = lengthMeters / 4 - 2;
      break;
    case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
      empalmesRaw = lengthMeters / 4 - 3;
      break;
    default:
      empalmesRaw = 0;
      break;
  }
  return Math.ceil(empalmesRaw);
};

export const getExtremeFeedingRef = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  if (intensityToInstall < 70) {
    return "AE-4";
  }
  if (intensityToInstall < 110) {
    return "AE-4-100";
  }
  if (intensityToInstall < 150) {
    return "AE-4-140";
  }
  return "Elegir según cable (desplegar abajo):";
};

export const getIntermediateFeedingRef = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  if (intensityToInstall < 70) {
    return "AI-4";
  }
  if (intensityToInstall < 110) {
    return "AI-4-100";
  }
  if (intensityToInstall < 150) {
    return "AI-4-140";
  }
  return "Elegir según cable (desplegar abajo):";
};
