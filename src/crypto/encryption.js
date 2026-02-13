import crypto from "crypto";
import { config } from "../config/env.js";
import { CONSTANTS } from "../config/constants.js";

const ALGORITHM = CONSTANTS.ENCRYPTION_ALGORITHM;
const IV_LENGTH = CONSTANTS.IV_LENGTH;
const ENCRYPTION_KEY = Buffer.from(config.encryptionKey, "hex");

export function encryptPrivateKey(data) {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        iv
    );
    const encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encryptedSecret: encrypted.toString("hex"),
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
    };

}

export function decryptPrivateKey({ encryptedSecret, iv, authTag }) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedSecret, "hex")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}
