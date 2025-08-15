"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/scan.ts
const express_1 = require("express");
const scanController_1 = require("../controllers/scanController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.requireAuth, scanController_1.addScan);
router.get('/history', auth_1.requireAuth, scanController_1.getUserScans);
// Admin notification endpoint for screen actions
router.post('/notify', auth_1.requireAuth, scanController_1.notifyScreenAction);
// Delete screens endpoint
router.delete('/delete', auth_1.requireAuth, scanController_1.deleteScreens);
exports.default = router;
//# sourceMappingURL=scan.js.map