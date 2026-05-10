"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const member_controller_1 = require("../controllers/member.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', role_middleware_1.requireOrganizer, member_controller_1.getAllMembers);
router.get('/:id/history', member_controller_1.getMemberCommitteeHistory);
router.get('/:id', member_controller_1.getMemberById);
router.post('/', role_middleware_1.requireOrganizer, member_controller_1.createMember);
router.put('/:id', role_middleware_1.requireOrganizer, member_controller_1.updateMember);
router.patch('/:id/deactivate', role_middleware_1.requireOrganizer, member_controller_1.deactivateMember);
exports.default = router;
//# sourceMappingURL=member.routes.js.map