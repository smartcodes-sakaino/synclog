import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// TOKEN_ENCRYPTION_KEY(任意長の文字列)からAES-256-GCM用の32バイト鍵を導出する
function deriveKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY が設定されていません");
  }
  return scryptSync(secret, "synclog-token-salt", 32);
}

// Googleのアクセストークン/リフレッシュトークンをDB保存前に暗号化する
export function encryptToken(plainText: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptToken(payload: string): string {
  const key = deriveKey();
  const [ivB64, authTagB64, dataB64] = payload.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("暗号化データの形式が不正です");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
