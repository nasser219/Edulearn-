import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config({ override: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function testFetch(url: string) {
  try {
    console.log(`Testing URL: ${url}`);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer', // Just to check if it can be fetched
      timeout: 5000
    });
    console.log(`✅ Success! Status: ${response.status}, Content-Type: ${response.headers['content-type']}`);
  } catch (err: any) {
    console.error(`❌ Failed! Status: ${err.response?.status}, Error: ${err.message}`);
    if (err.response?.status === 404) {
      console.log("   (Possibly invalid transformation or wrong resource type)");
    }
  }
}

async function run() {
  // Replace with a real URL from your Cloudinary if you have one, or use a placeholder to see logic
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.error("Missing CLOUDINARY_CLOUD_NAME in .env");
    return;
  }

  // Example suspect URL format
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v1/educators_content/test.pdf`;
  const proxifiedUrl = baseUrl.replace('/upload/', '/upload/fl_attachment/');

  console.log("--- Testing standard URL ---");
  await testFetch(baseUrl);
  
  console.log("\n--- Testing URL with fl_attachment ---");
  await testFetch(proxifiedUrl);
}

run();
