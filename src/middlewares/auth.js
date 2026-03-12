import logger from "../config/logger.js";
import { config } from "../config/env.js";
import AppError from "../errors/AppError.js";
export default function basicAuth(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith("Basic ")) {
            throw new AppError("Authentication required", 401);
        }

        const base64 = header.split(" ")[1];
        const decoded = Buffer.from(base64, "base64").toString("utf-8");

        const [username, password] = decoded.split(":");
        if (
            username !== config.basicAuth.username ||
            password !== config.basicAuth.password
        ) {
            throw new AppError("Invalid credentials", 403);
        }

        req.auth = { type: "basic", username };
        next();
    } catch (error) {
        logger.error("Error in basicAuth middleware", {
            requestId: req.requestId,
            message: error.message,
            stack: error.stack,
        });
        next(error);
    }
}
