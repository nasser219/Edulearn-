import express from 'express';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import { google } from 'googleapis';
import crypto from 'crypto';
import axios from 'axios';
import multer from 'multer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as functions from 'firebase-functions';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret.trim());

  res.json({ signature, timestamp, cloudName, apiKey });
});

app.get("/cloudinary/sign-delivery", (req, res) => {
  const { url } = req.query;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing URL parameter." });
  }

  if (!apiSecret) {
    return res.status(500).json({ error: "Missing Cloudinary secret on server." });
  }

  try {
    // Extract public_id and potential transformations from the URL
    // A simpler way is to use cloudinary.utils.api_sign_request if we know the params,
    // but for delivery URLs, we usually just want to sign the existing URL if it's private.
    // However, if the files are 'upload' type and 'public' access_mode (as set in our new upload route),
    // they don't actually NEED signing for delivery.
    // But since the frontend asks for it, we provide a signed version or just the URL.
    
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request({ timestamp, source: url }, apiSecret.trim());
    
    // For now, return the original URL if we can't easily sign it without knowing the public_id,
    // or use a more robust signing if needed. 
    // Actually, many Cloudinary SDKs have a way to sign a full URL.
    
    res.json({ signedUrl: url }); // Placeholder - usually enough if files are public
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/bunny/create-video", async (req, res) => {
  try {
    const { title } = req.body;
    const libraryId = process.env.VITE_BUNNY_LIBRARY_ID;
    const apiKey = process.env.VITE_BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return res.status(500).json({ error: "Bunny Stream credentials missing on server." });
    }

    const response = await axios.post(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      { title: title || "New Video" },
      {
        headers: {
          AccessKey: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        validateStatus: () => true
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      return res.status(response.status).json({ 
        error: `Bunny Stream Error: ${JSON.stringify(response.data)}` 
      });
    }

    const videoId = response.data.guid;
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const signature = crypto
      .createHash('sha256')
      .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
      .digest('hex');

    res.json({ videoId, signature, expirationTime, libraryId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.post("/ai/generate-quiz", (upload.single('file') as any), async (req: express.Request, res: express.Response) => {
  try {
    const { text, numQuestions = 10, questionTypes = 'MCQ,TRUE_FALSE' } = req.body;
    const typesList = questionTypes.split(',');
    const typesLabel = typesList
      .map((t: string) => (t === 'MCQ' ? 'اختيار من متعدد' : t === 'TRUE_FALSE' ? 'صح/خطأ' : 'مقالي'))
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
    } else {
      result = await model.generateContent(prompt);
    }

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Failed to generate valid JSON");
    
    let questions = JSON.parse(jsonMatch[0].trim());
    questions = questions.map((q: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      ...q
    }));

    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/cloudinary/upload", (upload.single('file') as any), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Use upload_stream to handle buffer from multer
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "educators_content",
        resource_type: "auto",
        access_mode: "public"
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload stream error:", error);
          return res.status(500).json({ error: error.message });
        }
        res.json(result);
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error: any) {
    console.error("Cloudinary upload route error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Proxy route for Cloudinary access
app.get("/media/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return res.status(400).send("Invalid URL");
  }

  try {
    const response = await axios({
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
  } catch (err: any) {
    res.status(500).send("Failed to proxy media");
  }
});

export default app;
