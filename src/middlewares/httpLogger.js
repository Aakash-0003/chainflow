import morgan from "morgan";
import logger from "../config/logger.js";

morgan.token("requestId", (req) => req.requestId || "unknown");

const stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};


export default morgan(
    ":requestId :method :url :status :response-time ms",
    { stream }
);
