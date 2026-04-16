import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const chains = [
    {
        chainId: 11155111,
        name: "Ethereum Sepolia",
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        nativeToken: "ETH",
        status: "active",
    },
    {
        chainId: 80002,
        name: "Polygon Amoy",
        rpcUrl: "https://polygon-amoy-bor-rpc.publicnode.com",
        nativeToken: "POL",
        status: "active",
    },
    {
        chainId: 84532,
        name: "Base Sepolia",
        rpcUrl: "https://base-sepolia-rpc.publicnode.com",
        nativeToken: "ETH",
        status: "active",
    },
    {
        chainId: 11155420,
        name: "OP Sepolia",
        rpcUrl: "https://optimism-sepolia-rpc.publicnode.com",
        nativeToken: "ETH",
        status: "active",
    },
    {
        chainId: 11142220,
        name: "Celo Sepolia",
        rpcUrl: "https://rpc.ankr.com/celo_sepolia",
        nativeToken: "CELO",
        status: "active",
    },
    {
        chainId: 43113,
        name: "Avalanche Fuji",
        rpcUrl: "https://avalanche-fuji-c-chain-rpc.publicnode.com",
        nativeToken: "AVAX",
        status: "active",
    },
    {
        chainId: 97,
        name: "BNB Smartchain Testnet",
        rpcUrl: "https://bsc-testnet-rpc.publicnode.com",
        nativeToken: "BNB",
        status: "active",
    },
];

async function main() {
    for (const chain of chains) {
        await prisma.chain.upsert({
            where: { chainId: chain.chainId },
            update: chain,
            create: chain,
        });
    }
    console.log(`Seeded ${chains.length} chains`);
}

main()
    .catch((e) => {
        console.error("Seeding failed", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });