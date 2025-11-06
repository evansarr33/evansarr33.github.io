import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

function resolveAppPath(relativePath: string) {
  return `file://${path.resolve(projectRoot, relativePath)}`;
}

test('homepage affiche les sections clés', async ({ page }) => {
  await page.goto(resolveAppPath('index.html'));
  await expect(page.locator('text=Toute la vie de l\'entreprise')).toBeVisible();
  await expect(page.locator('#newsList')).toBeVisible();
  await expect(page.locator('#reservationsList')).toBeVisible();
});

test('page plannings affiche les boutons d\'export', async ({ page }) => {
  await page.goto(resolveAppPath('plannings.html'));
  await expect(page.locator('#exportEventsIcs')).toBeVisible();
  await expect(page.locator('#exportAbsencesIcs')).toBeVisible();
});
