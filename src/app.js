import express from 'express';
import cors from 'cors';
import httpLogger from './middlewares/httpLogger.js';
import requestId from './middlewares/requestId.js';
import basicAuth from './middlewares/auth.js'
import rateLimiter from './middlewares/rateLimiter.js'
import errorHandler from './middlewares/errorHandler.js'

import healthCheckRouter from './routes/healthCheck.route.js';
import walletRouter from './routes/wallet.route.js';

const app = express();

// Middleware   
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestId);
app.use(httpLogger);
app.use(basicAuth);
app.use(rateLimiter);

//routes
app.use('/v1/health', healthCheckRouter);
app.use('/v1/wallet', walletRouter);

app.use(errorHandler);

export default app;