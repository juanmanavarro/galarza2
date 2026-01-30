import { computed } from "vue";

type PowerGroup = {
  kw: number | null;
};

type Grua = {
  servicios?: Record<string, PowerGroup>;
};

type FormState = {
  max_simultaneous_power_kw: number | null;
  power_mode: string;
};

const getInstalledPowerWatts = (grua: Grua) => {
  if (!grua || !grua.servicios) {
    return 0;
  }
  return Object.values(grua.servicios).reduce((total, servicio) => {
    const kw = Number(servicio?.kw);
    if (!Number.isFinite(kw)) {
      return total;
    }
    return total + kw * 1000;
  }, 0);
};

const getInstalledPowersWatts = (formState: FormState, gruas: Grua[], gruasCount: number) => {
  const perMachineKw = Number(formState.max_simultaneous_power_kw);
  const usePerMachine =
    formState.power_mode === "simultanea" && Number.isFinite(perMachineKw) && perMachineKw > 0;

  if (usePerMachine) {
    return Array.from({ length: gruasCount }, () => perMachineKw * 1000);
  }

  return gruas
    .map((grua) => getInstalledPowerWatts(grua))
    .filter((power) => Number.isFinite(power) && power > 0);
};

const getCorrectedPowersWatts = (installedPowers: number[]) => installedPowers.map((power) => 0.8 * power);

const calculateTotalPowerWatts = (formState: FormState, gruas: Grua[], gruasCount: number) => {
  const installedPowers = getInstalledPowersWatts(formState, gruas, gruasCount);
  if (installedPowers.length === 0) {
    return 0;
  }

  const correctedPowers = getCorrectedPowersWatts(installedPowers);
  if (correctedPowers.length === 1) {
    return correctedPowers[0];
  }

  const totalCorrected = correctedPowers.reduce((total, power) => total + power, 0);
  return 0.8 * totalCorrected;
};

export const useTotalPower = (
  formState: FormState,
  gruas: { value: Grua[] },
  gruasCount: { value: number }
) => {
  const totalPowerWatts = computed(() =>
    calculateTotalPowerWatts(formState, gruas.value, gruasCount.value)
  );

  return {
    totalPowerWatts,
  };
};
