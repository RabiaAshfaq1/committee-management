"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAnyRole = exports.requireOrganizer = exports.requireAdmin = exports.requireRole = void 0;
const response_utils_1 = require("../utils/response.utils");
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_utils_1.sendForbidden)(res, 'Not authenticated');
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, response_utils_1.sendForbidden)(res, `Access denied. Required roles: ${roles.join(', ')}`);
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)('SUPER_ADMIN');
exports.requireOrganizer = (0, exports.requireRole)('SUPER_ADMIN', 'ORGANIZER');
exports.requireAnyRole = (0, exports.requireRole)('SUPER_ADMIN', 'ORGANIZER', 'MEMBER');
//# sourceMappingURL=role.middleware.js.map