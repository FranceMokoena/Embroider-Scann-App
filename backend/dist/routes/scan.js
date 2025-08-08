"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/scan.ts
const express_1 = require("express");
const scanController_1 = require("../controllers/scanController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.requireAuth, scanController_1.addScan);
exports.default = router;
//# sourceMappingURL=scan.js.map