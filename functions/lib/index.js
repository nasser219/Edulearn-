"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicProxy = exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const api_1 = __importDefault(require("./api"));
admin.initializeApp();
/**
 * Main API function wrapping the Express app
 */
exports.api = functions
    .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
})
    .https.onRequest(api_1.default);
/**
 * دالة وكيل لـ Google Gemini AI (تعمل كبديل لـ Anthropic في هذا المشروع)
 */
exports.anthropicProxy = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    // التحقق من وجود مفتاح API (ندعم كلا المسميين لضمان المرونة)
    const apiKey = functions.config().anthropic?.key || functions.config().gemini?.key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini/Anthropic API key is not configured.');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    try {
        // استخراج البيانات من الـ payload المرسل بتنسيق Anthropic
        const payload = data.payload || {};
        const systemPrompt = payload.system || '';
        const messages = payload.messages || [];
        // تحويل الرسائل إلى نص واحد لـ Gemini
        let userPrompt = messages.map((m) => {
            if (typeof m.content === 'string')
                return m.content;
            if (Array.isArray(m.content)) {
                return m.content.map((c) => c.text || '').join('\n');
            }
            return '';
        }).join('\n');
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        // البحث عن ملفات (صور أو PDF) في الرسائل
        let filePart = null;
        if (Array.isArray(messages)) {
            for (const m of messages) {
                if (Array.isArray(m.content)) {
                    const fileContent = m.content.find((c) => c.type === 'image' || c.type === 'document');
                    if (fileContent && fileContent.source) {
                        filePart = {
                            inlineData: {
                                data: fileContent.source.data,
                                mimeType: fileContent.source.media_type,
                            },
                        };
                        break;
                    }
                }
            }
        }
        let result;
        if (filePart) {
            result = await model.generateContent([fullPrompt, filePart]);
        }
        else {
            result = await model.generateContent(fullPrompt);
        }
        const responseText = result.response.text();
        // إرجاع التنسيق الذي يتوقعه الفرونت إند (تنسيق Anthropic)
        return {
            content: [
                {
                    type: 'text',
                    text: responseText
                }
            ]
        };
    }
    catch (error) {
        console.error('[PROXY ERROR]', error);
        throw new functions.https.HttpsError('internal', error.message || 'Error communicating with AI');
    }
});
//# sourceMappingURL=index.js.map