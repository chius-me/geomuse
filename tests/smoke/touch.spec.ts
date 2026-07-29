import {
  expect,
  test,
  type CDPSession,
  type Page,
} from "@playwright/test";

type TouchPoint = {
  id: number;
  x: number;
  y: number;
};

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

function readSharedZoom(url: string): number | null {
  const value = new URL(url).searchParams.get("gm-view");

  if (!value) {
    return null;
  }

  const zoom = Number(value.split(",")[3]);
  return Number.isFinite(zoom) ? zoom : null;
}

async function dispatchTouchGesture(
  cdp: CDPSession,
  page: Page,
  from: readonly TouchPoint[],
  to: readonly TouchPoint[],
) {
  expect(from).toHaveLength(to.length);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [...from],
  });

  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: from.map((point, index) => ({
        id: point.id,
        x: point.x + (to[index].x - point.x) * progress,
        y: point.y + (to[index].y - point.y) * progress,
      })),
    });
    await page.waitForTimeout(16);
  }

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

test.describe("mobile touch production gate", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });

  test("@touch supports pan, pinch, and controls under 4x CPU slowdown", async ({
    context,
    page,
  }) => {
    test.setTimeout(45_000);
    const runtimeErrors = collectRuntimeErrors(page);
    const cdp = await context.newCDPSession(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await cdp.send("Emulation.setCPUThrottlingRate", {
      rate: 4,
    });

    await page.goto("/");
    await expect(page.getByRole("status")).toHaveText(
      "地球已就绪",
      { timeout: 20_000 },
    );
    await expect(
      page.locator("canvas.maplibregl-canvas"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => window.matchMedia("(pointer: coarse)").matches,
      ),
    ).toBe(true);

    const canvasBox = await page
      .locator("canvas.maplibregl-canvas")
      .boundingBox();
    expect(canvasBox).not.toBeNull();

    if (!canvasBox) {
      return;
    }

    const center = {
      x: canvasBox.x + canvasBox.width / 2,
      y: canvasBox.y + canvasBox.height / 2,
    };

    await dispatchTouchGesture(
      cdp,
      page,
      [{ id: 1, x: center.x, y: center.y }],
      [{ id: 1, x: center.x + 110, y: center.y + 45 }],
    );
    await expect
      .poll(() => new URL(page.url()).searchParams.has("gm-view"))
      .toBe(true);

    const zoomAfterPan = readSharedZoom(page.url());
    expect(zoomAfterPan).not.toBeNull();

    await dispatchTouchGesture(
      cdp,
      page,
      [
        { id: 1, x: center.x - 35, y: center.y },
        { id: 2, x: center.x + 35, y: center.y },
      ],
      [
        { id: 1, x: center.x - 85, y: center.y },
        { id: 2, x: center.x + 85, y: center.y },
      ],
    );
    await expect
      .poll(() => readSharedZoom(page.url()))
      .toBeGreaterThan((zoomAfterPan ?? 0) + 0.05);

    await page.getByRole("button", { name: "图层" }).tap();
    const water = page.getByRole("checkbox", {
      name: /^水系/,
    });
    await water.tap();
    await expect(water).not.toBeChecked();
    await expect
      .poll(
        () =>
          new URL(page.url()).searchParams.get("gm-hidden"),
      )
      .toBe("water");

    await page
      .getByRole("button", { name: "复位视角" })
      .tap();
    await expect
      .poll(() => new URL(page.url()).searchParams.has("gm-view"))
      .toBe(false);

    expect(runtimeErrors).toEqual([]);
  });
});
