import { test, expect } from '@playwright/test';

test.describe('Checkout - Payments', () => {
  test('process credit card payment successfully', async ({ page }) => {
    await test.step('Load checkout', async () => {
      await page.goto('data:text/html,<div id="status">Success</div>');
    });
    
    await expect(page.locator('#status')).toHaveText('Success');
  });

  test('decline expired card', async ({ page }) => {
    await test.step('Submit expired card', async () => {
      await page.goto('data:text/html,<div id="status">Approved</div>');
    });
    
    // Intentionally fail
    await test.step('Verify declined status', async () => {
      await expect(page.locator('#status')).toHaveText('Declined', { timeout: 500 });
    });
  });
});
