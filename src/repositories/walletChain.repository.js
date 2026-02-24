import prisma from '../../prisma/prisma.js';

export async function enableChains(prismaClient, { walletId, chainIds }) {
    const records = chainIds.map((chainId) => ({
        walletId: walletId,
        chainId: chainId,
    }));

    await prismaClient.walletChain.createMany({
        data: records,
        skipDuplicates: true,
    });

    return prismaClient.walletChain.findMany({
        where: {
            OR: records.map(r => ({
                walletId: r.walletId,
                chainId: r.chainId,
            })),

        }, select: {
            chainId: true,
        },
    });
}

export async function findWalletChain(walletId, chainId) {
    const relation = await prisma.walletChain.findUnique({
        where: {
            walletId_chainId: {
                walletId: walletId,
                chainId: chainId,
            }
        },
        include: {
            wallet: true,
            chain: true
        }
    });

    return relation;
}
