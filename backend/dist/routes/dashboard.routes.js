"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/stats', dashboard_controller_1.getDashboardStats);
router.get('/recent-activity', dashboard_controller_1.getRecentActivity);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map