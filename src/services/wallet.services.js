import { walletRepository as walletRepo, walletChainRepository as walletChainRepo } from "../repositories/index.js";
import { encryptPrivateKey } from "../crypto/encryption.js";
import prisma from "../../prisma/prisma.js";

export async function importWallet({ name, publicAddress, privateKey, chainIds = [] }) {
    const existing = await walletRepo.findWalletByAddress(publicAddress);

    if (existing) {
        throw new Error("Wallet already exists");
    }
    const encrypted = encryptPrivateKey(privateKey);

    return prisma.$transaction(async (tx) => {
        // Create wallet
        const wallet = await walletRepo.createWallet(tx, {
            name,
            publicAddress: publicAddress,
            encryptedSecret: encrypted.encryptedPrivateKey,
            encryptedIv: encrypted.iv,
            encryptionAuth: encrypted.authTag,
        });

        if (chainIds.length > 0) {
            const walletChain = await walletChainRepo.enableChains(tx, {
                walletId: wallet.id,
                chainIds,
            });
            const chainIds = walletChain.map(chain => {
                return chain.chainId;
            })
            wallet.chainIds = chainIds
        }
        return {
            id: wallet.id,
            name: wallet.name,
            publicAddress: wallet.publicAddress,
            status: wallet.status,
            chainIds: wallet.chainIds || [],
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
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
        return chain.chainId;
    })
    return chains
}

