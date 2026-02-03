
export async function enableChains(prismaClient, { walletId, chainIds }) {
    const records = chainIds.map((chainId) => ({
        wallet_id: walletId,
        chain_id: chainId,
    }));

    await prismaClient.wallet_chain.createMany({
        data: records,
        skipDuplicates: true,
    });

    return prismaClient.wallet_chain.findMany({
        where: {
            OR: records.map(r => ({
                wallet_id: r.wallet_id,
                chain_id: r.chain_id,
            })),

        }, select: {
            chain_id: true,
        },
    });
}
