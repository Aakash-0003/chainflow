import morgan from "morgan";
import logger from "../config/logger.js";

morgan.token("requestId", (req) => req.requestId || "unknown");
morgan.token("body", (req) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return "-";
    }
    return JSON.stringify(req.body);
});
const stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};


export default morgan(
    ":requestId :method :url :status :response-time ms :body",
    { stream }
);
