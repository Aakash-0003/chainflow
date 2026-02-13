import { Interface } from "ethers";

function buildTransactionData({ functionSignature, args }) {

    const contractInterface = new Interface([functionSignature]);
    const fragment = contractInterface.getFunction(functionSignature);
    return contractInterface.encodeFunctionData(fragment, args);
}

export default buildTransactionData;