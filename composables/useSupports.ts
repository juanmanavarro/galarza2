import { computed } from "vue";

type FormState = {
  total_distance: number | null;
};

export const useSupports = (
  formState: FormState,
  intensityToInstallAmp: { value: number | string | null }
) => {
  const supportsSO4 = computed(() => {
    const intensity = intensityToInstallAmp.value;
    const lengthMeters = Number(formState.total_distance);

    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      return null;
    }
    if (typeof intensity !== "number" || !Number.isFinite(intensity)) {
      return null;
    }

    let supportsRaw = 0;
    if (intensity < 101) {
      supportsRaw = lengthMeters / 2;
    } else if (intensity > 102) {
      supportsRaw = lengthMeters * (3 / 4);
    } else {
      supportsRaw = 0;
    }

    return Math.ceil(supportsRaw);
  });

  const alimentacionExtremaRef = computed(() => {
    const intensity = intensityToInstallAmp.value;
    if (typeof intensity !== "number" || !Number.isFinite(intensity)) {
      return null;
    }
    if (intensity < 70) {
      return "AE-4";
    }
    if (intensity < 110) {
      return "AE-4-100";
    }
    if (intensity < 150) {
      return "AE-4-140";
    }
    return "Elegir según cable (desplegar abajo):";
  });

  return {
    supportsSO4,
    empalmesEMP4: computed(() => {
      const lengthMeters = Number(formState.total_distance);
      if (!Number.isFinite(lengthMeters)) {
        return null;
      }
      const empalmesRaw = lengthMeters / 4 - 1;
      return Math.ceil(empalmesRaw);
    }),
    alimentacionExtremaRef,
    su5001: computed(() => {
      const supports = supportsSO4.value;
      if (!Number.isFinite(supports)) {
        return null;
      }
      return supports + 1;
    }),
  };
};
