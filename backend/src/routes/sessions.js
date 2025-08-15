"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/sessions.ts
const express_1 = require("express");
const sessionController_1 = require("../controllers/sessionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/start', auth_1.requireAuth, sessionController_1.startSession);
router.post('/stop', auth_1.requireAuth, sessionController_1.stopSession);
exports.default = router;
//# sourceMappingURL=sessions.js.mapZ