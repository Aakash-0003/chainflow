import { rateLimit } from 'express-rate-limit';
import logger from '../config/logger.js'

export default rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn("Rate limit exceeded", {
            requestId: req.requestId,
            ip: req.ip,
        });
        res.status(429).json({
            error: "Too many requests",
            requestId: req.requestId,
        });
    },
});