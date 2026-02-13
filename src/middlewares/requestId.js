import { randomUUID } from 'crypto'
export default function requestId(req, res, next) {
    const id = randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
};
