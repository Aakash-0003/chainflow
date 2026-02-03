
import * as walletRepo from "../repositories/wallet.repository.js";
import * as walletChainRepo from "../repositories/walletChain.repository.js";
import { encryptSecret } from "../crypto/encryption.js";
import prisma from "../../prisma/prisma.js";

export async function importWallet({ name, publicAddress, privateKey, chainIds = [] }) {
    const existing = await walletRepo.findWalletByAddress(publicAddress);

    if (existing) {
        throw new Error("Wallet already exists");
    }
    const encrypted = encryptSecret(privateKey);
    // console.log("encrypted data", encrypted)
    // return walletRepo.createWallet({
    //     name,
    //     public_address: publicAddress,
    //     encrypted_secret: encrypted.encryptedSecret,
    //     encrypted_iv: encrypted.iv,
    //     encryption_auth: encrypted.authTag,
    // });

    return prisma.$transaction(async (tx) => {
        // 3a️⃣ Create wallet
        const wallet = await walletRepo.createWallet(tx, {
            name,
            public_address: publicAddress,
            encrypted_secret: encrypted.encryptedSecret,
            encrypted_iv: encrypted.iv,
            encryption_auth: encrypted.authTag,
        });

        // 3b️⃣ Enable chains ONLY if provided
        if (chainIds.length > 0) {
            const walletChain = await walletChainRepo.enableChains(tx, {
                walletId: wallet.id,
                chainIds,
            });
            const chainIds = walletChain.map(chain => {
                return chain.chain_id;
            })
            console.log('res', walletChain)
            wallet.chainIds = chainIds
        }
        return wallet;
    });
}

export async function updateWalletStatus({ publicAddress, status }) {
    return walletRepo.updateWalletStatus({ publicAddress, status })

}

export async function getWalletByPublicAddress(publicAddress) {
    return walletRepo.findWalletByAddress(publicAddress);
}


export async function enableChainsForWallet({ walletId, chainIds }) {

    const walletChain = await walletChainRepo.enableChains(prisma, { walletId, chainIds })
    const chains = walletChain.map(chain => {
        return chain.chain_id;
    })
    console.log('res', walletChain)
    return chains
}

