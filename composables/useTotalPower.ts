import { computed } from "vue";

type PowerGroup = {
  kw: number | null;
  amp: number | null;
};

type Grua = {
  servicios?: Record<string, PowerGroup>;
};

type FormState = {
  max_simultaneous_power_kw: number | null;
  max_simultaneous_power_amp: number | null;
  power_mode: string;
  voltage: number | null;
};

type InstalledPower = {
  watts: number;
  amps: number;
};

const getInstalledPower = (grua: Grua): InstalledPower => {
  if (!grua || !grua.servicios) {
    return { watts: 0, amps: 0 };
  }
  return Object.values(grua.servicios).reduce((total, servicio) => {
    const kw = Number(servicio?.kw);
    if (Number.isFinite(kw) && kw > 0) {
      return {
        ...total,
        watts: total.watts + kw * 1000,
      };
    }

    const amp = Number(servicio?.amp);
    if (!Number.isFinite(amp)) {
      return total;
    }
    return {
      ...total,
      amps: total.amps + amp,
    };
  }, { watts: 0, amps: 0 });
};

const getInstalledPowers = (formState: FormState, gruas: Grua[], gruasCount: number) => {
  const perMachineKw = Number(formState.max_simultaneous_power_kw);
  const usePerMachine =
    formState.power_mode === "simultanea" && Number.isFinite(perMachineKw) && perMachineKw > 0;

  if (usePerMachine) {
    return Array.from({ length: gruasCount }, () => ({ watts: perMachineKw * 1000, amps: 0 }));
  }

  const perMachineAmp = Number(formState.max_simultaneous_power_amp);
  const usePerMachineAmp =
    formState.power_mode === "simultanea" && Number.isFinite(perMachineAmp) && perMachineAmp > 0;

  if (usePerMachineAmp) {
    return Array.from({ length: gruasCount }, () => ({ watts: 0, amps: perMachineAmp }));
  }

  return gruas
    .map((grua) => getInstalledPower(grua))
    .filter((power) => power.watts > 0 || power.amps > 0);
};

const getCorrectedPowers = (installedPowers: InstalledPower[]) =>
  installedPowers.map((power) => ({ watts: 0.8 * power.watts, amps: 0.8 * power.amps }));

const calculateCorrectedTotals = (formState: FormState, gruas: Grua[], gruasCount: number) => {
  const installedPowers = getInstalledPowers(formState, gruas, gruasCount);
  if (installedPowers.length === 0) {
    return { watts: 0, amps: 0 };
  }

  const correctedPowers = getCorrectedPowers(installedPowers);
  if (correctedPowers.length === 1) {
    return correctedPowers[0];
  }

  const totalCorrected = correctedPowers.reduce(
    (total, power) => ({
      watts: total.watts + power.watts,
      amps: total.amps + power.amps,
    }),
    { watts: 0, amps: 0 }
  );
  return { watts: 0.8 * totalCorrected.watts, amps: 0.8 * totalCorrected.amps };
};

export const useTotalPower = (
  formState: FormState,
  gruas: { value: Grua[] },
  gruasCount: { value: number }
) => {
  const totalPowerWatts = computed(() =>
    calculateCorrectedTotals(formState, gruas.value, gruasCount.value).watts
  );
  const totalPowerAmps = computed(() => {
    const voltage = Number(formState.voltage);
    if (!Number.isFinite(voltage) || voltage <= 0) {
      return 0;
    }
    const correctedTotals = calculateCorrectedTotals(formState, gruas.value, gruasCount.value);
    const wattsAsAmps = correctedTotals.watts / (Math.sqrt(3) * voltage * 0.8);
    return Number(
      (correctedTotals.amps + wattsAsAmps).toFixed(2)
    );
  });

  return {
    totalPowerWatts,
    totalPowerAmps,
  };
};
