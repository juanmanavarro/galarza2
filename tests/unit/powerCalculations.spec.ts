import { describe, expect, it } from "vitest";
import { calculateIntensityFromKw } from "../../utils/powerCalculations";

describe("power calculations", () => {
  it("calculates intensity from kW with the documented coefficient", () => {
    expect(calculateIntensityFromKw(7.355)).toBe(13.96);
    expect(calculateIntensityFromKw(7.36)).toBe(13.97);
  });

  it("uses the provided voltage in the intensity formula", () => {
    expect(calculateIntensityFromKw(8, 400)).toBe(14.43);
  });
});
