import { computed } from "vue";
import {
  CONSULT_TECHNICAL_MESSAGE,
  INTENSITY_OPTIONS,
  IMPEDANCE_BY_INTENSITY_OHM_PER_M,
  calculateVoltageDropPercent,
  calculateVoltageDropVolts,
  getEmpalmesEMP4IntermediaCount,
  getEmpalmesEMP4LineCount,
  getEffectiveVoltageDropLength,
  getExtremeFeedingRef,
  getIntermediateFeedingRef,
  getSupportsSO4Count,
  getVoltageDropOfferMessage,
  isVoltageDropAccepted,
} from "../utils/lmCatalog";

type FormState = {
  total_distance: number | null;
  voltage: number | null;
  max_permissible_voltage_drop: number | null;
  feeding_point_position: string;
  feeding_point_position_distance: number | null;
  work_environment: string;
};

export const useLineCalculations = (
  formState: FormState,
  totalPowerAmps: { value: number }
) => {
  const selectAcceptedIntensityForLength = (lengthMeters: number | null) => {
    const intensityNominal = Number(totalPowerAmps.value);
    if (!Number.isFinite(intensityNominal)) {
      return null;
    }
    const nominalVoltage = Number(formState.voltage);
    if (!Number.isFinite(lengthMeters) || Number(lengthMeters) <= 0) {
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
      const dropVolts = Math.sqrt(3) * intensityNominal * Number(lengthMeters) * impedance;
      const dropPercent = (dropVolts / nominalVoltage) * 100;
      if (
        intensityNominal < option &&
        isVoltageDropAccepted(dropPercent, Number(formState.max_permissible_voltage_drop))
      ) {
        return option;
      }
    }
    return CONSULT_TECHNICAL_MESSAGE;
  };

  const effectiveVoltageDropLength = computed(() =>
    getEffectiveVoltageDropLength({
      totalDistance: Number(formState.total_distance),
      feedingPointPosition: formState.feeding_point_position,
      feedingPointPositionDistance: formState.feeding_point_position_distance,
    })
  );

  const intensityToInstallLine = computed(() =>
    selectAcceptedIntensityForLength(effectiveVoltageDropLength.value)
  );

  const isConsultingLine = computed(() => intensityToInstallLine.value === CONSULT_TECHNICAL_MESSAGE);

  const voltageDropVoltsLine = computed(() =>
    calculateVoltageDropVolts({
      intensityNominal: Number(totalPowerAmps.value),
      lengthMeters: Number(effectiveVoltageDropLength.value),
      intensityToInstall: intensityToInstallLine.value,
    })
  );

  const voltageDropPercentLine = computed(() =>
    calculateVoltageDropPercent({
      dropVolts: voltageDropVoltsLine.value,
      nominalVoltage: Number(formState.voltage),
    })
  );

  const getVoltageDropVoltsForLength = (
    lengthMeters: number | null,
    intensityToInstall: number | string | null
  ) =>
    calculateVoltageDropVolts({
      intensityNominal: Number(totalPowerAmps.value),
      lengthMeters: Number(lengthMeters),
      intensityToInstall,
    });

  const getVoltageDropPercentForLength = (
    lengthMeters: number | null,
    intensityToInstall: number | string | null
  ) =>
    calculateVoltageDropPercent({
      dropVolts: getVoltageDropVoltsForLength(lengthMeters, intensityToInstall),
      nominalVoltage: Number(formState.voltage),
    });

  const voltageDropPercentL2 = computed(() =>
    getVoltageDropPercentForLength(
      Number(formState.total_distance) / 2,
      selectAcceptedIntensityForLength(Number(formState.total_distance) / 2)
    )
  );
  const voltageDropPercentL6 = computed(() =>
    getVoltageDropPercentForLength(
      Number(formState.total_distance) / 6,
      selectAcceptedIntensityForLength(Number(formState.total_distance) / 6)
    )
  );

  const recommendedFeedingType = computed(() => {
    if (formState.feeding_point_position === "extreme") {
      const intensityL2 = selectAcceptedIntensityForLength(Number(formState.total_distance) / 2);
      return intensityL2 !== null && intensityL2 !== CONSULT_TECHNICAL_MESSAGE
        ? "ALIMENTACIÓN CENTRAL = L/2"
        : null;
    }
    if (formState.feeding_point_position === "central") {
      const intensityL6 = selectAcceptedIntensityForLength(Number(formState.total_distance) / 6);
      return intensityL6 !== null && intensityL6 !== CONSULT_TECHNICAL_MESSAGE
        ? "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6"
        : null;
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
      case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
        return lengthMeters / 6;
      default:
        return null;
    }
  });

  const voltageDropPercentIntermedia = computed(() =>
    calculateVoltageDropPercent({
      dropVolts: getVoltageDropVoltsForLength(
        selectedFeedingLengthMeters.value,
        intensityToInstallFeeding.value
      ),
      nominalVoltage: Number(formState.voltage),
    })
  );

  const intensityToInstallFeeding = computed(() =>
    recommendedFeedingType.value
      ? selectAcceptedIntensityForLength(selectedFeedingLengthMeters.value)
      : null
  );

  const isConsultingFeeding = computed(() => intensityToInstallFeeding.value === CONSULT_TECHNICAL_MESSAGE);

  const voltageDropPercentIntermediaDisplay = computed(() => {
    const value = voltageDropPercentIntermedia.value;
    if (!Number.isFinite(value)) {
      return "";
    }
    return (value as number).toFixed(2);
  });

  const supportsSO4Intermedia = computed(() =>
    getSupportsSO4Count(
      intensityToInstallFeeding.value,
      Number(formState.total_distance),
      formState.work_environment
    )
  );

  const empalmesEMP4Intermedia = computed(() =>
    getEmpalmesEMP4IntermediaCount(Number(formState.total_distance), recommendedFeedingType.value)
  );

  const alimentacionUnidadesIntermedia = computed(() => {
    switch (recommendedFeedingType.value) {
      case "ALIMENTACIÓN CENTRAL = L/2":
        return 1;
      case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
        return 2;
      default:
        return null;
    }
  });

  const alimentacionInteriorIntermedia = computed(() =>
    getIntermediateFeedingRef(intensityToInstallFeeding.value, formState.work_environment)
  );

  const puntoFijoPF4Intermedia = computed(() => {
    switch (recommendedFeedingType.value) {
      case "ALIMENTACIÓN CENTRAL = L/2":
        return 2;
      case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
        return 1;
      default:
        return null;
    }
  });

  const tapaExtremaTE4Intermedia = computed(() => {
    switch (recommendedFeedingType.value) {
      case "ALIMENTACIÓN CENTRAL = L/2":
      case "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6":
        return 2;
      default:
        return null;
    }
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
    getVoltageDropOfferMessage(
      voltageDropPercentLine.value,
      "VER OPCIONES",
      Number(formState.max_permissible_voltage_drop)
    )
  );

  const supportsSO4Line = computed(() =>
    getSupportsSO4Count(
      intensityToInstallLine.value,
      Number(formState.total_distance),
      formState.work_environment
    )
  );

  const empalmesEMP4Line = computed(() =>
    getEmpalmesEMP4LineCount(Number(formState.total_distance), formState.feeding_point_position)
  );

  const alimentacionExtremaLine = computed(() =>
    getExtremeFeedingRef(intensityToInstallLine.value, formState.work_environment)
  );

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
    voltageDropPercentL6,
    recommendedFeedingType,
    selectedFeedingLengthMeters,
    voltageDropPercentIntermedia,
    voltageDropPercentIntermediaDisplay,
    intensityToInstallFeeding,
    isConsultingFeeding,
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
