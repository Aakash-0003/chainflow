import prisma from "../../prisma/prisma.js";

export async function findTransactionById(id) {
    return prisma.transaction.findUnique({
        where: { id: id },
    })
}

export async function updateTransactionStatus(id, status) {
    return prisma.transaction.update({
        where: {
            id: id
        },
        data: {
            status: status
        }
    })
}

export async function updateTransactionStatusMined({ id, status, blockNumber, confirmedAt }) {
    return prisma.transaction.update({
        where: {
            id: id
        },
        data: {
            status,
            blockNumber,
            confirmedAt
        }
    })
}

export async function updateTransactionStatusFailed({ id, status, confirmedAt }) {
    return prisma.transaction.update({
        where: {
            id: id
        },
        data: {
            status,
            confirmedAt
        }
    })
}

export async function insertTransaction(data) {

    return prisma.transaction.create({
        data: {
            toAddress: data.toAddress,
            value: data.value,
            walletId: data.walletId,
            chainId: data.chainId,
            data: data.data,
        }
    })
}

export async function updateTransactionPostSent({ id, transactionHash, status, submittedAt, nonce }) {
    return prisma.transaction.update({
        where: {
            id: id
        },
        data: {
            transactionHash,
            status,
            submittedAt,
            nonce
        }
    })
}

export async function findTransactionByStatus(status) {
    return prisma.transaction.findMany({
        where: { status: status },
    })
}

