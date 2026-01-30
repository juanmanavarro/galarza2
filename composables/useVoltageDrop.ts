import { computed } from "vue";

type FormState = {
  total_distance: number | null;
};

const IMPEDANCE_BY_INTENSITY_OHM_PER_M: Record<number, number> = {
  40: 0.002,
  60: 0.00175,
  80: 0.00118,
  100: 0.001,
  140: 0.00075,
  160: 0.00065,
  200: 0.00055,
};

const getIntensityToInstall = (intensityNominal: number) => {
  if (!Number.isFinite(intensityNominal)) {
    return null;
  }
  if (intensityNominal < 40) {
    return 40;
  }
  if (intensityNominal < 60) {
    return 60;
  }
  if (intensityNominal < 80) {
    return 80;
  }
  if (intensityNominal < 100) {
    return 100;
  }
  if (intensityNominal < 140) {
    return 140;
  }
  if (intensityNominal < 160) {
    return 160;
  }
  if (intensityNominal < 200) {
    return 200;
  }
  if (intensityNominal > 200) {
    return "Consultar dpto. técnico";
  }
  return null;
};

const getImpedanceOhmPerM = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number" || !Number.isFinite(intensityToInstall)) {
    return null;
  }
  const impedance = IMPEDANCE_BY_INTENSITY_OHM_PER_M[intensityToInstall];
  return impedance === undefined ? null : impedance;
};

export const useVoltageDrop = (
  formState: FormState,
  totalPowerAmps: { value: number }
) => {
  const intensityToInstallAmp = computed(() => getIntensityToInstall(Number(totalPowerAmps.value)));
  const impedanceOhmPerM = computed(() => getImpedanceOhmPerM(intensityToInstallAmp.value));
  const voltageDropVolts = computed(() => {
    const intensityNominal = Number(totalPowerAmps.value);
    const lengthMeters = Number(formState.total_distance);
    const impedance = impedanceOhmPerM.value;

    if (!Number.isFinite(intensityNominal) || intensityNominal <= 0) {
      return null;
    }
    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      return null;
    }
    if (impedance === null) {
      return null;
    }

    return Math.sqrt(3) * intensityNominal * lengthMeters * impedance;
  });

  return {
    voltageDropVolts,
    impedanceOhmPerM,
    intensityToInstallAmp,
  };
};
