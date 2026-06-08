import { computed } from "vue";
import {
  CONSULT_TECHNICAL_MESSAGE,
  INTENSITY_OPTIONS,
  IMPEDANCE_BY_INTENSITY_OHM_PER_M,
  calculateVoltageDropPercent,
  calculateVoltageDropVolts,
  getEmpalmesEMP4IntermediaCount,
  getEmpalmesEMP4LineCount,
  getExtremeFeedingRef,
  getIntermediateFeedingRef,
  getSupportsSO4Count,
  getVoltageDropOfferMessage,
  isVoltageDropAccepted,
  selectFeedingIntensityToInstall,
} from "../utils/lmCatalog";

type FormState = {
  total_distance: number | null;
  voltage: number | null;
};

export const useLineCalculations = (
  formState: FormState,
  totalPowerAmps: { value: number }
) => {
  const intensityToInstallLine = computed(() => {
    const intensityNominal = Number(totalPowerAmps.value);
    if (!Number.isFinite(intensityNominal)) {
      return null;
    }
    const lengthMeters = Number(formState.total_distance);
    const nominalVoltage = Number(formState.voltage);
    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      return null;
    }
    if (!Number.isFinite(nominalVoltage) || nominalVoltage === 0) {
      return null;
    }
    for (const option of INTENSITY_OPTIONS) {
      const impedance = IMPEDANCE_BY_INTENSITY_OHM_PER_M[option];
      if (!Number.isFinite(impedance)) {
        continue;
      }
      const dropVolts = Math.sqrt(3) * intensityNominal * lengthMeters * impedance;
      const dropPercent = (dropVolts / nominalVoltage) * 100;
      if (intensityNominal < option && isVoltageDropAccepted(dropPercent)) {
        return option;
      }
    }
    return CONSULT_TECHNICAL_MESSAGE;
  });

  const isConsultingLine = computed(() => intensityToInstallLine.value === CONSULT_TECHNICAL_MESSAGE);

  const voltageDropVoltsLine = computed(() =>
    calculateVoltageDropVolts({
      intensityNominal: Number(totalPowerAmps.value),
      lengthMeters: Number(formState.total_distance),
      intensityToInstall: intensityToInstallLine.value,
    })
  );

  const voltageDropPercentLine = computed(() =>
    calculateVoltageDropPercent({
      dropVolts: voltageDropVoltsLine.value,
      nominalVoltage: Number(formState.voltage),
    })
  );

  const intensityToInstallFeeding = computed(() =>
    selectFeedingIntensityToInstall(Number(totalPowerAmps.value))
  );

  const getVoltageDropVoltsForLength = (lengthMeters: number | null) =>
    calculateVoltageDropVolts({
      intensityNominal: Number(totalPowerAmps.value),
      lengthMeters: Number(lengthMeters),
      intensityToInstall: intensityToInstallFeeding.value,
    });

  const getVoltageDropPercentForLength = (lengthMeters: number | null) =>
    calculateVoltageDropPercent({
      dropVolts: getVoltageDropVoltsForLength(lengthMeters),
      nominalVoltage: Number(formState.voltage),
    });

  const voltageDropPercentL2 = computed(() =>
    getVoltageDropPercentForLength(Number(formState.total_distance) / 2)
  );
  const voltageDropPercentL4 = computed(() =>
    getVoltageDropPercentForLength(Number(formState.total_distance) / 4)
  );
  const voltageDropPercentL6 = computed(() =>
    getVoltageDropPercentForLength(Number(formState.total_distance) / 6)
  );

  const recommendedFeedingType = computed(() => {
    const dropL2 = voltageDropPercentL2.value;
    if (isVoltageDropAccepted(dropL2)) {
      return "ALIMENTACIÓN CENTRAL = L/2";
    }
    const dropL4 = voltageDropPercentL4.value;
    if (isVoltageDropAccepted(dropL4)) {
      return "ALIMENTACIÓN POR LOS DOS EXTREMOS = L/4";
    }
    const dropL6 = voltageDropPercentL6.value;
    if (isVoltageDropAccepted(dropL6)) {
      return "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6";
    }
    return null;
  });

  const selectedFeedingLengthMeters = computed(() => {
    const lengthMeters = Number(formState.total_distance);
    if (!Number.isFinite(lengthMeters)) {
      return null;
    }
    switch (recommendedFeedingType.value) {
      case "ALIMENTACIÓN CENTRAL = L/2":
        return lengthMeters / 2;
      case "ALIMENTACIÓN POR LOS DOS EXTREMOS = L/4":
        return lengthMeters / 4;
      case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
        return lengthMeters / 6;
      default:
        return null;
    }
  });

  const voltageDropPercentIntermedia = computed(() =>
    calculateVoltageDropPercent({
      dropVolts: getVoltageDropVoltsForLength(selectedFeedingLengthMeters.value),
      nominalVoltage: Number(formState.voltage),
    })
  );

  const voltageDropPercentIntermediaDisplay = computed(() => {
    const value = voltageDropPercentIntermedia.value;
    if (!Number.isFinite(value)) {
      return "";
    }
    return (value as number).toFixed(2);
  });

  const supportsSO4Intermedia = computed(() =>
    getSupportsSO4Count(intensityToInstallFeeding.value, Number(formState.total_distance))
  );

  const empalmesEMP4Intermedia = computed(() =>
    getEmpalmesEMP4IntermediaCount(Number(formState.total_distance), recommendedFeedingType.value)
  );

  const alimentacionUnidadesIntermedia = computed(() => {
    const dropL2 = voltageDropPercentL2.value;
    if (isVoltageDropAccepted(dropL2)) {
      return 1;
    }
    const dropL4 = voltageDropPercentL4.value;
    if (isVoltageDropAccepted(dropL4)) {
      return 2;
    }
    const dropL6 = voltageDropPercentL6.value;
    if (isVoltageDropAccepted(dropL6)) {
      return 2;
    }
    return null;
  });

  const alimentacionInteriorIntermedia = computed(() =>
    getIntermediateFeedingRef(intensityToInstallFeeding.value)
  );

  const puntoFijoPF4Intermedia = computed(() => {
    const dropL2 = voltageDropPercentL2.value;
    if (isVoltageDropAccepted(dropL2)) {
      return 2;
    }
    const dropL4 = voltageDropPercentL4.value;
    if (isVoltageDropAccepted(dropL4)) {
      return 1;
    }
    const dropL6 = voltageDropPercentL6.value;
    if (isVoltageDropAccepted(dropL6)) {
      return 3;
    }
    return null;
  });

  const tapaExtremaTE4Intermedia = computed(() => {
    const dropL2 = voltageDropPercentL2.value;
    if (isVoltageDropAccepted(dropL2)) {
      return 2;
    }
    const dropL4 = voltageDropPercentL4.value;
    if (isVoltageDropAccepted(dropL4)) {
      return 0;
    }
    const dropL6 = voltageDropPercentL6.value;
    if (isVoltageDropAccepted(dropL6)) {
      return 0;
    }
    return null;
  });

  const su5001Intermedia = computed(() => {
    if (!Number.isFinite(supportsSO4Intermedia.value)) {
      return null;
    }
    if (!Number.isFinite(puntoFijoPF4Intermedia.value)) {
      return null;
    }
    return (supportsSO4Intermedia.value as number) + (puntoFijoPF4Intermedia.value as number);
  });

  const voltageDropMessageLine = computed(() =>
    getVoltageDropOfferMessage(voltageDropPercentLine.value)
  );

  const supportsSO4Line = computed(() =>
    getSupportsSO4Count(intensityToInstallLine.value, Number(formState.total_distance))
  );

  const empalmesEMP4Line = computed(() => getEmpalmesEMP4LineCount(Number(formState.total_distance)));

  const alimentacionExtremaLine = computed(() => getExtremeFeedingRef(intensityToInstallLine.value));

  const su5001Line = computed(() => {
    if (!Number.isFinite(supportsSO4Line.value)) {
      return null;
    }
    return (supportsSO4Line.value as number) + 1;
  });

  return {
    intensityToInstallLine,
    isConsultingLine,
    voltageDropVoltsLine,
    voltageDropPercentLine,
    voltageDropPercentL2,
    voltageDropPercentL4,
    voltageDropPercentL6,
    recommendedFeedingType,
    selectedFeedingLengthMeters,
    voltageDropPercentIntermedia,
    voltageDropPercentIntermediaDisplay,
    intensityToInstallFeeding,
    supportsSO4Intermedia,
    empalmesEMP4Intermedia,
    alimentacionUnidadesIntermedia,
    alimentacionInteriorIntermedia,
    puntoFijoPF4Intermedia,
    tapaExtremaTE4Intermedia,
    su5001Intermedia,
    voltageDropMessageLine,
    supportsSO4Line,
    empalmesEMP4Line,
    alimentacionExtremaLine,
    su5001Line,
  };
};
