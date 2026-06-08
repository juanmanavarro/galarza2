import { computed } from "vue";
import {
  calculateVoltageDropPercent,
  calculateVoltageDropVolts,
  getImpedanceOhmPerM,
  getVoltageDropOfferMessage,
  selectIntensityToInstall,
} from "../utils/lmCatalog";

type FormState = {
  total_distance: number | null;
};

export const useVoltageDrop = (
  formState: FormState,
  totalPowerAmps: { value: number }
) => {
  const intensityToInstallAmp = computed(() => selectIntensityToInstall(Number(totalPowerAmps.value)));
  const impedanceOhmPerM = computed(() => getImpedanceOhmPerM(intensityToInstallAmp.value));
  const voltageDropVolts = computed(() =>
    calculateVoltageDropVolts({
      intensityNominal: Number(totalPowerAmps.value),
      lengthMeters: Number(formState.total_distance),
      intensityToInstall: intensityToInstallAmp.value,
    })
  );
  const voltageDropPercent = computed(() =>
    calculateVoltageDropPercent({
      dropVolts: voltageDropVolts.value,
      nominalVoltage: Number(formState.voltage),
    })
  );
  const voltageDropMessage = computed(() =>
    getVoltageDropOfferMessage(voltageDropPercent.value, "VER OPCIONES 1 Y 2")
  );

  return {
    voltageDropVolts,
    impedanceOhmPerM,
    intensityToInstallAmp,
    voltageDropPercent,
    voltageDropMessage,
  };
};
