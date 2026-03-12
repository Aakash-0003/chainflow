import logger from "../config/logger.js";

export default function errorHandler(err, req, res) {
    logger.error("Unhandled middleware error", {
        requestId: req.requestId,
        message: err.message,
        statusCode: err.statusCode,
    });

    res.status(err.statusCode || 500).json({
        status: err.status,
        statusCode: err.statusCode,
        error: err.message,
        requestId: req.requestId,
    });
}