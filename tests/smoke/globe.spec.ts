import {
  expect,
  test,
  type Page,
  type Response,
} from "@playwright/test";

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
}

async function expectGlobeReady(page: Page) {
  await expect(page.getByRole("status")).toHaveText(
    "地球已就绪",
    { timeout: 15_000 },
  );
  await expect(
    page.locator("canvas.maplibregl-canvas"),
  ).toBeVisible();
}

async function expectPartialPmtilesResponse(response: Response) {
  expect(response.status()).toBe(206);
  expect(response.headers()["accept-ranges"]).toBe("bytes");
  expect(response.headers()["content-range"]).toMatch(
    /^bytes \d+-\d+\/\d+$/,
  );
}

function expectSecurityHeaders(response: Response) {
  const headers = response.headers();
  const csp = headers["content-security-policy"];

  expect(csp).toContain("worker-src 'self'");
  expect(csp).not.toMatch(/worker-src[^;]*blob:/);
  expect(csp).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
}

test("desktop production globe uses same-origin CSP worker and PMTiles", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  const workerResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(
        "/vendor/maplibre-gl-csp-worker.js",
      ),
  );
  const pmtilesResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/maps/geomuse-basemap.pmtiles") &&
      response.status() === 206,
  );

  const documentResponse = await page.goto("/");
  expect(documentResponse).not.toBeNull();
  if (documentResponse) {
    expectSecurityHeaders(documentResponse);
  }

  await expectGlobeReady(page);
  const resolvedWorkerResponse = await workerResponse;
  expect(resolvedWorkerResponse.status()).toBe(200);
  expect(
    resolvedWorkerResponse.headers()["content-type"],
  ).toMatch(/javascript/);
  await expectPartialPmtilesResponse(await pmtilesResponse);
  await expect(
    page.getByRole("button", { name: "复位视角" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "图层" }),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("camera and layer state survive a production reload", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?ref=smoke");
  await expectGlobeReady(page);

  const canvas = page.locator("canvas.maplibregl-canvas");
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  if (!canvasBox) {
    return;
  }

  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 180, centerY + 60, {
    steps: 6,
  });
  await page.mouse.up();
  await page.mouse.wheel(0, -900);

  await expect
    .poll(() => {
      const url = new URL(page.url());
      return url.searchParams.has("gm-view");
    })
    .toBe(true);

  await page.getByRole("button", { name: "图层" }).click();
  const water = page.getByRole("checkbox", {
    name: /^水系/,
  });
  await water.uncheck();

  await expect
    .poll(
      () =>
        new URL(page.url()).searchParams.get("gm-hidden"),
    )
    .toBe("water");
  expect(new URL(page.url()).searchParams.get("ref")).toBe(
    "smoke",
  );

  await page.reload();
  await expectGlobeReady(page);
  await page.getByRole("button", { name: "图层" }).click();
  await expect(water).not.toBeChecked();

  await water.check();
  await page
    .getByRole("button", { name: "复位视角" })
    .click();

  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        view: url.searchParams.has("gm-view"),
        hidden: url.searchParams.has("gm-hidden"),
        ref: url.searchParams.get("ref"),
      };
    })
    .toEqual({
      view: false,
      hidden: false,
      ref: "smoke",
    });
  expect(runtimeErrors).toEqual([]);
});

test("mobile share state restores without control overlap", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/?gm-view=1,121.47,31.23,2.2,0,0&gm-hidden=graticule",
  );
  await expectGlobeReady(page);

  await page.getByRole("button", { name: "图层" }).click();
  await expect(
    page.getByRole("checkbox", { name: /^经纬网/ }),
  ).not.toBeChecked();

  const panel = await page
    .locator(".globe-layer-panel")
    .boundingBox();
  const controls = await page
    .getByLabel("地球控制")
    .boundingBox();
  const attribution = await page
    .locator(".maplibregl-ctrl-attrib")
    .boundingBox();

  expect(panel).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(attribution).not.toBeNull();

  if (panel && controls && attribution) {
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(390);
    expect(controls.y + controls.height).toBeLessThanOrEqual(
      attribution.y,
    );
  }

  expect(runtimeErrors).toEqual([]);
});
