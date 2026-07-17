import { createHmac } from "crypto";

function base64urlEncode(obj: any): string {
  const str = JSON.stringify(obj);
  return Buffer.from(str).toString("base64url");
}

function base64urlDecode(str: string): any {
  try {
    const decoded = Buffer.from(str, "base64url").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function signJwt(payload: any, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64urlEncode(header);
  const encodedPayload = base64urlEncode(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64url");
  return `${dataToSign}.${signature}`;
}

export function verifyJwt(token: string, secret: string): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToVerify = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(dataToVerify)
    .digest("base64url");
  if (signature !== expectedSignature) {
    return null;
  }
  return base64urlDecode(encodedPayload);
}
