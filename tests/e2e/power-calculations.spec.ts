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
  });

  test("uses direct amps in simultaneous mode with two machines", async ({ page }) => {
    await page.locator('input[name="number_and_type_of_machines_to_feed"]').fill("2");
    await page.locator('input[name="power_mode"][value="simultanea"]').check();
    await page.locator('input[name="max_simultaneous_power_amp"]').fill("100");

    await expect(page.locator('input[name="max_simultaneous_power_cv"]')).toHaveValue("");
    await expect(page.locator('input[name="max_simultaneous_power_kw"]')).toHaveValue("");
    await expect(page.locator("#intensityToInstall")).toHaveValue("140");
  });

  test("uses direct amps in Por grua mode", async ({ page }) => {
    await page.locator('input[name="power_mode"][value="por_grua"]').check();
    await page.locator('input[name="main_lift_amp_1"]').fill("100");

    await expect(page.locator('input[name="main_lift_cv_1"]')).toHaveValue("");
    await expect(page.locator('input[name="main_lift_kw_1"]')).toHaveValue("");
    await expect(page.locator("#intensityToInstall")).toHaveValue("100");
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

  test("does not show technical consultation at 279 meters", async ({ page }) => {
    await page.locator('input[name="total_distance"]').fill("279");

    await expect(
      page.getByText("Esta configuración requiere consulta con el servicio técnico de IGA.")
    ).toHaveCount(0);
  });
});
