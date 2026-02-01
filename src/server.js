import app from './app.js';
import { config } from './config/env.js';
import logger from './config/logger.js';
import prisma from '../prisma/prisma.js'

const startServer = () => {
    if (!config.encryptionKey) {
        throw new Error("ENCRYPTION KEY is missing");
    }

    app.listen(config.port, () => {
        logger.info(`Server is running on port ${config.port}`);
    });
};

startServer();