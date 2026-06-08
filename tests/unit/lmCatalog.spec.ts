import { describe, expect, it } from "vitest";
import {
  getEmpalmesEMP4IntermediaCount,
  getEmpalmesEMP4LineCount,
  getSupportsSO4Count,
} from "../../utils/lmCatalog";

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
