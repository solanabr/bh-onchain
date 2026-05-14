import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET = process.env.INVITE_TOKEN_SECRET ?? "";

function signature(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createInviteToken(memberId: string): string {
  if (!SECRET) {
    throw new Error("INVITE_TOKEN_SECRET is not set");
  }
  const nonce = randomBytes(12).toString("hex");
  const payload = `${memberId}.${nonce}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyInviteToken(token: string): { memberId: string } | null {
  if (!SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [memberId, nonce, sig] = parts;
  const payload = `${memberId}.${nonce}`;
  const expected = signature(payload);

  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
    return null;
  }
  return { memberId };
}
