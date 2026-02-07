import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALGORITHM = "aes-256-gcm";
const SCRYPT_N = 2 ** 14;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypted keystore for private keys.
 * File format: [salt(32)][iv(16)][authTag(16)][ciphertext(...)]
 * Encryption: AES-256-GCM with key derived from passphrase via scrypt.
 */
export class Keystore {
  constructor(private readonly keystorePath: string) {}

  /** Encrypt and write data to the keystore file. */
  async write(data: Record<string, string>, passphrase: string): Promise<void> {
    const dir = path.dirname(this.keystorePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const plaintext = JSON.stringify(data);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(passphrase, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const output = Buffer.concat([salt, iv, authTag, encrypted]);
    fs.writeFileSync(this.keystorePath, output, { mode: 0o600 });
  }

  /** Read and decrypt the keystore. Returns a map of wallet ID -> private key. */
  async read(passphrase: string): Promise<Record<string, string>> {
    if (!fs.existsSync(this.keystorePath)) {
      return {};
    }

    const raw = fs.readFileSync(this.keystorePath);
    if (raw.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Keystore file is corrupted (too small)");
    }

    const salt = raw.subarray(0, SALT_LENGTH);
    const iv = raw.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = raw.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const ciphertext = raw.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = crypto.scryptSync(passphrase, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted: string;
    try {
      decrypted = decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
    } catch {
      throw new Error("Invalid passphrase or corrupted keystore");
    }

    return JSON.parse(decrypted);
  }

  /** Check if the keystore file exists. */
  exists(): boolean {
    return fs.existsSync(this.keystorePath);
  }
}
