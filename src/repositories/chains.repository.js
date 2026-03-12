import prisma from "../../prisma/prisma.js";

export async function getChain(chainId) {
    return prisma.chain.findUnique(
        { where: { chainId } }
    )
}