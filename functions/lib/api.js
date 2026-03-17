"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cloudinary_1 = require("cloudinary");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const multer_1 = __importDefault(require("multer"));
const generative_ai_1 = require("@google/generative-ai");
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Middleware
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
// Cloudinary Config
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});
// Gemini Setup
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// API Routes
app.get("/health", (req, res) => {
    res.json({ status: "ok", environment: "firebase-functions" });
});
app.get("/cloudinary/sign", (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({ error: "Missing Cloudinary credentials on server." });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
        timestamp,
        folder: "educators_content",
        access_mode: "public",
        type: "upload"
    };
    const signature = cloudinary_1.v2.utils.api_sign_request(paramsToSign, apiSecret.trim());
    res.json({ signature, timestamp, cloudName, apiKey });
});
app.post("/bunny/create-video", async (req, res) => {
    try {
        const { title } = req.body;
        const libraryId = process.env.VITE_BUNNY_LIBRARY_ID;
        const apiKey = process.env.VITE_BUNNY_STREAM_API_KEY;
        if (!libraryId || !apiKey) {
            return res.status(500).json({ error: "Bunny Stream credentials missing on server." });
        }
        const response = await axios_1.default.post(`https://video.bunnycdn.com/library/${libraryId}/videos`, { title: title || "New Video" }, {
            headers: {
                AccessKey: apiKey,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            validateStatus: () => true
        });
        if (response.status !== 200 && response.status !== 201) {
            return res.status(response.status).json({
                error: `Bunny Stream Error: ${JSON.stringify(response.data)}`
            });
        }
        const videoId = response.data.guid;
        const expirationTime = Math.floor(Date.now() / 1000) + 3600;
        const signature = crypto_1.default
            .createHash('sha256')
            .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
            .digest('hex');
        res.json({ videoId, signature, expirationTime, libraryId });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});
app.post("/ai/generate-quiz", upload.single('file'), async (req, res) => {
    try {
        const { text, numQuestions = 10, questionTypes = 'MCQ,TRUE_FALSE' } = req.body;
        const typesList = questionTypes.split(',');
        const typesLabel = typesList
            .map((t) => (t === 'MCQ' ? 'اختيار من متعدد' : t === 'TRUE_FALSE' ? 'صح/خطأ' : 'مقالي'))
            .join(' و ');
        let prompt = `أنت خبير تعليمي متخصص في إنشاء الاختبارات. المطلوب: توليد ${numQuestions} سؤالاً من أنواع (${typesLabel}).
    رد عبارة عن مصفوفة JSON فقط تحتوي على كائنات كالتالي:
    [{"text": "نص السؤال", "type": "MCQ", "options": ["1", "2", "3", "4"], "correctAnswer": "1"}]
    أكمل التوليد بناءً على المحتوى التالي: ${text || ""}`;
        let result;
        if (req.file) {
            const part = {
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype,
                },
            };
            result = await model.generateContent([prompt, part]);
        }
        else {
            result = await model.generateContent(prompt);
        }
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch)
            throw new Error("Failed to generate valid JSON");
        let questions = JSON.parse(jsonMatch[0].trim());
        questions = questions.map((q) => ({
            id: Math.random().toString(36).substr(2, 9),
            ...q
        }));
        res.json({ questions });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Proxy route for Cloudinary access
app.get("/media/proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
        return res.status(400).send("Invalid URL");
    }
    try {
        const response = await (0, axios_1.default)({
            url: url,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000,
            validateStatus: (status) => status < 400
        });
        res.setHeader('Content-Type', response.headers['content-type']);
        if (req.query.download === 'true') {
            const filename = url.split('/').pop() || 'file.pdf';
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }
        response.data.pipe(res);
    }
    catch (err) {
        res.status(500).send("Failed to proxy media");
    }
});
exports.default = app;
//# sourceMappingURL=api.js.map