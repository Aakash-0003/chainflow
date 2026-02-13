import logger from "../config/logger.js";
import { config } from "../config/env.js"
export default function basicAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Basic ")) {
        logger.warn("Missing basic auth header", {
            requestId: req.requestId,
        });
        return res.status(401).json({ error: "Unauthorized" });
    }

    const base64 = header.split(" ")[1];
    const decoded = Buffer.from(base64, "base64").toString("utf-8");

    const [username, password] = decoded.split(":");
    if (
        username !== config.basicAuth.username ||
        password !== config.basicAuth.password
    ) {
        logger.warn("Invalid basic auth credentials", {
            requestId: req.requestId,
            username,
        });
        return res.status(403).json({ error: "Forbidden" });
    }

    req.auth = { type: "basic", username };
    logger.info("Authorization successfull!", {
        requestId: req.requestId,
        username,
    });
    next();
}
