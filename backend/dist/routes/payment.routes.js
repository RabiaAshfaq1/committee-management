"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', role_middleware_1.requireOrganizer, payment_controller_1.getAllPayments);
router.get('/overdue', role_middleware_1.requireOrganizer, payment_controller_1.getOverduePayments);
router.get('/round/:roundId', payment_controller_1.getPaymentsByRound);
router.get('/member/:memberId', payment_controller_1.getPaymentsByMember);
router.patch('/:id/pay', role_middleware_1.requireOrganizer, payment_controller_1.markPaymentPaid);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map