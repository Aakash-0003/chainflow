import logger from "../config/logger.js";

export default function errorHandler(err, req, res, next) {
    logger.error("Unhandled middleware error", {
        requestId: req.requestId,
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack
    });

    res.status(err.statusCode || 500).json({
        result: err.status,
        statusCode: err.statusCode,
        error: err.message,
        requestId: req.requestId,
    });
}