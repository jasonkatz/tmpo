import { describe, it, expect } from "bun:test";
import { buildPrDescriptionPrompt, parsePrDescription } from "./pr-description";

describe("pr-description", () => {
  describe("buildPrDescriptionPrompt", () => {
    it("should include the task", () => {
      const prompt = buildPrDescriptionPrompt("add login page", "## Summary\nAdd login.");
      expect(prompt).toContain("add login page");
    });

    it("should include the proposal", () => {
      const prompt = buildPrDescriptionPrompt("task", "## Summary\nDo the thing.");
      expect(prompt).toContain("## Summary\nDo the thing.");
    });

    it("should request a title and body", () => {
      const prompt = buildPrDescriptionPrompt("task", "proposal");
      expect(prompt).toContain("TITLE:");
      expect(prompt).toContain("BODY:");
    });
  });

  describe("parsePrDescription", () => {
    it("should parse title and body from response", () => {
      const response = `TITLE: Add login page with email/password auth

BODY:
Implements a login page with form validation and session handling.

- Email/password form with client-side validation
- Session token stored in httpOnly cookie
- Redirects to dashboard on success`;

      const result = parsePrDescription(response, "fallback task");
      expect(result.title).toBe("Add login page with email/password auth");
      expect(result.body).toContain("Implements a login page");
      expect(result.body).toContain("httpOnly cookie");
    });

    it("should truncate title to 72 characters", () => {
      const response = `TITLE: This is a very long title that exceeds seventy two characters and should be truncated properly

BODY:
Some description.`;

      const result = parsePrDescription(response, "fallback");
      expect(result.title.length).toBeLessThanOrEqual(72);
    });

    it("should fall back to task if parsing fails", () => {
      const result = parsePrDescription("some garbled output", "add login page");
      expect(result.title).toBe("add login page");
    });

    it("should handle response with no BODY section", () => {
      const response = "TITLE: Fix the bug";
      const result = parsePrDescription(response, "fallback");
      expect(result.title).toBe("Fix the bug");
      expect(result.body).toBe("");
    });
  });
});
