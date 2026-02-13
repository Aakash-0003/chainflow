import logger from "../config/logger.js";

export default function errorHandler(err, req, res, next) {
    logger.error("Unhandled middleware error", {
        requestId: req.requestId,
        message: err.message,
        stack: err.stack,
    });

    res.status(500).json({
        error: err.message,
        requestId: req.requestId,
    });
}
