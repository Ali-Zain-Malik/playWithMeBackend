export function sendJsonResponse(req, res, next) {
    res.sendResponse = (body = {}, code = 200) => {
        return res.status(code).json({
            code,
            body,
        });
    };
    next();
}