import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
    const chains = [
        {
            chain_id: 11155111,
            name: "Ethereum Sepolia",
            rpc_url: "https://ethereum-sepolia-rpc.publicnode.com",
            native_token: "ETH",
            status: "active",
        },
        {
            chain_id: 80002,
            name: "Polygon Amoy",
            rpc_url: "https://polygon-amoy-bor-rpc.publicnode.com",
            native_token: "POL",
            status: "active",
        },
        {
            chain_id: 84532,
            name: "Base Sepolia",
            rpc_url: "https://base-sepolia-rpc.publicnode.com",
            native_token: "ETH",
            status: "active",
        },
        {
            chain_id: 11155420,
            name: "OP Sepolia",
            rpc_url: "https://optimism-sepolia-rpc.publicnode.com",
            native_token: "ETH",
            status: "active",
        },
        {
            chain_id: 11142220,
            name: "Celo Sepolia",
            rpc_url: "https://rpc.ankr.com/celo_sepolia",
            native_token: "CELO",
            status: "active",
        },
        {
            chain_id: 43113,
            name: "Avalanche Fuji",
            rpc_url: "https://avalanche-fuji-c-chain-rpc.publicnode.com",
            native_token: "AVAX",
            status: "active",
        },
        {
            chain_id: 97,
            name: "BNB Smartchain Testnet",
            rpc_url: "https://bsc-testnet-rpc.publicnode.com",
            native_token: "BNB",
            status: "active",
        }
    ];

    for (const chain of chains) {
        await prisma.chains.upsert({
            where: { chain_id: chain.chain_id },
            update: chain,
            create: chain,
        });
    }
}

main()
    .then(() => {
    })
    .catch((e) => {
        console.error("Seeding failed", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
