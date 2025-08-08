"use strict";
// backend/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const scan_1 = __importDefault(require("./routes/scan"));
dotenv_1.default.config();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not defined');
    process.exit(1);
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get('/', (_req, res) => {
    res.json({ status: '✅ API is running', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/sessions', sessions_1.default);
app.use('/api/scan', scan_1.default);
// Connect & start
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Listening on http://localhost:${PORT}`));
})
    .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map