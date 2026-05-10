"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const committee_controller_1 = require("../controllers/committee.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', committee_controller_1.getAllCommittees);
router.get('/:id', committee_controller_1.getCommitteeById);
router.post('/', role_middleware_1.requireOrganizer, committee_controller_1.createCommittee);
router.put('/:id', role_middleware_1.requireOrganizer, committee_controller_1.updateCommittee);
router.delete('/:id', role_middleware_1.requireOrganizer, committee_controller_1.deleteCommittee);
router.post('/:id/members', role_middleware_1.requireOrganizer, committee_controller_1.addMember);
router.delete('/:id/members/:memberId', role_middleware_1.requireOrganizer, committee_controller_1.removeMember);
router.post('/:id/assign-turns', role_middleware_1.requireOrganizer, committee_controller_1.assignTurns);
exports.default = router;
//# sourceMappingURL=committee.routes.js.map