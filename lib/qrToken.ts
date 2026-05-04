import crypto from "crypto";

type QrPayload = {
  passId: string;
  userId: string;
  jti: string;
  purpose: "gate-pass-scan";
  exp: number;
  iat: number;
};

const TOKEN_PREFIX = "gv1";

function getSecret() {
  const secret = process.env.QR_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("QR_TOKEN_SECRET or NEXTAUTH_SECRET must be configured");
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashQrTokenId(jti: string) {
  return crypto.createHash("sha256").update(jti).digest("hex");
}

export function createQrToken(passId: string, userId: string, ttlSeconds = 60) {
  const now = Math.floor(Date.now() / 1000);
  const payload: QrPayload = {
    passId,
    userId,
    jti: crypto.randomUUID(),
    purpose: "gate-pass-scan",
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return {
    qrData: `${TOKEN_PREFIX}.${encodedPayload}.${signature}`,
    jtiHash: hashQrTokenId(payload.jti),
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyQrToken(qrData: string) {
  if (qrData.length > 2048) {
    throw new Error("Invalid QR code");
  }

  const [prefix, encodedPayload, signature] = qrData.split(".");

  if (
    prefix !== TOKEN_PREFIX ||
    !encodedPayload ||
    !signature ||
    !/^[A-Za-z0-9_-]+$/.test(encodedPayload) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  ) {
    throw new Error("Invalid QR code");
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error("Invalid QR signature");
  }

  let payload: Partial<QrPayload>;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<QrPayload>;
  } catch {
    throw new Error("Invalid QR code");
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    payload.purpose !== "gate-pass-scan" ||
    typeof payload.passId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.jti !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    payload.iat > now + 30 ||
    payload.exp <= now
  ) {
    throw new Error("QR code expired or invalid");
  }

  return {
    passId: payload.passId,
    userId: payload.userId,
    jti: payload.jti,
    jtiHash: hashQrTokenId(payload.jti),
  };
}
