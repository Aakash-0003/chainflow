import { ethers, JsonRpcProvider } from 'ethers';

export async function getWalletBalance(publicAddress, rpcUrl) {
    try {
        const provider = new JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(publicAddress);
        return ethers.formatEther(balance);
    } catch (error) {
        console.error("Error fetching balance:", error);
        throw new Error("Unable to fetch wallet balance");
    }
}
