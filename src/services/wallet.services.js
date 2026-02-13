import * as walletRepo from "../repositories/wallet.repository.js";
import * as walletChainRepo from "../repositories/walletChain.repository.js";
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
            public_address: publicAddress,
            encrypted_secret: encrypted.encryptedPrivateKey,
            encrypted_iv: encrypted.iv,
            encryption_auth: encrypted.authTag,
        });

        if (chainIds.length > 0) {
            const walletChain = await walletChainRepo.enableChains(tx, {
                walletId: wallet.id,
                chainIds,
            });
            const chainIds = walletChain.map(chain => {
                return chain.chain_id;
            })
            wallet.chainIds = chainIds
        }
        return {
            id: wallet.id,
            name: wallet.name,
            publicAddress: wallet.public_address,
            status: wallet.status,
            chainIds: wallet.chainIds || [],
            createdAt: wallet.created_at,
            updatedAt: wallet.updated_at,
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
        return chain.chain_id;
    })
    return chains
}

