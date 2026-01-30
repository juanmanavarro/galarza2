import { computed } from "vue";

type PowerGroup = {
  kw: number | null;
};

type Grua = {
  servicios?: Record<string, PowerGroup>;
};

type FormState = {
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

const getNominalIntensityAmps = (powerWatts: number, voltage: number) =>
  powerWatts / (Math.sqrt(3) * voltage * 0.8);

const getIntensityToInstall = (intensityNominal: number) => {
  if (!Number.isFinite(intensityNominal)) {
    return null;
  }
  if (intensityNominal <= 0) {
    return 0;
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

const getTomacorrientesRef = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number") {
    return 0;
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
      return 0;
  }
};

const getBrazoArrastreRef = (intensityToInstall: number | string | null) => {
  if (typeof intensityToInstall !== "number") {
    return 0;
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
      return 0;
  }
};

export const useGruaAccessories = (formState: FormState, gruas: { value: Grua[] }) => {
  const intensityToInstallByGrua = computed(() => {
    const voltage = Number(formState.voltage);
    if (!Number.isFinite(voltage) || voltage <= 0) {
      return gruas.value.map(() => null);
    }
    return gruas.value.map((grua) => {
      const powerWatts = getInstalledPowerWatts(grua);
      const intensityNominal = getNominalIntensityAmps(powerWatts, voltage);
      return getIntensityToInstall(intensityNominal);
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
