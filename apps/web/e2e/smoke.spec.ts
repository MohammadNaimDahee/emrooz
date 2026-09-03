import { test, expect } from '@playwright/test';

/**
 * Playwright coverage of the essential §48 flows against the demo adapter.
 * These run against the local dev server without any Supabase credentials
 * so CI never touches the real backend.
 *
 * Each test starts with a fresh browser context (Playwright default), which
 * gives us a clean guest identity and in-memory adapter state per test.
 */

test('landing page presents Emrooz as a global product', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What should I cook today?');
  await expect(page.getByText(/global product/i)).toBeVisible();
});

test('a visitor can browse cuisines and open a recipe', async ({ page }) => {
  await page.goto('/cuisines');
  await page.getByRole('link', { name: 'Italian' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Italian');
  await page.getByRole('link', { name: /Pizza Margherita/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pizza Margherita');
});

test('Today shows recommendations for a fresh guest', async ({ page }) => {
  await page.goto('/app');
  // Dismiss the onboarding modal if it opens for a fresh guest.
  const skip = page.getByRole('button', { name: /skip for now/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  const cards = page.locator('a[href^="/recipes/"]');
  await expect(cards.first()).toBeVisible();
});

test('Discover filters recipes by cooking time', async ({ page }) => {
  await page.goto('/discover');
  // Open the filter panel and pick "≤20 min".
  await page.getByRole('button', { name: /^filters/i }).click();
  await page.getByRole('button', { name: /≤20 min/ }).click();
  // Every result card should now show a time ≤ 20 minutes.
  const timeStrings = await page
    .locator('a[href^="/recipes/"] >> text=/\\d+\\s*min/')
    .allTextContents();
  for (const s of timeStrings) {
    const match = /(\d+)\s*min/.exec(s);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThanOrEqual(20);
  }
});

test('Pantry: add an ingredient then see the count update', async ({ page }) => {
  await page.goto('/pantry');
  // The pantry page renders every ingredient as a toggleable chip; picking one
  // moves it into the pantry and the count text should reflect that.
  const chip = page.getByRole('button', { name: 'Rice', exact: true }).first();
  await chip.click();
  await expect(page.getByText(/1 ingredient in your pantry/i)).toBeVisible();
});

test('Recipe detail scales servings up and down', async ({ page }) => {
  await page.goto('/recipes/quick-tomato-rice');
  const servingsCount = page.locator('#servings');
  await expect(servingsCount).toHaveText(/\d+/);
  const before = await servingsCount.textContent();
  await page.getByRole('button', { name: 'Increase servings' }).click();
  const after = await servingsCount.textContent();
  expect(Number(after)).toBe(Number(before) + 1);

  await page.getByRole('button', { name: 'Decrease servings' }).click();
  await page.getByRole('button', { name: 'Decrease servings' }).click();
  const afterDecrease = await servingsCount.textContent();
  // The stepper floors at 1 — never below.
  expect(Number(afterDecrease)).toBeGreaterThanOrEqual(1);
});

test('Recipe detail favorites the recipe and shows on the favorites page', async ({ page }) => {
  await page.goto('/recipes/quick-tomato-rice');
  const favBtn = page.getByRole('button', { name: /^favorite$/i });
  await expect(favBtn).toBeVisible();
  await favBtn.click();
  await expect(page.getByRole('button', { name: /favorited/i })).toBeVisible();

  await page.goto('/favorites');
  await expect(page.getByText(/quick tomato rice/i)).toBeVisible();
});

test('legal placeholders and privacy user-rights are reachable', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy');
  await expect(page.getByText(/access|erasure|export/i).first()).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Terms');
  await page.goto('/imprint');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Imprint');
});

test('sitemap and robots are served', async ({ page, request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain('sitemap.xml');

  await page.goto('/');
  // Landing page carries JSON-LD Organization tags via layout, but the
  // recipe-specific schema is on individual recipes:
  await page.goto('/recipes/quick-tomato-rice');
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLd).toContain('"@type":"Recipe"');
});
