import express from 'express';
import { importWalletController, getWalletController, updateWalletController, enableChainsController } from '../controllers/wallet.controller.js'
import { validateImportWallet, validateGetWallet, validateUpdateWalletStatus, validateEnableChains } from '../middlewares/validation.js'

const router = express.Router();

router.post('/import', validateImportWallet, importWalletController);

router.get('/:publicAddress', validateGetWallet, getWalletController);

router.patch('/:publicAddress/status', validateUpdateWalletStatus, updateWalletController)

router.patch('/:walletId/chains', validateEnableChains, enableChainsController)


export default router;