import prisma from "../../prisma/prisma.js";

export async function findTransactionById(id) {
    return prisma.transactions.findUnique({
        where: { id: id },
    })
}

export async function updateTransactionStatus(id, status) {
    return prisma.transactions.update({
        where: {
            id: id
        },
        data: {
            status: status
        }
    })
}

export async function insertTransaction(data) {

    return prisma.transactions.create({
        data: {
            to_address: data.toAddress,
            value: data.value,
            wallet_id: data.walletId,
            chain_id: data.chainId,
            data: data.data,
        }
    })
}

export async function updateTransactionPostSent({ id, txHash, status, submittedAt, nonce }) {
    return prisma.transactions.update({
        where: {
            id: id
        },
        data: {
            transaction_hash: txHash,
            status: status,
            submitted_at: submittedAt,
            nonce: nonce
        }
    })
}

export async function findTransactionByStatus(status) {
    return prisma.transactions.findMany({
        where: { status: status },
    })
}

