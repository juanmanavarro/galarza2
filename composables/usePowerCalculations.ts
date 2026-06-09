import { calculateIntensityFromKw } from "../utils/powerCalculations";

type PowerGroup = {
  cv: number | null;
  kw: number | null;
  amp: number | null;
};

export const usePowerCalculations = (formState: {
  max_simultaneous_power_cv: number | null;
  max_simultaneous_power_kw: number | null;
  max_simultaneous_power_amp: number | null;
}) => {
  const CV_TO_KW = 0.7355;
  const convertCvToKw = (value: number) => Number((value * CV_TO_KW).toFixed(2));
  const convertKwToCv = (value: number) => Number((value / CV_TO_KW).toFixed(2));
  const calculateAmp = (kw: number) => calculateIntensityFromKw(kw);

  const handleCvInput = (event: Event) => {
    const raw = (event.target as HTMLInputElement | null)?.value ?? "";
    if (raw.trim() === "") {
      formState.max_simultaneous_power_kw = null;
      formState.max_simultaneous_power_amp = null;
      return;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }

    const kw = convertCvToKw(value);
    formState.max_simultaneous_power_kw = kw;
    formState.max_simultaneous_power_amp = calculateAmp(kw);
  };

  const handleKwInput = (event: Event) => {
    const raw = (event.target as HTMLInputElement | null)?.value ?? "";
    if (raw.trim() === "") {
      formState.max_simultaneous_power_cv = null;
      formState.max_simultaneous_power_amp = null;
      return;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }

    formState.max_simultaneous_power_cv = convertKwToCv(value);
    formState.max_simultaneous_power_amp = calculateAmp(value);
  };

  const handleAmpInput = (event: Event) => {
    const raw = (event.target as HTMLInputElement | null)?.value ?? "";
    if (raw.trim() === "") {
      return;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }

    formState.max_simultaneous_power_cv = null;
    formState.max_simultaneous_power_kw = null;
  };

  const handleGroupInput = (group: PowerGroup, source: "cv" | "kw" | "amp") => {
    const raw = group[source];
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      if (source === "cv") {
        group.kw = null;
        group.amp = null;
      } else {
        group.cv = null;
        if (source === "kw") {
          group.amp = null;
        } else {
          group.kw = null;
        }
      }
      return;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }

    if (source === "cv") {
      const kw = convertCvToKw(value);
      group.kw = kw;
      group.amp = calculateAmp(kw);
      return;
    }

    if (source === "amp") {
      group.cv = null;
      group.kw = null;
      return;
    }

    group.cv = convertKwToCv(value);
    group.amp = calculateAmp(value);
  };

  return {
    handleCvInput,
    handleKwInput,
    handleAmpInput,
    handleGroupInput,
  };
};
