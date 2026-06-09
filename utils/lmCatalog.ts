export const CONSULT_TECHNICAL_MESSAGE = "Consultar dpto. técnico";
export const TECHNICAL_CONSULTATION_REQUIRED_MESSAGE =
  "Esta configuración requiere consulta con el servicio técnico de IGA.";
export const VOLTAGE_DROP_LIMIT_PERCENT = 3;

export const INTENSITY_OPTIONS = [40, 60, 80, 100, 140, 160, 200] as const;

export type IntensityOption = (typeof INTENSITY_OPTIONS)[number];

export const IMPEDANCE_BY_INTENSITY_OHM_PER_M: Record<IntensityOption, number> = {
  40: 0.00346,
  60: 0.00303,
  80: 0.00204,
  100: 0.00173,
  140: 0.00123,
  160: 0.00105,
  200: 0.0009,
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

export const getLmModelRef = (
  intensityToInstall: number | string | null,
  workEnvironment = "Interior"
) => {
  if (typeof intensityToInstall !== "number" || !Number.isFinite(intensityToInstall)) {
    return null;
  }
  if (!INTENSITY_OPTIONS.includes(intensityToInstall as IntensityOption)) {
    return null;
  }
  return `LM${intensityToInstall}${workEnvironment === "Exterior" ? "E" : ""}`;
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

export const requiresTechnicalConsultation = ({
  totalDistance,
  hasCorrosiveElements,
  hasMixedIndoorOutdoorSections,
  workEnvironment,
  minTemperature,
  maxTemperature,
  amperage,
  hasSectionedZones,
}: {
  totalDistance: number | null;
  hasCorrosiveElements: string;
  hasMixedIndoorOutdoorSections: string;
  workEnvironment: string;
  minTemperature: number | null;
  maxTemperature: number | null;
  amperage: number | null;
  hasSectionedZones: string;
}) => {
  const lengthMeters = Number(totalDistance);
  if (Number.isFinite(lengthMeters) && lengthMeters >= 280) {
    return true;
  }
  if (hasCorrosiveElements === "1") {
    return true;
  }
  if (hasMixedIndoorOutdoorSections === "1") {
    return true;
  }

  const minAllowed = workEnvironment === "Exterior" ? -30 : -10;
  const maxAllowed = workEnvironment === "Exterior" ? 60 : 50;
  const minTemp = Number(minTemperature);
  const maxTemp = Number(maxTemperature);
  if (Number.isFinite(minTemp) && minTemp < minAllowed) {
    return true;
  }
  if (Number.isFinite(maxTemp) && maxTemp > maxAllowed) {
    return true;
  }

  const amps = Number(amperage);
  if (Number.isFinite(amps) && amps > 200) {
    return true;
  }
  return hasSectionedZones === "1";
};

export const getSupportsSO4Count = (
  intensityToInstall: number | string | null,
  lengthMeters: number,
  workEnvironment = "Interior"
) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  if (!Number.isFinite(lengthMeters)) {
    return null;
  }

  if (workEnvironment === "Exterior") {
    return Math.ceil(lengthMeters / (intensityToInstall >= 160 ? 1 : 1.333));
  }

  return Math.ceil(lengthMeters / (intensityToInstall >= 140 ? 1.333 : 2));
};

const getEmpalmesEMP4Count = (
  lengthMeters: number,
  exactDivisionDeduction: number,
  nonExactDivisionDeduction: number
) => {
  if (!Number.isFinite(lengthMeters)) {
    return null;
  }
  const sections = Math.floor(lengthMeters / 4);
  const deduction = Number.isInteger(lengthMeters / 4)
    ? exactDivisionDeduction
    : nonExactDivisionDeduction;
  return Math.max(0, sections - deduction);
};

export const getEmpalmesEMP4LineCount = (lengthMeters: number, feedingPointPosition = "extreme") => {
  switch (feedingPointPosition) {
    case "central":
    case "distance":
      return getEmpalmesEMP4Count(lengthMeters, 2, 1);
    default:
      return getEmpalmesEMP4Count(lengthMeters, 1, 0);
  }
};

export const getEmpalmesEMP4IntermediaCount = (lengthMeters: number, recommendedFeedingType: string | null) => {
  switch (recommendedFeedingType) {
    case "ALIMENTACIÓN CENTRAL = L/2":
      return getEmpalmesEMP4Count(lengthMeters, 2, 1);
    case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
      return getEmpalmesEMP4Count(lengthMeters, 3, 2);
    default:
      return getEmpalmesEMP4Count(lengthMeters, 0, 0);
  }
};

const withExteriorSuffix = (reference: string, workEnvironment = "Interior") =>
  workEnvironment === "Exterior" ? `${reference}E` : reference;

export const getExtremeFeedingRef = (
  intensityToInstall: number | string | null,
  workEnvironment = "Interior"
) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  if (intensityToInstall < 70) {
    return withExteriorSuffix("AE-4", workEnvironment);
  }
  if (intensityToInstall < 110) {
    return withExteriorSuffix("AE-4-100", workEnvironment);
  }
  if (intensityToInstall < 150) {
    return withExteriorSuffix("AE-4-140", workEnvironment);
  }
  return "Elegir según cable (desplegar abajo):";
};

export const getIntermediateFeedingRef = (
  intensityToInstall: number | string | null,
  workEnvironment = "Interior"
) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  if (intensityToInstall < 70) {
    return withExteriorSuffix("AI-4", workEnvironment);
  }
  if (intensityToInstall < 110) {
    return withExteriorSuffix("AI-4-100", workEnvironment);
  }
  if (intensityToInstall < 150) {
    return withExteriorSuffix("AI-4-140", workEnvironment);
  }
  return "Elegir según cable (desplegar abajo):";
};
