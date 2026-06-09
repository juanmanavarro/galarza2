import { computed } from "vue";
import { selectIntensityToInstall } from "../utils/lmCatalog";

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
  work_environment: string;
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

const getInstalledIntensityAmps = (grua: Grua) => {
  if (!grua || !grua.servicios) {
    return 0;
  }
  return Object.values(grua.servicios).reduce((total, servicio) => {
    const kw = Number(servicio?.kw);
    if (Number.isFinite(kw) && kw > 0) {
      return total;
    }

    const amp = Number(servicio?.amp);
    if (!Number.isFinite(amp)) {
      return total;
    }
    return total + amp;
  }, 0);
};

const getNominalIntensityAmps = (powerWatts: number, voltage: number) =>
  powerWatts / (Math.sqrt(3) * voltage * 0.8);

const getGruaNominalIntensityAmps = (grua: Grua, voltage: number) => {
  const powerWatts = getInstalledPowerWatts(grua);
  return getInstalledIntensityAmps(grua) + getNominalIntensityAmps(powerWatts, voltage);
};

const exteriorizeTomacorriente = (reference: string, workEnvironment: string) =>
  workEnvironment === "Exterior" ? reference.replace(/A\b/g, "AE") : reference;

const exteriorizeBrazoArrastre = (reference: string, workEnvironment: string) =>
  workEnvironment === "Exterior" ? reference.replace(/BA-(4|70)\b/g, "BA-$1E") : reference;

const getTomacorrientesRef = (
  intensityAmps: number | null,
  workEnvironment: string
) => {
  if (typeof intensityAmps !== "number" || intensityAmps <= 0) {
    return null;
  }
  let reference: string | null = null;
  if (intensityAmps <= 35) {
    reference = "TO-4x35A";
  } else if (intensityAmps <= 70) {
    reference = "TO-4x70A";
  } else if (intensityAmps <= 105) {
    reference = "TO-4x70A + TO-4x35A";
  } else if (intensityAmps <= 140) {
    reference = "2 TO-4x70A";
  } else if (intensityAmps <= 210) {
    reference = "3 TO-4x70A";
  } else {
    return null;
  }
  return exteriorizeTomacorriente(reference, workEnvironment);
};

const getBrazoArrastreRef = (
  intensityAmps: number | null,
  workEnvironment: string
) => {
  if (typeof intensityAmps !== "number" || intensityAmps <= 0) {
    return null;
  }
  let reference: string | null = null;
  if (intensityAmps <= 35) {
    reference = "BA-4";
  } else if (intensityAmps <= 70) {
    reference = "BA-70";
  } else if (intensityAmps <= 105) {
    reference = "BA-70 + BA-4";
  } else if (intensityAmps <= 140) {
    reference = "2 BA-70";
  } else if (intensityAmps <= 210) {
    reference = "3 BA-70";
  } else {
    return null;
  }
  return exteriorizeBrazoArrastre(reference, workEnvironment);
};

export const useGruaAccessories = (formState: FormState, gruas: { value: Grua[] }) => {
  const intensityToInstallByGrua = computed(() => {
    const voltage = Number(formState.voltage);
    if (!Number.isFinite(voltage) || voltage <= 0) {
      return gruas.value.map(() => null);
    }

    const simultaneousKw = Number(formState.max_simultaneous_power_kw);
    const simultaneousAmp = Number(formState.max_simultaneous_power_amp);
    const useSimultaneousPower =
      formState.power_mode === "simultanea" &&
      Number.isFinite(simultaneousKw) &&
      simultaneousKw > 0;
    const useSimultaneousIntensity =
      formState.power_mode === "simultanea" &&
      !useSimultaneousPower &&
      Number.isFinite(simultaneousAmp) &&
      simultaneousAmp > 0;

    return gruas.value.map((grua) => {
      const intensityNominal = useSimultaneousIntensity
        ? simultaneousAmp
        : useSimultaneousPower
          ? getNominalIntensityAmps(simultaneousKw * 1000, voltage)
          : getGruaNominalIntensityAmps(grua, voltage);
      return selectIntensityToInstall(intensityNominal, { zeroAsNoSelection: true });
    });
  });

  const nominalIntensityByGrua = computed(() => {
    const voltage = Number(formState.voltage);
    if (!Number.isFinite(voltage) || voltage <= 0) {
      return gruas.value.map(() => null);
    }

    const simultaneousKw = Number(formState.max_simultaneous_power_kw);
    const simultaneousAmp = Number(formState.max_simultaneous_power_amp);
    const useSimultaneousPower =
      formState.power_mode === "simultanea" &&
      Number.isFinite(simultaneousKw) &&
      simultaneousKw > 0;
    const useSimultaneousIntensity =
      formState.power_mode === "simultanea" &&
      !useSimultaneousPower &&
      Number.isFinite(simultaneousAmp) &&
      simultaneousAmp > 0;

    return gruas.value.map((grua) => {
      if (useSimultaneousIntensity) {
        return simultaneousAmp;
      }
      if (useSimultaneousPower) {
        return getNominalIntensityAmps(simultaneousKw * 1000, voltage);
      }
      return getGruaNominalIntensityAmps(grua, voltage);
    });
  });

  const tomacorrientesByGrua = computed(() =>
    nominalIntensityByGrua.value.map((intensity) =>
      getTomacorrientesRef(intensity, formState.work_environment)
    )
  );
  const brazoArrastreByGrua = computed(() =>
    nominalIntensityByGrua.value.map((intensity) =>
      getBrazoArrastreRef(intensity, formState.work_environment)
    )
  );

  return {
    intensityToInstallByGrua,
    tomacorrientesByGrua,
    brazoArrastreByGrua,
  };
};
