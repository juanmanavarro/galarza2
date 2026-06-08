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

const getTomacorrientesRef = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  switch (intensityToInstall) {
    case 40:
      return "TO-4x35A";
    case 60:
      return "TO-4x70A";
    case 80:
      return "TO-4x70A";
    case 100:
      return "TO-4x35A + TO-4x70A";
    case 140:
      return "2  TO-4x70A";
    case 160:
      return "TO-4x35A + 2 TO-4x70A";
    case 200:
      return "3 TO-4x70A";
    default:
      return null;
  }
};

const getBrazoArrastreRef = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number") {
    return null;
  }
  switch (intensityToInstall) {
    case 40:
      return "BA-4";
    case 60:
      return "BA-70";
    case 80:
      return "BA-70";
    case 100:
      return "BA-4 + BA-70";
    case 140:
      return "2 BA-70";
    case 160:
      return "BA-4 + 2 BA-70";
    case 200:
      return "3 BA-70";
    default:
      return null;
  }
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
      if (useSimultaneousIntensity) {
        return selectIntensityToInstall(simultaneousAmp, { zeroAsNoSelection: true });
      }

      const powerWatts = useSimultaneousPower ? simultaneousKw * 1000 : getInstalledPowerWatts(grua);
      const intensityNominal = getInstalledIntensityAmps(grua) + getNominalIntensityAmps(powerWatts, voltage);
      return selectIntensityToInstall(intensityNominal, { zeroAsNoSelection: true });
    });
  });

  const tomacorrientesByGrua = computed(() =>
    intensityToInstallByGrua.value.map((intensity) => getTomacorrientesRef(intensity))
  );
  const brazoArrastreByGrua = computed(() =>
    intensityToInstallByGrua.value.map((intensity) => getBrazoArrastreRef(intensity))
  );

  return {
    intensityToInstallByGrua,
    tomacorrientesByGrua,
    brazoArrastreByGrua,
  };
};
