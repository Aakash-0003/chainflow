import express from 'express';
import { importWalletController, getWalletController, updateWalletController, enableChainsController } from '../controllers/wallet.controller.js'
const router = express.Router();

router.post('/import', importWalletController);

router.get('/:publicAddress', getWalletController);

router.patch('/:publicAddress/status', updateWalletController)

router.patch('/:walletId/enableChain', enableChainsController)


export default router;