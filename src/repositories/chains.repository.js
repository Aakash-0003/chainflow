import prisma from "../../prisma/prisma.js";

export async function getChain(chainId) {
    return prisma.chains.findUnique(
        { where: { chain_id: chainId } }
    )
}