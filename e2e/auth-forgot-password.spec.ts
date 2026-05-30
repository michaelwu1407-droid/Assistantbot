import { test, expect } from "@playwright/test";

/**
 * auth-09 — /auth/forgot-password reset email request
 *
 * Verifies that the page renders correctly and the form is operable.
 * We cannot verify the email is delivered (Supabase auth, no test hook),
 * so the proof is: form submits without error + success copy appears.
 */
test.describe("Forgot password flow", () => {
  test("page renders with email input and submit button", async ({ page }) => {
    await page.goto("/(auth)/forgot-password");

    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("shows success message after submitting a well-formed email", async ({ page }) => {
    await page.goto("/(auth)/forgot-password");

    await page.getByLabel(/email/i).fill("e2e-test@earlymark.ai");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Supabase always returns a success response (no email enumeration)
    await expect(
      page.getByText(/check your email/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
