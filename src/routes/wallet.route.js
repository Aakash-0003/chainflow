import express from 'express';
import { importWalletController, getWalletController, updateWalletController } from '../controllers/wallet.controller.js'
const router = express.Router();

router.post('/import', importWalletController);

router.get('/:publicAddress', getWalletController);

router.patch('/:publicAddress/status', updateWalletController)

export default router;