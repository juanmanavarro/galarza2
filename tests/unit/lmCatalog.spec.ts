import { describe, expect, it } from "vitest";
import {
  CONSULT_TECHNICAL_MESSAGE,
  calculateVoltageDropPercent,
  calculateVoltageDropVolts,
  getEmpalmesEMP4IntermediaCount,
  getEmpalmesEMP4LineCount,
  getExtremeFeedingRef,
  getImpedanceOhmPerM,
  getIntermediateFeedingRef,
  getSupportsSO4Count,
  isVoltageDropAccepted,
  requiresTechnicalConsultation,
  selectIntensityToInstall,
} from "../../utils/lmCatalog";

const baseTechnicalConsultationInput = {
  totalDistance: 80,
  hasCorrosiveElements: "0",
  hasMixedIndoorOutdoorSections: "0",
  workEnvironment: "Interior",
  minTemperature: null,
  maxTemperature: null,
  amperage: 100,
  hasSectionedZones: "0",
};

describe("LM model selection", () => {
  it.each([
    [0, 40],
    [39.99, 40],
    [40, 60],
    [59.99, 60],
    [60, 80],
    [79.99, 80],
    [80, 100],
    [99.99, 100],
    [100, 140],
    [139.99, 140],
    [140, 160],
    [159.99, 160],
    [160, 200],
    [199.99, 200],
  ])("selects the first superior LM model for %s A", (nominalIntensity, expectedModel) => {
    expect(selectIntensityToInstall(nominalIntensity)).toBe(expectedModel);
  });

  it("requires technical consultation above LM200", () => {
    expect(selectIntensityToInstall(200.01)).toBe(CONSULT_TECHNICAL_MESSAGE);
  });

  it("ignores non-finite nominal intensities", () => {
    expect(selectIntensityToInstall(Number.NaN)).toBeNull();
  });
});

describe("voltage drop coefficients", () => {
  it("uses the documented coefficient for each LM model", () => {
    expect(getImpedanceOhmPerM(40)).toBe(0.00346);
    expect(getImpedanceOhmPerM(60)).toBe(0.00303);
    expect(getImpedanceOhmPerM(80)).toBe(0.00204);
    expect(getImpedanceOhmPerM(100)).toBe(0.00173);
    expect(getImpedanceOhmPerM(140)).toBe(0.00123);
    expect(getImpedanceOhmPerM(160)).toBe(0.00105);
    expect(getImpedanceOhmPerM(200)).toBe(0.0009);
  });

  it("calculates voltage drop with the selected LM coefficient", () => {
    expect(
      calculateVoltageDropVolts({
        intensityNominal: 100,
        lengthMeters: 80,
        intensityToInstall: 140,
      })
    ).toBeCloseTo(Math.sqrt(3) * 100 * 80 * 0.00123);
  });

  it("calculates and classifies accepted and rejected voltage drop percentages", () => {
    const accepted = calculateVoltageDropPercent({ dropVolts: 10, nominalVoltage: 400 });
    const rejected = calculateVoltageDropPercent({ dropVolts: 12, nominalVoltage: 400 });

    expect(accepted).toBe(2.5);
    expect(rejected).toBe(3);
    expect(isVoltageDropAccepted(accepted)).toBe(true);
    expect(isVoltageDropAccepted(rejected)).toBe(false);
  });
});

describe("support counts", () => {
  it("uses L/2 for interior LM40 to LM100", () => {
    expect(getSupportsSO4Count(100, 80, "Interior")).toBe(40);
  });

  it("uses L/1.333 for interior LM140 to LM200", () => {
    expect(getSupportsSO4Count(140, 80, "Interior")).toBe(Math.ceil(80 / 1.333));
  });

  it("uses L/1.333 for exterior LM40E to LM140E", () => {
    expect(getSupportsSO4Count(140, 80, "Exterior")).toBe(Math.ceil(80 / 1.333));
  });

  it("uses L/1.0 for exterior LM160E and LM200E", () => {
    expect(getSupportsSO4Count(160, 80, "Exterior")).toBe(80);
  });
});

