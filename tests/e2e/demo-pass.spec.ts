import { test, expect } from '@playwright/test';

test.describe('Pruebas de Demostración - Grimoir', () => {
  // Caso pasado 1 (Existente)
  test('login exitoso en demo app', async ({ page }) => {
    await page.goto('data:text/html,<html><body><h1 id="welcome">Bienvenido a Grimoir</h1></body></html>');
    await expect(page.locator('#welcome')).toHaveText('Bienvenido a Grimoir');
  });

  // Caso pasado 2 (Nuevo)
  test('navegación al dashboard de analíticas', async ({ page }) => {
    await page.goto('data:text/html,<html><body><div id="dashboard">Dashboard Cargado</div></body></html>');
    await expect(page.locator('#dashboard')).toContainText('Dashboard Cargado');
  });

  // Caso fallado 1 (Nuevo)
  test('validación de token de sesión caducado', async ({ page }) => {
    await page.goto('data:text/html,<html><body><div id="status">Active</div></body></html>');
    // Aserción fallida intencionada para el reporte
    await expect(page.locator('#status')).toHaveText('Expired', { timeout: 1000 });
  });

  // Caso fallado 2 (Nuevo)
  test('proceso de pago con tarjeta rechazada', async ({ page }) => {
    await page.goto('data:text/html,<html><body><span id="response">Payment Approved</span></body></html>');
    // Aserción fallida intencionada para el reporte
    await expect(page.locator('#response')).toHaveText('Payment Declined', { timeout: 1000 });
  });
});
