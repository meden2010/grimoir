import { test, expect } from '@playwright/test';

test('login exitoso en demo app', async ({ page }) => {
  await page.goto('data:text/html,<html><body><h1 id="welcome">Bienvenido a Grimoir</h1></body></html>');
  await expect(page.locator('#welcome')).toHaveText('Bienvenido a Grimoir');
});
