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

    expect(tomacorrientesByGrua.value).toEqual(["TO-4x70A + TO-4x35A"]);
    expect(brazoArrastreByGrua.value).toEqual(["BA-70 + BA-4"]);
  });

  it("uses exterior outlet and tow arm references", () => {
    const { tomacorrientesByGrua, brazoArrastreByGrua } = useGruaAccessories(
      createFormState("Exterior"),
      createGruas()
    );

    expect(tomacorrientesByGrua.value).toEqual(["TO-4x70AE + TO-4x35AE"]);
    expect(brazoArrastreByGrua.value).toEqual(["BA-70E + BA-4E"]);
  });

  it.each([
    [35, "TO-4x35A", "BA-4"],
    [70, "TO-4x70A", "BA-70"],
    [105, "TO-4x70A + TO-4x35A", "BA-70 + BA-4"],
    [140, "2 TO-4x70A", "2 BA-70"],
  ])("includes exact intensity %s A in the lower outlet and tow arm range", (amps, outlet, arm) => {
    const formState = createFormState("Interior");
    formState.max_simultaneous_power_amp = amps;

    const { tomacorrientesByGrua, brazoArrastreByGrua } = useGruaAccessories(
      formState,
      createGruas()
    );

    expect(tomacorrientesByGrua.value).toEqual([outlet]);
    expect(brazoArrastreByGrua.value).toEqual([arm]);
  });

  it("uses each crane individual intensity instead of the selected LM model", () => {
    const formState = createFormState("Exterior");
    formState.max_simultaneous_power_amp = null;
    formState.power_mode = "instalada";
    const gruas = ref([
      {
        servicios: {
          "Elevación principal": { kw: null, amp: 35 },
        },
      },
      {
        servicios: {
          "Elevación principal": { kw: null, amp: 140 },
        },
      },
    ]);

    const { tomacorrientesByGrua, brazoArrastreByGrua } = useGruaAccessories(formState, gruas);

    expect(tomacorrientesByGrua.value).toEqual(["TO-4x35AE", "2 TO-4x70AE"]);
    expect(brazoArrastreByGrua.value).toEqual(["BA-4E", "2 BA-70E"]);
  });
});
