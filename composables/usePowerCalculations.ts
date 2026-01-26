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
  const convertCvToKw = (value: number) => Number((value * 1.36).toFixed(2));
  const convertKwToCv = (value: number) => Number((value * 0.73).toFixed(2));
  const calculateAmp = (kw: number) =>
    Number(((kw * 1000) / (Math.sqrt(3) * 380 * 0.8)).toFixed(2));

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

  const handleGroupInput = (group: PowerGroup, source: "cv" | "kw") => {
    const raw = source === "cv" ? group.cv : group.kw;
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      if (source === "cv") {
        group.kw = null;
      } else {
        group.cv = null;
      }
      group.amp = null;
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

    group.cv = convertKwToCv(value);
    group.amp = calculateAmp(value);
  };

  return {
    handleCvInput,
    handleKwInput,
    handleGroupInput,
  };
};
