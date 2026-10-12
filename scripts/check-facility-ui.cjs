// Run against an isolated browser profile; no saved user plans are changed.
const { chromium } = require(process.argv[2]);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.route('**/api/plans/**', route => route.fulfill({ status: 404, body: '{}' }));
    await page.goto('http://localhost:8917', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__gp, { timeout: 60000 });
    await page.locator('[data-tab="build"]').first().click();
    await page.locator('#cat-search').evaluate(el => el.closest('.sec').classList.remove('collapsed'));
    await page.locator('#cat-search').fill('생활');
    console.log('Search:', await page.locator('#cat-results').innerText());
    await page.locator('#cat-search').fill('no-such-facility');
    if (!await page.locator('#cat-empty').isVisible()) throw new Error('Missing empty state');
    await page.locator('#cat-reset').click();
    await page.locator('#cat-category').selectOption('care');
    console.log('Category:', await page.locator('#cat-results').innerText());
    await page.locator('#cat-reset').click();
    await page.locator('#cat-search').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const placer = window.__gp.placer;
      for (const totalKrw of [1000000, 2000000]) {
        placer.restoreItem({ specId: 'office-zone', lon: 128.125, lat: 38.328, groundH: 1045,
          capacity: 10, floors: 1, protection: 'none',
          dims: { widthM: 12, depthM: 8, areaM2: 96, areaPyeong: 29 },
          cost: { totalKrw, cutM3: 10, fillM3: 5, pad: 1045, retainingWallAreaM2: 0,
            earthworkKrw: 100, wallKrw: 0, foundationKrw: 100, buildingKrw: totalKrw - 200,
            overheadKrw: 0, difficulty: 'low', siteCostPerPersonKrw: 10 },
        });
      }
      placer.onChange();
    });
    await page.locator('#placed-sort').selectOption('cost-desc');
    const costs = await page.locator('.placed-item .p-cost').allTextContents();
    console.log('Descending costs:', costs);
    await page.locator('#placed-search').fill('no-such-facility');
    if (await page.locator('.placed-item').count()) throw new Error('Placed filter did not apply');
    await page.locator('#placed-search').fill('');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#facility-csv').click();
    const download = await downloadPromise;
    const csv = require('node:fs').readFileSync(await download.path(), 'utf8');
    if (!csv.includes('2000000') || csv.split('\r\n').length !== 3) throw new Error('Incorrect CSV rows');
    console.log('CSV:', download.suggestedFilename(), '2 facility rows verified');
    await page.locator('#cat-search').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'facility-workspace.png' });
    console.log('Screenshot: facility-workspace.png');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
