import { computed } from "vue";
import {
  getEmpalmesEMP4LineCount,
  getExtremeFeedingRef,
  getSupportsSO4Count,
} from "../utils/lmCatalog";

type FormState = {
  total_distance: number | null;
};

export const useSupports = (
  formState: FormState,
  intensityToInstallAmp: { value: number | string | null }
) => {
  const supportsSO4 = computed(() => {
    const lengthMeters = Number(formState.total_distance);
    if (!Number.isFinite(lengthMeters) || lengthMeters <= 0) {
      return null;
    }
    return getSupportsSO4Count(intensityToInstallAmp.value, lengthMeters);
  });

  const alimentacionExtremaRef = computed(() => getExtremeFeedingRef(intensityToInstallAmp.value));

  return {
    supportsSO4,
    empalmesEMP4: computed(() => {
      const lengthMeters = Number(formState.total_distance);
      return getEmpalmesEMP4LineCount(lengthMeters);
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
