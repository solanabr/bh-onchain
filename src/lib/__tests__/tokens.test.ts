import { describe, it, expect, beforeEach } from "vitest";

describe("invite tokens", () => {
  beforeEach(() => {
    process.env.INVITE_TOKEN_SECRET = "test-secret-please-change";
  });

  it("round-trips a memberId", async () => {
    const { createInviteToken, verifyInviteToken } = await import("../tokens");
    const token = createInviteToken("member-123");
    const out = verifyInviteToken(token);
    expect(out).toEqual({ memberId: "member-123" });
  });

  it("rejects tampered tokens", async () => {
    const { createInviteToken, verifyInviteToken } = await import("../tokens");
    const token = createInviteToken("member-abc");
    const tampered = token.slice(0, -2) + "00";
    expect(verifyInviteToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    const { verifyInviteToken } = await import("../tokens");
    expect(verifyInviteToken("not-a-token")).toBeNull();
    expect(verifyInviteToken("a.b")).toBeNull();
  });

  it("returns null when secret is unset", async () => {
    process.env.INVITE_TOKEN_SECRET = "";
    const { verifyInviteToken } = await import("../tokens");
    expect(verifyInviteToken("a.b.c")).toBeNull();
  });
});
