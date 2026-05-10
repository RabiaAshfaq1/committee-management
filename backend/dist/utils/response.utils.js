"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBadRequest = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendCreated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 500, error) => {
    return res.status(statusCode).json({
        success: false,
        message,
        error,
    });
};
exports.sendError = sendError;
const sendCreated = (res, data, message = 'Created successfully') => {
    return (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
const sendNotFound = (res, message = 'Resource not found') => {
    return (0, exports.sendError)(res, message, 404);
};
exports.sendNotFound = sendNotFound;
const sendUnauthorized = (res, message = 'Unauthorized') => {
    return (0, exports.sendError)(res, message, 401);
};
exports.sendUnauthorized = sendUnauthorized;
const sendForbidden = (res, message = 'Forbidden') => {
    return (0, exports.sendError)(res, message, 403);
};
exports.sendForbidden = sendForbidden;
const sendBadRequest = (res, message, error) => {
    return (0, exports.sendError)(res, message, 400, error);
};
exports.sendBadRequest = sendBadRequest;
//# sourceMappingURL=response.utils.js.map