describe("feeding references", () => {
  it("keeps interior feeding references without exterior suffix", () => {
    expect(getExtremeFeedingRef(60, "Interior")).toBe("AE-4");
    expect(getIntermediateFeedingRef(100, "Interior")).toBe("AI-4-100");
  });

  it("adds exterior suffix to extreme and intermediate feeding references", () => {
    expect(getExtremeFeedingRef(60, "Exterior")).toBe("AE-4E");
    expect(getExtremeFeedingRef(100, "Exterior")).toBe("AE-4-100E");
    expect(getExtremeFeedingRef(140, "Exterior")).toBe("AE-4-140E");
    expect(getIntermediateFeedingRef(60, "Exterior")).toBe("AI-4E");
    expect(getIntermediateFeedingRef(100, "Exterior")).toBe("AI-4-100E");
    expect(getIntermediateFeedingRef(140, "Exterior")).toBe("AI-4-140E");
  });
});

describe("splice counts", () => {
  it("subtracts one for extreme feeding when L/4 is exact", () => {
    expect(getEmpalmesEMP4LineCount(40, "extreme")).toBe(9);
  });

  it("uses floor(L/4) for extreme feeding when L/4 is not exact", () => {
    expect(getEmpalmesEMP4LineCount(42, "extreme")).toBe(10);
  });

  it("applies central intermediate feeding deductions", () => {
    expect(getEmpalmesEMP4LineCount(40, "central")).toBe(8);
    expect(getEmpalmesEMP4LineCount(42, "central")).toBe(9);
  });

  it("applies M-meter intermediate feeding deductions", () => {
    expect(getEmpalmesEMP4LineCount(40, "distance")).toBe(8);
    expect(getEmpalmesEMP4LineCount(42, "distance")).toBe(9);
  });

  it("applies 1/6 double intermediate feeding deductions", () => {
    expect(getEmpalmesEMP4IntermediaCount(40, "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6")).toBe(7);
    expect(getEmpalmesEMP4IntermediaCount(42, "ALIMENTACIÓN A 1/6 DE CADA EXTREMO = L/6")).toBe(8);
  });
});

describe("technical consultation conditions", () => {
  it("does not require consultation for a standard interior configuration", () => {
    expect(requiresTechnicalConsultation(baseTechnicalConsultationInput)).toBe(false);
  });

  it("does not require consultation at accepted business-rule limits", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, totalDistance: 279 })).toBe(false);
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, minTemperature: -10 })).toBe(false);
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, maxTemperature: 50 })).toBe(false);
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, amperage: 200 })).toBe(false);
    expect(
      requiresTechnicalConsultation({
        ...baseTechnicalConsultationInput,
        workEnvironment: "Exterior",
        minTemperature: -30,
        maxTemperature: 60,
      })
    ).toBe(false);
  });

  it("requires consultation from 280 meters", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, totalDistance: 280 })).toBe(true);
  });

  it("requires consultation for corrosive environments", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, hasCorrosiveElements: "1" })).toBe(true);
  });

  it("requires consultation for mixed indoor and outdoor sections", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, hasMixedIndoorOutdoorSections: "1" })).toBe(true);
  });

  it("requires consultation when interior temperature is outside -10 to 50 degrees", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, minTemperature: -11 })).toBe(true);
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, maxTemperature: 51 })).toBe(true);
  });

  it("requires consultation when exterior temperature is outside -30 to 60 degrees", () => {
    expect(
      requiresTechnicalConsultation({
        ...baseTechnicalConsultationInput,
        workEnvironment: "Exterior",
        minTemperature: -31,
      })
    ).toBe(true);
    expect(
      requiresTechnicalConsultation({
        ...baseTechnicalConsultationInput,
        workEnvironment: "Exterior",
        maxTemperature: 61,
      })
    ).toBe(true);
  });

  it("requires consultation above 200 amps", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, amperage: 201 })).toBe(true);
  });

  it("requires consultation for funnels or sectioned zones", () => {
    expect(requiresTechnicalConsultation({ ...baseTechnicalConsultationInput, hasSectionedZones: "1" })).toBe(true);
  });
});
