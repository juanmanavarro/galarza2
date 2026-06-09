import { expect, test } from "@playwright/test";

const unlockApp = async (page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("galarza2-auth-unlocked", "true");
    window.localStorage.removeItem("galarza2-config-state");
  });
  await page.goto("/");
};

test.describe("power and intensity inputs", () => {
  test.beforeEach(async ({ page }) => {
    await unlockApp(page);
  });

  test("converts CV to kW in Maxima potencia por maquina", async ({ page }) => {
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_cv"]').fill("10");

    await expect(page.locator('input[name="max_simultaneous_power_kw"]')).toHaveValue("7.36");
    await expect(page.locator('input[name="max_simultaneous_power_amp"]')).not.toHaveValue("");
  });

  test("converts kW to CV in Maxima potencia por maquina", async ({ page }) => {
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_kw"]').fill("7.355");

    await expect(page.locator('input[name="max_simultaneous_power_cv"]')).toHaveValue("10");
    await expect(page.locator('input[name="max_simultaneous_power_amp"]')).not.toHaveValue("");
  });

  test("uses direct amps in simultaneous mode with one machine", async ({ page }) => {
    await page.locator('input[name="number_and_type_of_machines_to_feed"]').fill("1");
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_amp"]').fill("100");

    await expect(page.locator('input[name="max_simultaneous_power_cv"]')).toHaveValue("");
    await expect(page.locator('input[name="max_simultaneous_power_kw"]')).toHaveValue("");
    await expect(page.locator("#intensityToInstall")).toHaveValue("100");
    await expect(page.locator("#lmModelRef")).toHaveValue("LM100");
  });

  test("uses direct amps in simultaneous mode with two machines", async ({ page }) => {
    await page.locator('input[name="number_and_type_of_machines_to_feed"]').fill("2");
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_amp"]').fill("100");

    await expect(page.locator('input[name="max_simultaneous_power_cv"]')).toHaveValue("");
    await expect(page.locator('input[name="max_simultaneous_power_kw"]')).toHaveValue("");
    await expect(page.locator("#intensityToInstall")).toHaveValue("140");
    await expect(page.locator("#lmModelRef")).toHaveValue("LM140");
  });

  test("uses direct amps in Por grua mode", async ({ page }) => {
    await page.locator('input[name="power_mode"][value="por_grua"]').check();
    await page.locator('input[name="main_lift_amp_1"]').fill("100");

    await expect(page.locator('input[name="main_lift_cv_1"]')).toHaveValue("");
    await expect(page.locator('input[name="main_lift_kw_1"]')).toHaveValue("");
    await expect(page.locator("#intensityToInstall")).toHaveValue("100");
    await expect(page.locator("#lmModelRef")).toHaveValue("LM100");
  });

  test("does not treat calculated amps from CV as manual amps", async ({ page }) => {
    await page.locator('input[name="power_mode"][value="por_grua"]').check();
    await page.locator('input[name="main_lift_cv_1"]').fill("10");

    await expect(page.locator('input[name="main_lift_kw_1"]')).toHaveValue("7.36");
    await expect(page.locator('input[name="main_lift_amp_1"]')).not.toHaveValue("");
    await expect(page.locator("#totalPowerWatts")).toHaveValue("5888");
  });

  test("shows technical consultation instead of automatic calculation from 280 meters", async ({ page }) => {
    await page.locator('input[name="total_distance"]').fill("280");

    await expect(
      page.getByText("Esta configuración requiere consulta con el servicio técnico de IGA.")
    ).toBeVisible();
    await expect(page.locator("#totalPowerWatts")).toHaveCount(0);
  });

  test("shows explicit environmental yes/no fields without humidity option", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Hay polvo *" })).toBeVisible();
    await expect(page.locator('input[name="has_dust"][value="0"]')).toBeChecked();
    await expect(page.locator('input[name="has_dust"][value="1"]')).not.toBeChecked();
    await expect(page.getByRole("heading", { name: "Hay elementos corrosivos *" })).toBeVisible();
    await expect(page.locator('input[name="has_corrosive_elements"][value="0"]')).toBeChecked();
    await expect(page.locator('input[name="has_corrosive_elements"][value="1"]')).not.toBeChecked();
    await expect(page.getByText("Humedad")).toHaveCount(0);
  });

  test("shows technical consultation for corrosive elements", async ({ page }) => {
    await page.locator('input[name="has_corrosive_elements"][value="1"]').check();

    await expect(
      page.getByText("Esta configuración requiere consulta con el servicio técnico de IGA.")
    ).toBeVisible();
    await expect(page.locator("#totalPowerWatts")).toHaveCount(0);
  });

  test("does not show technical consultation at 279 meters", async ({ page }) => {
    await page.locator('input[name="total_distance"]').fill("279");

    await expect(
      page.getByText("Esta configuración requiere consulta con el servicio técnico de IGA.")
    ).toHaveCount(0);
  });

  test("shows straight-line exterior calculations with exterior references", async ({ page }) => {
    await page.locator('input[name="total_distance"]').fill("10");
    await page.locator('input[name="work_environment"][value="Exterior"]').check();
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_amp"]').fill("50");

    await expect(page.locator("#totalPowerWatts")).toBeVisible();
    await expect(page.locator("#intensityToInstall")).toHaveValue("60");
    await expect(page.locator("#lmModelRef")).toHaveValue("LM60E");
    await expect(page.locator("#alimentacionExtremaRef")).toHaveValue("AE-4E");
    await expect(page.getByText("Soportes (SO4E)")).toBeVisible();
    await expect(page.getByText("Empalmes (EMP4E)")).toBeVisible();
    await expect(page.getByText("Punto Fijo (PF-4E)")).toBeVisible();
    await expect(page.getByText("Tapa Extrema (TE-4E)")).toBeVisible();
    await expect(page.getByText("SU-500-1-INOX")).toBeVisible();
    await expect(page.locator(".grua-summary-item").first().locator("input").first()).toHaveValue("TO-4x70AE");
    await expect(page.locator(".grua-summary-item").first().locator("input").nth(1)).toHaveValue("BA-70E");
  });

  test("sends configuration with calculated result and materials breakdown", async ({ page }) => {
    await page.route("**/mail.php", async (route) => {
      await route.fulfill({ status: 200, body: "ok" });
    });

    await page.locator('input[name="application_industry_type"]').fill("Nave industrial");
    await page.locator('input[name="total_distance"]').fill("10");
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_amp"]').fill("50");

    const requestPromise = page.waitForRequest("**/mail.php");
    await page.locator("footer").getByRole("button", { name: "Enviar" }).click();
    await page.locator('input[name="send_name"]').fill("Cliente Test");
    await page.locator('input[name="send_location"]').fill("Gipuzkoa / ES");
    await page.locator('input[name="send_email"]').fill("cliente@example.com");
    await page.locator("#sendModal").getByRole("button", { name: "Enviar" }).click();

    const request = await requestPromise;
    const payload = JSON.parse(request.postData() || "{}");

    expect(payload).toMatchObject({
      name: "Cliente Test",
      location: "Gipuzkoa / ES",
      email: "cliente@example.com",
      config: {
        application_industry_type: "Nave industrial",
        max_simultaneous_power_amp: 50,
      },
      result: {
        technicalConsultationRequired: false,
        totalPowerAmps: 40,
        intensityToInstallAmp: 60,
        lmModelRef: "LM60",
      },
    });
    expect(payload.result.totalPowerWatts).toBe(0);
    expect(payload.result.voltageDropPercent).toBeGreaterThan(0);
    expect(payload.materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: "resultado",
          reference: "LM60",
          quantity: 10,
          unit: "m",
          description: "Línea conductora LM",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "SO-4",
          quantity: 5,
          unit: "ud",
          description: "Soportes",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "EMP-4",
          quantity: 2,
          unit: "ud",
          description: "Empalmes",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "AE-4",
          quantity: 1,
          unit: "ud",
          description: "Alimentación extrema",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "PF-4",
          quantity: 1,
          unit: "ud",
          description: "Punto fijo",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "TE-4",
          quantity: 1,
          unit: "ud",
          description: "Tapa extrema",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "SU-500-1",
          quantity: 6,
          unit: "ud",
          description: "Soportes universales",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "TO-4x70A",
          quantity: 1,
          unit: "ud",
          description: "Tomacorrientes grua 1",
        }),
        expect.objectContaining({
          section: "resultado",
          reference: "BA-70",
          quantity: 1,
          unit: "ud",
          description: "Brazo arrastre grua 1",
        }),
      ])
    );
  });
});
