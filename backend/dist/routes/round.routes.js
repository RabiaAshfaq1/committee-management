"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const round_controller_1 = require("../controllers/round.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/start', role_middleware_1.requireOrganizer, round_controller_1.startRound);
router.get('/:committeeId', round_controller_1.getRoundsByCommittee);
router.put('/:id/complete', role_middleware_1.requireOrganizer, round_controller_1.completeRound);
exports.default = router;
//# sourceMappingURL=round.routes.js.map