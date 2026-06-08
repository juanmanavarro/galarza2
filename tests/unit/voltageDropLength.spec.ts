import { describe, expect, it } from "vitest";
import { useLineCalculations } from "../../composables/useLineCalculations";
import { useVoltageDrop } from "../../composables/useVoltageDrop";
import { getEffectiveVoltageDropLength } from "../../utils/lmCatalog";

const createFormState = (overrides = {}) => ({
  total_distance: 120,
  voltage: 380,
  feeding_point_position: "extreme",
  feeding_point_position_distance: null,
  ...overrides,
});

describe("voltage drop length by feeding type", () => {
  it("uses L for extreme feeding", () => {
    expect(
      getEffectiveVoltageDropLength({
        totalDistance: 120,
        feedingPointPosition: "extreme",
      })
    ).toBe(120);
  });

  it("uses L/2 for central intermediate feeding", () => {
    expect(
      getEffectiveVoltageDropLength({
        totalDistance: 120,
        feedingPointPosition: "central",
      })
    ).toBe(60);
  });

  it("uses the longest section for intermediate feeding at M meters", () => {
    expect(
      getEffectiveVoltageDropLength({
        totalDistance: 120,
        feedingPointPosition: "distance",
        feedingPointPositionDistance: 40,
      })
    ).toBe(80);
    expect(
      getEffectiveVoltageDropLength({
        totalDistance: 120,
        feedingPointPosition: "distance",
        feedingPointPositionDistance: 90,
      })
    ).toBe(90);
  });

  it("applies the effective length to the main voltage drop", () => {
    const totalPowerAmps = { value: 100 };
    const extreme = useVoltageDrop(createFormState(), totalPowerAmps);
    const central = useVoltageDrop(
      createFormState({ feeding_point_position: "central" }),
      totalPowerAmps
    );
    const distance = useVoltageDrop(
      createFormState({
        feeding_point_position: "distance",
        feeding_point_position_distance: 40,
      }),
      totalPowerAmps
    );

    expect(central.voltageDropVolts.value).toBe((extreme.voltageDropVolts.value as number) / 2);
    expect(distance.voltageDropVolts.value).toBeCloseTo((extreme.voltageDropVolts.value as number) * (80 / 120));
  });
});

describe("voltage drop feeding alternatives", () => {
  it("recommends central feeding after an extreme-feeding failure", () => {
    const { recommendedFeedingType, selectedFeedingLengthMeters } = useLineCalculations(
      createFormState({ total_distance: 80, feeding_point_position: "extreme" }),
      { value: 100 }
    );

    expect(recommendedFeedingType.value).toBe("ALIMENTACIÓN CENTRAL = L/2");
    expect(selectedFeedingLengthMeters.value).toBe(40);
  });

  it("recommends L/6 only after a central-feeding failure", () => {
    const { recommendedFeedingType, selectedFeedingLengthMeters } = useLineCalculations(
      createFormState({ total_distance: 260, feeding_point_position: "central" }),
      { value: 100 }
    );

    expect(recommendedFeedingType.value).toBe("ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6");
    expect(selectedFeedingLengthMeters.value).toBeCloseTo(260 / 6);
  });

  it("does not recommend L/6 as a normal M-meter feeding alternative", () => {
    const { recommendedFeedingType, selectedFeedingLengthMeters } = useLineCalculations(
      createFormState({
        total_distance: 260,
        feeding_point_position: "distance",
        feeding_point_position_distance: 90,
      }),
      { value: 100 }
    );

    expect(recommendedFeedingType.value).toBeNull();
    expect(selectedFeedingLengthMeters.value).toBeNull();
  });
});
