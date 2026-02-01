
import * as walletRepo from "../repositories/wallet.repository.js";
import { encryptSecret } from "../crypto/encryption.js";

export async function importWallet({ name, publicAddress, privateKey }) {
    const existing = await walletRepo.findWalletByAddress(publicAddress);

    if (existing) {
        throw new Error("Wallet already exists");
    }
    const encrypted = encryptSecret(privateKey);
    console.log("encrypted data", encrypted)
    return walletRepo.createWallet({
        name,
        public_address: publicAddress,
        encrypted_secret: encrypted.encryptedSecret,
        encrypted_iv: encrypted.iv,
        encryption_auth: encrypted.authTag,
    });

}

export async function updateWalletStatus({ publicAddress, status }) {
    try {
        return walletRepo.updateWalletStatus({ publicAddress, status })
    } catch (error) {
        throw new Error(error)
    }
}

export async function getWalletByPublicAddress(publicAddress) {
    try {
        return walletRepo.findWalletByAddress(publicAddress)
    } catch (error) {
        throw new Error(error)
    }
}

