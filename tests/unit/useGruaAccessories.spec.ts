import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useGruaAccessories } from "../../composables/useGruaAccessories";

const createFormState = (workEnvironment = "Interior") => ({
  max_simultaneous_power_kw: null,
  max_simultaneous_power_amp: 100,
  power_mode: "simultanea",
  voltage: 380,
  work_environment: workEnvironment,
});

const createGruas = () => ref([{ servicios: {} }]);

describe("crane accessories", () => {
  it("keeps interior outlet and tow arm references", () => {
    const { tomacorrientesByGrua, brazoArrastreByGrua } = useGruaAccessories(
      createFormState("Interior"),
      createGruas()
    );

    expect(tomacorrientesByGrua.value).toEqual(["2  TO-4x70A"]);
    expect(brazoArrastreByGrua.value).toEqual(["2 BA-70"]);
  });

  it("uses exterior outlet and tow arm references", () => {
    const { tomacorrientesByGrua, brazoArrastreByGrua } = useGruaAccessories(
      createFormState("Exterior"),
      createGruas()
    );

    expect(tomacorrientesByGrua.value).toEqual(["2  TO-4x70AE"]);
    expect(brazoArrastreByGrua.value).toEqual(["2 BA-70E"]);
  });
});
