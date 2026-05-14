import { describe, it, expect } from "vitest";
import { sanitizeUrl, sanitizeText, isValidEmail } from "../security";

describe("sanitizeUrl", () => {
  it("returns null for empty/whitespace", () => {
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
  });

  it("adds https:// when missing", () => {
    expect(sanitizeUrl("github.com/x")).toBe("https://github.com/x");
  });

  it("rejects javascript:", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("keeps existing scheme if safe", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });
});

describe("sanitizeText", () => {
  it("trims + nullifies empty", () => {
    expect(sanitizeText("  ")).toBeNull();
    expect(sanitizeText("  hi  ")).toBe("hi");
  });

  it("respects maxLength", () => {
    expect(sanitizeText("abcdef", 3)).toBe("abc");
  });
});

describe("isValidEmail", () => {
  it("accepts well-formed emails", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
  });
  it("rejects malformed", () => {
    expect(isValidEmail("noatsign")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });
});
