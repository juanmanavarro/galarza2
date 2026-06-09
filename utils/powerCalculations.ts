export const DEFAULT_NOMINAL_VOLTAGE = 380;
export const INTENSITY_FORMULA_COEFFICIENT = 1.386;

export const calculateIntensityFromKw = (
  kw: number,
  voltage = DEFAULT_NOMINAL_VOLTAGE
) => {
  if (!Number.isFinite(kw) || !Number.isFinite(voltage) || voltage <= 0) {
    return 0;
  }

  return Number(((kw * 1000) / (INTENSITY_FORMULA_COEFFICIENT * voltage)).toFixed(2));
};
