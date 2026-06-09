import { computed } from "vue";
import {
  calculateVoltageDropPercent,
  calculateVoltageDropVolts,
  getEffectiveVoltageDropLength,
  getImpedanceOhmPerM,
  getVoltageDropOfferMessage,
  selectIntensityToInstall,
} from "../utils/lmCatalog";

type FormState = {
  total_distance: number | null;
  voltage: number | null;
  max_permissible_voltage_drop: number | null;
  feeding_point_position: string;
  feeding_point_position_distance: number | null;
};

export const useVoltageDrop = (
  formState: FormState,
  totalPowerAmps: { value: number }
) => {
  const intensityToInstallAmp = computed(() => selectIntensityToInstall(Number(totalPowerAmps.value)));
  const impedanceOhmPerM = computed(() => getImpedanceOhmPerM(intensityToInstallAmp.value));
  const effectiveVoltageDropLength = computed(() =>
    getEffectiveVoltageDropLength({
      totalDistance: Number(formState.total_distance),
      feedingPointPosition: formState.feeding_point_position,
      feedingPointPositionDistance: formState.feeding_point_position_distance,
    })
  );
  const voltageDropVolts = computed(() =>
    calculateVoltageDropVolts({
      intensityNominal: Number(totalPowerAmps.value),
      lengthMeters: Number(effectiveVoltageDropLength.value),
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
    getVoltageDropOfferMessage(
      voltageDropPercent.value,
      "VER OPCIONES 1 Y 2",
      Number(formState.max_permissible_voltage_drop)
    )
  );

  return {
    voltageDropVolts,
    impedanceOhmPerM,
    intensityToInstallAmp,
    voltageDropPercent,
    voltageDropMessage,
  };
};
