"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const response_utils_1 = require("../utils/response.utils");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, response_utils_1.sendUnauthorized)(res, 'No token provided');
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_utils_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch {
        (0, response_utils_1.sendUnauthorized)(res, 'Invalid or expired token');
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map