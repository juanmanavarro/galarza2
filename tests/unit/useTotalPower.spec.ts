import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useTotalPower } from "../../composables/useTotalPower";

const createFormState = (overrides = {}) => ({
  max_simultaneous_power_kw: null,
  max_simultaneous_power_amp: null,
  power_mode: "simultanea",
  voltage: 380,
  ...overrides,
});

describe("useTotalPower", () => {
  it("uses manual amps directly and applies one-machine 0.8 factor", () => {
    const formState = createFormState({
      max_simultaneous_power_amp: 100,
    });
    const gruas = ref([]);
    const gruasCount = ref(1);

    const { totalPowerWatts, totalPowerAmps } = useTotalPower(formState, gruas, gruasCount);

    expect(totalPowerWatts.value).toBe(0);
    expect(totalPowerAmps.value).toBe(80);
  });

  it("uses manual amps directly and applies per-machine plus global 0.8 factors", () => {
    const formState = createFormState({
      max_simultaneous_power_amp: 100,
    });
    const gruas = ref([]);
    const gruasCount = ref(2);

    const { totalPowerWatts, totalPowerAmps } = useTotalPower(formState, gruas, gruasCount);

    expect(totalPowerWatts.value).toBe(0);
    expect(totalPowerAmps.value).toBe(128);
  });

  it("does not double-count calculated amps when kw is present", () => {
    const formState = createFormState({ power_mode: "por_grua" });
    const gruas = ref([
      {
        servicios: {
          "Elevacion principal": { kw: 7.36, amp: 13.99 },
        },
      },
    ]);
    const gruasCount = ref(1);

    const { totalPowerWatts, totalPowerAmps } = useTotalPower(formState, gruas, gruasCount);

    expect(totalPowerWatts.value).toBe(5888);
    expect(totalPowerAmps.value).toBe(11.18);
  });
});
