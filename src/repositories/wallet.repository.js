import prisma from "../../prisma/prisma.js";

export async function findWalletByAddress(publicAddress) {
    return prisma.wallets.findUnique({
        where: { public_address: publicAddress },
    });
}

export async function createWallet(prismaClient, data) {
    return prismaClient.wallets.create({
        data,
    });
}

export async function getWalletById(id) {
    return prisma.wallets.findUnique({
        where: { id },
    });
}

export async function updateWalletStatus({ publicAddress, status }) {
    return prisma.wallets.update({
        where: { public_address: publicAddress },
        data: { status }
    });
}
