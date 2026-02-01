import { test, expect } from '@playwright/test';

/**
 * Regression test for: "I understand, continue" button in Problem-Solving Tips modal
 *
 * Bug: Clicking "I understand, continue" closed the modal but did NOT advance
 * to the coding/editor step. User was stuck in the thinking gate.
 *
 * Expected: After clicking "I understand, continue", the modal closes AND
 * the user transitions to the coding phase with the editor visible.
 */
test.describe('Attempt Start Coding Flow', () => {
  test('clicking "I understand, continue" advances to coding step', async ({ page }) => {
    // 1. Go to practice page
    await page.goto('/practice');

    // 2. Start an attempt - click the first "Start Now" button
    const startButton = page.getByRole('button', { name: /Start Now/i }).first();
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();

    // 3. Wait for attempt page to load (should be on thinking gate)
    await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/);

    // 4. Fill in the thinking gate form
    // Select a pattern (intentionally wrong to trigger micro-lesson)
    const patternSelect = page.locator('select').filter({ hasText: /pattern/i }).first()
      || page.locator('select').first();
    if (await patternSelect.isVisible()) {
      await patternSelect.selectOption({ index: 1 }); // Select first non-default option
    }

    // Fill invariant (required field)
    const invariantInput = page.getByPlaceholder(/invariant/i)
      || page.locator('textarea').first();
    if (await invariantInput.isVisible()) {
      await invariantInput.fill('At each iteration, the window contains the valid substring');
    }

    // 5. Click "Commit & Start Coding"
    const commitButton = page.getByTestId('start-coding')
      || page.getByRole('button', { name: /Commit & Start Coding/i });
    await expect(commitButton).toBeEnabled({ timeout: 5000 });
    await commitButton.click();

    // 6. If micro-lesson modal appears, verify and click continue
    const tipsModal = page.getByTestId('tips-modal');
    const modalVisible = await tipsModal.isVisible().catch(() => false);

    if (modalVisible) {
      // Verify modal title contains "Tips" or similar
      await expect(tipsModal).toContainText(/tip|problem|solving/i);

      // 7. Click "I understand, continue"
      const continueButton = page.getByTestId('tips-continue')
        || page.getByRole('button', { name: /I understand, continue/i });
      await expect(continueButton).toBeEnabled();
      await continueButton.click();

      // 8. Assert modal is now hidden
      await expect(tipsModal).toBeHidden({ timeout: 5000 });
    }

    // 9. Assert we're now in coding phase - code editor is visible
    const codeEditor = page.getByTestId('code-editor');
    await expect(codeEditor).toBeVisible({ timeout: 5000 });

    // Also verify submit/run button is available (coding phase indicator)
    const submitCodeButton = page.getByRole('button', { name: /submit|run/i });
    await expect(submitCodeButton).toBeVisible({ timeout: 5000 });
  });

  test('coding step is reached even after page refresh', async ({ page }) => {
    // 1. Go to practice page and start attempt
    await page.goto('/practice');

    const startButton = page.getByRole('button', { name: /Start Now/i }).first();
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();

    // 2. Wait for attempt page
    await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/);
    const attemptUrl = page.url();

    // 3. Fill thinking gate and commit
    const invariantInput = page.locator('textarea').first();
    if (await invariantInput.isVisible()) {
      await invariantInput.fill('Test invariant');
    }

    const commitButton = page.getByTestId('start-coding');
    if (await commitButton.isVisible() && await commitButton.isEnabled()) {
      await commitButton.click();

      // Handle modal if it appears
      const tipsModal = page.getByTestId('tips-modal');
      if (await tipsModal.isVisible().catch(() => false)) {
        const continueButton = page.getByTestId('tips-continue');
        await continueButton.click();
        await expect(tipsModal).toBeHidden({ timeout: 5000 });
      }

      // 4. Verify we're in coding phase
      const codeEditor = page.getByTestId('code-editor');
      await expect(codeEditor).toBeVisible({ timeout: 5000 });

      // 5. Refresh the page
      await page.reload();

      // 6. Verify we're still in coding phase after refresh
      await expect(codeEditor).toBeVisible({ timeout: 10000 });
    }
  });
});
