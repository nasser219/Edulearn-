import express from "express";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from 'cloudinary';
import { google } from 'googleapis';
import fs from 'fs';
import path from "path";
import crypto from 'crypto';
import dotenv from "dotenv";
import axios from "axios";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const upload = multer({ storage: multer.memoryStorage() });

dotenv.config({ override: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Google Drive Setup
const DRIVE_KEY_PATH = path.join(process.cwd(), 'google-drive-key.json');
let googleDrive: any = null;

if (fs.existsSync(DRIVE_KEY_PATH)) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: DRIVE_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    googleDrive = google.drive({ version: 'v3', auth });
    console.log("[GOOGLE DRIVE] Service Account loaded successfully.");
  } catch (err) {
    console.error("[GOOGLE DRIVE] Failed to initialize:", err);
  }
} else {
  console.warn("[GOOGLE DRIVE] google-drive-key.json not found. PDF uploads to Drive will be skipped.");
}

console.log("Cloudinary Config Loaded:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? `${process.env.CLOUDINARY_CLOUD_NAME.slice(0, 3)}...` : "NOT_FOUND",
  api_key: process.env.CLOUDINARY_API_KEY ? "EXISTS" : "NOT_FOUND"
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock Payment Callback (for InstaPay/Vodafone Cash simulation)
  app.post("/api/payments/callback", (req, res) => {
    console.log("Payment callback received:", req.body);
    res.json({ success: true });
  });

  // Anti-piracy logging
  app.post("/api/security/log-event", (req, res) => {
    const { userId, eventType, details } = req.body;
    console.warn(`[SECURITY EVENT] User ${userId}: ${eventType}`, details);
    res.json({ logged: true });
  });

  // Cloudinary Signing Route
  app.get("/api/cloudinary/sign", (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || cloudName === 'YOUR_CLOUD_NAME_HERE') {
      console.error("[CLOUDINARY ERROR] Attempted sign with missing/placeholder Cloud Name:", cloudName);
      return res.status(400).json({
        error: "MISSING_CLOUD_NAME",
        message: "اسم السحابة (Cloud Name) غير موجود في ملف الإعدادات."
      });
    }

    // Add logging to verify credentials and params
    try {
      if (!cloudName || !apiKey || !apiSecret) {
        console.error("[CLOUDINARY] Missing credentials in .env!");
        return res.status(500).json({ error: "Missing Cloudinary credentials on server." });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        folder: "educators_content",
        access_mode: "public",
        type: "upload"
      };

      console.log("[CLOUDINARY SIGN] V4 - Signing params:", paramsToSign);

      const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret.trim());

      res.json({
        signature,
        timestamp,
        cloudName,
        apiKey
      });
    } catch (error: any) {
      console.error("[CLOUDINARY SIGN] Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate signature" });
    }
  });

  // Proxy Upload Route (The REAL "Root Fix" for all upload issues)
  app.post("/api/cloudinary/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("[CLOUDINARY PROXY] Received file:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Upload to Cloudinary using the server-side SDK (auto-signs)
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "educators_content",
            access_mode: "public",
            resource_type: "auto", // Automatically detects image, video, or raw
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file!.buffer);
      });

      console.log("[CLOUDINARY PROXY] Upload success:", (result as any).secure_url);

      // GOOGLE DRIVE INTEGRATION for PDFs only
      let driveResult = null;
      if (req.file.mimetype === 'application/pdf' && googleDrive) {
        try {
          console.log("[GOOGLE DRIVE] PDF detected, starting Drive upload...");
          // We need to pass the buffer as a stream to Google Drive
          const { PassThrough } = await import('stream');
          const bufferStream = new PassThrough();
          bufferStream.end(req.file.buffer);

          const response = await googleDrive.files.create({
            requestBody: {
              name: req.file.originalname,
              mimeType: 'application/pdf',
            },
            media: {
              mimeType: 'application/pdf',
              body: bufferStream,
            },
            fields: 'id, webViewLink'
          });
          driveResult = response.data;
          console.log("[GOOGLE DRIVE] Upload success:", driveResult.webViewLink);
        } catch (driveErr: any) {
          console.error("[GOOGLE DRIVE] Error during upload:", driveErr.message);
        }
      }

      res.json({
        ...(result as any),
        googleDrive: driveResult
      });
    } catch (error: any) {
      console.error("[CLOUDINARY PROXY] Upload failed:", error);
      res.status(500).json({ error: error.message || "Server upload failed" });
    }
  });

  // Bunny.net Upload Route
  app.post("/api/bunny/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
      const accessKey = process.env.BUNNY_STORAGE_API_KEY;
      const hostname = process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';

      if (!storageZoneName || !accessKey) {
        return res.status(500).json({ error: "Bunny.net credentials missing on server." });
      }

      console.log("[BUNNY UPLOAD] Starting upload for:", req.file.originalname);

      // Generate a unique path/filename
      const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      const bunnyUrl = `https://${hostname}/${storageZoneName}/videos/${filename}`;

      const response = await axios.put(bunnyUrl, req.file.buffer, {
        headers: {
          'AccessKey': accessKey,
          'Content-Type': 'application/octet-stream',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.status === 201 || response.status === 200) {
        // Construct the public URL (Pull Zone needed for direct streaming, but we'll use a guess or storage URL)
        // Usually: https://[PullZoneName].b-cdn.net/videos/[filename]
        // For now, we'll return the storage path or a placeholder if pull zone isn't known.
        // The user can connect a Pull Zone later.
        const publicUrl = `https://${storageZoneName}.b-cdn.net/videos/${filename}`;
        
        console.log("[BUNNY UPLOAD] Success:", publicUrl);
        res.json({ 
          success: true, 
          url: publicUrl,
          storagePath: `/videos/${filename}`
        });
      } else {
        throw new Error(`Bunny.net returned status ${response.status}`);
      }
    } catch (error: any) {
      console.error("[BUNNY UPLOAD] Failed:", error.response?.data || error.message);
      res.status(500).json({ error: error.message || "فشل الرفع لمخدم Bunny.net" });
    }
  });

  // Bunny Stream: Create Video Entry
  app.post("/api/bunny/create-video", async (req, res) => {
    try {
      const { title } = req.body;
      const libraryId = process.env.VITE_BUNNY_LIBRARY_ID;
      const apiKey = process.env.VITE_BUNNY_STREAM_API_KEY;

      if (!libraryId || !apiKey) {
        console.error("[BUNNY STREAM] Missing credentials:", { libraryId: !!libraryId, apiKey: !!apiKey });
        return res.status(500).json({ error: "Bunny Stream credentials missing on server." });
      }

      console.log("[BUNNY STREAM] Creating video entry:", title);

      const response = await axios.post(
        `https://video.bunnycdn.com/library/${libraryId}/videos`,
        { title: title || "New Video" },
        {
          headers: {
            AccessKey: apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          validateStatus: () => true // Handle errors manually to log body
        }
      );

      console.log("[BUNNY STREAM] API Response Status:", response.status);
      
      if (response.status !== 200 && response.status !== 201) {
        console.error("[BUNNY STREAM] API Error Detail:", response.data);
        return res.status(response.status).json({ 
          error: `Bunny Stream Error: ${JSON.stringify(response.data)}` 
        });
      }

      const videoId = response.data.guid;

      // Generate TUS signature
      // Signature = SHA256(LibraryID + APIKey + ExpirationTime + VideoID)
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const signature = crypto
        .createHash('sha256')
        .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
        .digest('hex');

      res.json({ 
        videoId, 
        signature, 
        expirationTime,
        libraryId 
      });
    } catch (error: any) {
      console.error("[BUNNY STREAM] Create Video Exception:", error.message);
      res.status(500).json({ error: "خطأ داخلي في السيرفر أثناء إنشاء الفيديو" });
    }
  });

  // Signed URL Delivery Route (The "Root" fix for 401 errors)
  app.get("/api/cloudinary/sign-delivery", (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: "Missing URL" });

    // Extract public ID from the URL
    // Format: .../upload/[version]/[public_id]
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return res.json({ signedUrl: url });

      const pathAfterUpload = parts[parts.length - 1]; // e.g. v123/folder/file.pdf
      const pathParts = pathAfterUpload.split('/');
      if (pathParts[0].startsWith('v') && !isNaN(parseInt(pathParts[0].substring(1)))) {
        pathParts.shift(); // Remove version
      }
      
      const publicIdWithExt = pathParts.join('/');
      const publicId = publicIdWithExt.split('.')[0];

      // Sign the URL for 1 hour
      const signedUrl = cloudinary.url(publicId, {
        sign_url: true,
        type: 'upload',
        resource_type: publicIdWithExt.endsWith('.pdf') ? 'image' : 'auto',
        secure: true
      });

      res.json({ signedUrl });
    } catch (err) {
      console.error("Error signing delivery URL:", err);
      res.json({ signedUrl: url });
    }
  });
  
  // AI Quiz Generation Route
  app.post("/api/ai/generate-quiz", upload.single('file'), async (req, res) => {
    try {
      const { text, numQuestions = 10, language = 'ar', questionTypes = 'MCQ,TRUE_FALSE' } = req.body;
      
      const typesList = questionTypes.split(',');
      const typesLabel = typesList
        .map((t: string) => (t === 'MCQ' ? 'اختيار من متعدد' : t === 'TRUE_FALSE' ? 'صح/خطأ' : 'مقالي'))
        .join(' و ');

      let prompt = `أنت خبير تعليمي متخصص في إنشاء الاختبارات. مهمتك تحليل المحتوى التعليمي وتوليد أسئلة اختبار شاملة ودقيقة باللغة العربية.
      
      المطلوب: توليد ${numQuestions} سؤالاً من أنواع (${typesLabel}).
      
      قواعد مهمة:
      1. استخلص المفاهيم الأساسية من المحتوى وأنشئ أسئلة تقيسها.
      2. لأسئلة MCQ (اختيار من متعدد): أنشئ 4 خيارات دائماً، خيار صحيح واحد فقط، والباقي منطقي ومضلل.
      3. لأسئلة TRUE_FALSE (صح/خطأ): الخيارات دائماً ["صح","خطأ"] فقط. الإجابة الصحيحة يجب أن تكون واحدة منهما.
      4. لأسئلة ESSAY (مقالي): لا تضع correctAnswer ولا تضع options.
      5. إذا كان المحتوى يحتوي أسئلة بدون إجابات، استنتج الإجابة الصحيحة من السياق.
      6. اكتب الأسئلة باللغة العربية الفصحى.
      7. تأكد أن الأسئلة متنوعة وتغطي أجزاء مختلفة من المحتوى.
      8. وزّع الأسئلة بالتساوي بين الأنواع المطلوبة قدر الإمكان.

      يجب أن يكون الرد عبارة عن مصفوفة JSON فقط تحتوي على كائنات كالتالي:
      [
        {
          "text": "نص السؤال هنا",
          "type": "MCQ", 
          "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
          "correctAnswer": "خيار 1"
        },
        {
          "text": "نص السؤال هنا (صح أم خطأ؟)",
          "type": "TRUE_FALSE",
          "options": ["صح", "خطأ"],
          "correctAnswer": "صح"
        },
        {
          "text": "نص السؤال المقالي هنا",
          "type": "ESSAY"
        }
      ]

      ملاحظة: إذا كان نوع السؤال MCQ يجب أن توجد خيارات وإجابة صحيحة. وإذا كان TRUE_FALSE يجب أن توجد خيارات ["صح", "خطأ"] وإجابة صحيحة.
      
      المحتوى لتحليله:
      ${text || "قم باستخراج المحتوى من الملف المرفق."}`;

      let result;
      if (req.file) {
        console.log("[AI QUIZ] Processing file:", req.file.originalname);
        const part = {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        };
        result = await model.generateContent([prompt, part]);
      } else if (text) {
        console.log("[AI QUIZ] Processing text input");
        result = await model.generateContent(prompt);
      } else {
        return res.status(400).json({ error: "الرجاء إدخال نص أو رفع ملف أولاً." });
      }

      const responseText = result.response.text();
      // Use more robust JSON extraction
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
         console.error("[AI QUIZ] Failed to find JSON in response:", responseText);
         return res.status(500).json({ error: "فشل الذكاء الاصطناعي في توليد تنسيق صحيح للأسئلة." });
      }
      
      let questions = JSON.parse(jsonMatch[0].trim());
      
      // Safety check and ID assignment
      questions = questions.map((q: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        text: q.text || "سؤال جديد",
        type: q.type || "MCQ",
        options: q.options || (q.type === 'TRUE_FALSE' ? ["صح", "خطأ"] : undefined),
        correctAnswer: q.correctAnswer
      }));

      res.json({ questions });
    } catch (error: any) {
      console.error("[AI QUIZ] Generation failed:", error);
      res.status(500).json({ error: "حدث خطأ أثناء محاولة توليد الأسئلة: " + error.message });
    }
  });

  // Media Proxy Route (The ultimate "Root" fix for any 401/404/Access issues)
  app.get("/api/media/proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
      return res.status(400).send("Invalid URL");
    }

    const forwardHeaders = (response: any) => {
      const headers = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'cache-control'];
      headers.forEach(h => {
        if (response.headers[h]) res.setHeader(h, response.headers[h]);
      });
      
      if (req.query.download === 'true') {
        const filename = url.split('/').pop()?.split('?')[0] || 'file.pdf';
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
    };

    const fetchStream = async (targetUrl: string) => {
      const headers: any = {};
      if (req.headers.range) headers.range = req.headers.range;
      if (req.headers['if-none-match']) headers['if-none-match'] = req.headers['if-none-match'];

      try {
        console.log("[MEDIA PROXY] Attempting:", targetUrl);
        return await axios({
          url: targetUrl,
          method: 'GET',
          responseType: 'stream',
          timeout: 30000,
          headers,
          validateStatus: (status) => status < 500 // Don't throw on 401/404
        });
      } catch (err: any) {
        console.error("[MEDIA PROXY] Axis Error:", err.message);
        return null;
      }
    };

    // 1. Try initial URL
    let resp = await fetchStream(url);

    // 2. Handle 401/404 with Signing & Resource Type Swapping
    if (!resp || resp.status === 401 || resp.status === 404) {
      console.warn(`[MEDIA PROXY] Initial fetch failed (${resp?.status}), retrying with signing...`);
      
      try {
        const parts = url.split('/upload/');
        if (parts.length >= 2) {
          // Robust Public ID Extraction
          const pathAfterUpload = parts[parts.length - 1].split('?')[0];
          const pathParts = pathAfterUpload.split('/');
          if (pathParts[0].startsWith('v') && !isNaN(parseInt(pathParts[0].substring(1)))) {
            pathParts.shift(); // Remove version
          }
          const publicIdWithExt = pathParts.join('/');
          
          // Candidate Resource Types
          const resourceTypes = publicIdWithExt.endsWith('.pdf') ? ['image', 'raw'] : 
                                publicIdWithExt.match(/\.(mp4|mov|webm|ogg)$/i) ? ['video'] : 
                                ['image', 'video', 'raw'];
          
          for (const rType of resourceTypes) {
            const publicId = (rType === 'image' || rType === 'video') 
              ? publicIdWithExt.split('.').slice(0, -1).join('.') 
              : publicIdWithExt;

            const authTypes = ['upload', 'authenticated'];
            for (const aType of authTypes) {
              const signedUrl = cloudinary.url(publicId, {
                sign_url: true,
                type: aType,
                resource_type: rType,
                secure: true
              });

              resp = await fetchStream(signedUrl);
              if (resp && resp.status >= 200 && resp.status < 400) break;
            }
            if (resp && resp.status >= 200 && resp.status < 400) break;
          }
        }
      } catch (err: any) {
        console.error("[MEDIA PROXY] Signing Logic Failed:", err.message);
      }
    }

    if (resp && resp.status < 400) {
      forwardHeaders(resp);
      res.status(resp.status);
      resp.data.pipe(res);
    } else {
      console.error("[MEDIA PROXY] Final Delivery Failed.");
      res.status(resp?.status || 500).send("فشل في تحميل الوسائط. يرجى التأكد من الرابط.");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Educators Academy Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[FATAL ERROR] Port ${PORT} is already in use.`);
      console.error(`Please run the following command to clear the port:`);
      console.error(`taskkill /F /IM node.exe /T\n`);
      process.exit(1);
    } else {
      console.error("[SERVER ERROR]", err);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[SHUTDOWN] Closing server and cleaning up...");
    server.close(() => {
      console.log("[SHUTDOWN] Express server closed.");
      process.exit(0);
    });
    
    // Force exit after 5s if server.close hangs
    setTimeout(() => {
      console.error("[SHUTDOWN] Forced exit due to timeout.");
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
