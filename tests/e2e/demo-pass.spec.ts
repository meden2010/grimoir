import { test, expect } from '@playwright/test';

test.describe('Pruebas de Demostración - Grimoir', () => {
  // Caso pasado 1 (Existente)
  test('login exitoso en demo app', async ({ page }) => {
    await test.step('Navegar a la pantalla de login', async () => {
      await page.goto('data:text/html,<html><body><h1 id="welcome">Bienvenido a Grimoir</h1></body></html>');
    });
    await test.step('Verificar mensaje de bienvenida', async () => {
      await expect(page.locator('#welcome')).toHaveText('Bienvenido a Grimoir');
    });
  });

  // Caso pasado 2 (Nuevo)
  test('navegación al dashboard de analíticas', async ({ page }) => {
    await test.step('Abrir el dashboard', async () => {
      await page.goto('data:text/html,<html><body><div id="dashboard">Dashboard Cargado</div></body></html>');
    });
    await test.step('Comprobar que los widgets están visibles', async () => {
      await expect(page.locator('#dashboard')).toContainText('Dashboard Cargado');
    });
  });

  // Caso fallado 1 (Nuevo)
  test('validación de token de sesión caducado', async ({ page }) => {
    await test.step('Recuperar token de sesión actual', async () => {
      await page.goto('data:text/html,<html><body><div id="status">Active</div></body></html>');
    });
    await test.step('Esperar a que expire (aserción intencional fallida)', async () => {
      await expect(page.locator('#status')).toHaveText('Expired', { timeout: 1000 });
    });
  });

  // Caso fallado 2 (Nuevo)
  test('proceso de pago con tarjeta rechazada', async ({ page }) => {
    await test.step('Ingresar datos de tarjeta inválida', async () => {
      await page.goto('data:text/html,<html><body><span id="response">Payment Approved</span></body></html>');
    });
    await test.step('Procesar pago y validar rechazo', async () => {
      await expect(page.locator('#response')).toHaveText('Payment Declined', { timeout: 1000 });
    });
  });

  // Caso de larga duración
  test('prueba de carga de datos pesados (larga duración)', async ({ page }) => {
    test.setTimeout(80000);
    await test.step('Simular carga de datos durante más de un minuto', async () => {
      await page.waitForTimeout(62000);
    });
    await test.step('Validar finalización exitosa', async () => {
      expect(true).toBeTruthy();
    });
  });
});
