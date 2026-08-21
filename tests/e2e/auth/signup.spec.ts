import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test.skip('successful registration', async ({ page }) => {
    // Skipped test example
    await page.goto('data:text/html,<h1>Register</h1>');
  });

  test('password too short validation', async ({ page }) => {
    await test.step('Fill short password', async () => {
      await page.goto('data:text/html,<input id="pass">');
    });
    
    // Intentionally fail
    await test.step('Check error class on password field', async () => {
      await expect(page.locator('#pass')).toHaveClass('error', { timeout: 500 });
    });
  });
});
