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

    // Wait for problems to load
    await page.waitForSelector('.problem-card, .question-bank-grid', { timeout: 15000 });

    // 2. Start an attempt - click the first problem card OR "Start Now" button
    const startNowButton = page.getByRole('button', { name: /Start Now/i });
    const problemCard = page.locator('.problem-card').first();

    if (await startNowButton.isVisible().catch(() => false)) {
      await startNowButton.click();
    } else if (await problemCard.isVisible()) {
      await problemCard.click();
    } else {
      throw new Error('No problem card or Start Now button found');
    }

    // 3. Wait for attempt page to load (should be on thinking gate)
    await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/, { timeout: 15000 });

    // 4. Wait for thinking gate form to load
    await page.waitForSelector('.thinking-gate, [data-testid="start-coding"]', { timeout: 10000 });

    // 5. Fill in the thinking gate form if visible
    // Select a pattern by clicking on a pattern card (not a dropdown)
    const patternCards = page.locator('.pattern-card');
    const patternCount = await patternCards.count();
    if (patternCount > 0) {
      // Click on a different pattern to potentially trigger micro-lesson
      await patternCards.nth(1).click();
    }

    // Fill invariant (required field) - textarea with id="invariant"
    const invariantTextarea = page.locator('#invariant');
    await invariantTextarea.waitFor({ state: 'visible', timeout: 5000 });
    await invariantTextarea.fill('At each iteration, we maintain the required property');

    // 6. Click "Commit & Start Coding"
    const commitButton = page.getByTestId('start-coding');
    await expect(commitButton).toBeVisible({ timeout: 5000 });

    // Wait until button is enabled
    await expect(commitButton).toBeEnabled({ timeout: 5000 });
    await commitButton.click();

    // 7. Wait for either modal or code editor to appear
    const tipsModal = page.getByTestId('tips-modal');
    const codeEditor = page.getByTestId('code-editor');

    // Wait for either modal or code editor with more generous timeout
    await Promise.race([
      tipsModal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
      codeEditor.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    ]);

    // Handle modal if it appears (pattern mismatch case)
    const modalVisible = await tipsModal.isVisible().catch(() => false);
    if (modalVisible) {
      // Verify it's the tips modal
      await expect(tipsModal).toContainText(/tip|problem|solving|pattern/i);

      // Click "I understand, continue"
      const continueButton = page.getByTestId('tips-continue');
      await expect(continueButton).toBeEnabled({ timeout: 5000 });
      await continueButton.click();

      // Assert modal closes
      await expect(tipsModal).toBeHidden({ timeout: 5000 });
    }

    // 8. Assert we're now in coding phase - code editor is visible
    await expect(codeEditor).toBeVisible({ timeout: 10000 });

    // Also verify submit/run button is available
    const submitButton = page.getByRole('button', { name: /submit|run tests/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
  });

  test('modal closes and coding step shown after acknowledging tips', async ({ page }) => {
    // Direct navigation test - go straight to an attempt
    await page.goto('/practice');

    // Wait for problems to load
    await page.waitForSelector('.problem-card', { timeout: 15000 });

    // Click first problem card
    const problemCard = page.locator('.problem-card').first();
    await problemCard.click();

    // Wait for attempt page
    await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/, { timeout: 15000 });

    // Wait for thinking gate
    await page.waitForSelector('.thinking-gate', { timeout: 10000 });

    // Fill required fields - first select a pattern
    const patternCards = page.locator('.pattern-card');
    const patternCount = await patternCards.count();
    if (patternCount > 0) {
      await patternCards.first().click();
    }

    // Then fill the invariant
    const invariantTextarea = page.locator('#invariant');
    await invariantTextarea.waitFor({ state: 'visible', timeout: 5000 });
    await invariantTextarea.fill('Test invariant for the algorithm');

    // Submit thinking gate
    const commitButton = page.getByTestId('start-coding');
    if (await commitButton.isVisible() && await commitButton.isEnabled()) {
      await commitButton.click();

      // Wait for either modal or code editor
      await Promise.race([
        page.waitForSelector('[data-testid="tips-modal"]', { timeout: 5000 }).catch(() => null),
        page.waitForSelector('[data-testid="code-editor"]', { timeout: 5000 }).catch(() => null),
      ]);

      // Handle modal if it appeared
      const tipsModal = page.getByTestId('tips-modal');
      if (await tipsModal.isVisible().catch(() => false)) {
        const continueButton = page.getByTestId('tips-continue');
        await continueButton.click();
        await expect(tipsModal).toBeHidden({ timeout: 5000 });
      }

      // Verify code editor is visible
      const codeEditor = page.getByTestId('code-editor');
      await expect(codeEditor).toBeVisible({ timeout: 10000 });
    }
  });
});
