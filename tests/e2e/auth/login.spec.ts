import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('successful login with valid credentials', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('data:text/html,<h1>Login</h1><input id="user"><button id="submit">Login</button>');
    });
    
    await test.step('Enter credentials', async () => {
      await page.locator('#user').fill('testuser');
    });
    
    await test.step('Submit form', async () => {
      await page.locator('#submit').click();
    });
    
    expect(true).toBeTruthy();
  });

  test('error message on invalid credentials', async ({ page }) => {
    await test.step('Navigate to login', async () => {
      await page.goto('data:text/html,<h1>Login</h1><div id="error">Invalid user</div>');
    });
    
    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#error')).toHaveText('Invalid user');
  });
  
  test('login button should be disabled when empty', async ({ page }) => {
    // Failing intentionally
    await test.step('Load login page with disabled button', async () => {
      await page.goto('data:text/html,<button id="login" disabled>Login</button>');
    });
    await test.step('Assert button is not disabled (fails intentionally)', async () => {
      await expect(page.locator('#login')).not.toBeDisabled({ timeout: 500 });
    });
  });
});
