import { rateLimit } from 'express-rate-limit';
import AppError from '../errors/AppError.js';

export default rateLimit({
    //review this according to rpc limits later
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        try {
            throw new AppError("Too many requests", 429);
        } catch (error) {
            next(error);
        }
    }
});

