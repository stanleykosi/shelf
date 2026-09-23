import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(encodedKey: string): Buffer {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY_INVALID");
  return key;
}

export function encryptText(value: string, encodedKey: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(encodedKey), nonce);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [nonce, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptText(value: string, encodedKey: string): string {
  const parts = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (parts.length !== 3) throw new Error("ENCRYPTED_VALUE_INVALID");
  const [nonce, tag, encrypted] = parts;
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(encodedKey), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
