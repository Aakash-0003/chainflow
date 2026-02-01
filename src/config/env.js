import { configDotenv } from "dotenv";
configDotenv();
export const config = {
    port: process.env.PORT,
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    },
    rpc: {
        amoy: process.env.AMOY_RPC_URL,
        sepolia: process.env.SEPOLIA_RPC_URL,
        fuji: process.env.FUJI_RPC_URL,
        baseSepolia: process.env.BASESEPOLIA_RPC_URL,
        celoSepolia: process.env.CELO_SEPOLIA_RPC_URL,
        bnbTestnet: process.env.BNBTESTNET_RPC_URL,
        opSepolia: process.env.OPSEPOLIA_RPC_URL
    },
    basicAuth: {
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD
    },
    encryptionKey: process.env.ENCRYPTION_KEY
}

