import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import apiApp from './api';

admin.initializeApp();

/**
 * Main API function wrapping the Express app
 */
export const api = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https.onRequest(apiApp);

/**
 * دالة وكيل لـ Google Gemini AI (تعمل كبديل لـ Anthropic في هذا المشروع)
 */
export const anthropicProxy = functions
  .region('us-central1')
  .https.onCall(async (data: any, context) => {
    // التحقق من وجود مفتاح API (ندعم كلا المسميين لضمان المرونة)
    const apiKey = functions.config().anthropic?.key || functions.config().gemini?.key || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Gemini/Anthropic API key is not configured.'
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    try {
      // استخراج البيانات من الـ payload المرسل بتنسيق Anthropic
      const payload = data.payload || {};
      const systemPrompt = payload.system || '';
      const messages = payload.messages || [];
      
      // تحويل الرسائل إلى نص واحد لـ Gemini
      let userPrompt = messages.map((m: any) => {
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          return m.content.map((c: any) => c.text || '').join('\n');
        }
        return '';
      }).join('\n');

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      // البحث عن ملفات (صور أو PDF) في الرسائل
      let filePart: any = null;
      if (Array.isArray(messages)) {
        for (const m of messages) {
          if (Array.isArray(m.content)) {
            const fileContent = m.content.find((c: any) => c.type === 'image' || c.type === 'document');
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
      } else {
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
    } catch (error: any) {
      console.error('[PROXY ERROR]', error);
      throw new functions.https.HttpsError('internal', error.message || 'Error communicating with AI');
    }
  });
