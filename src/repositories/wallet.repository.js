import prisma from "../../prisma/prisma.js";

export async function findWalletByAddress(publicAddress) {
    return prisma.wallet.findUnique({
        where: { publicAddress },
    });
}

export async function createWallet(prismaClient, data) {
    return prismaClient.wallet.create({
        data,
    });
}

export async function getWalletById(id) {
    return prisma.wallet.findUnique({
        where: { id },
    });
}

export async function updateWalletStatus({ publicAddress, status }) {
    return prisma.wallet.update({
        where: { publicAddress },
        data: { status }
    });
}
