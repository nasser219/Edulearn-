import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config({ override: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function makeFolderPublic(folder: string) {
  console.log(`🚀 Starting Comprehensive Bulk Public Access for folder: ${folder}...`);
  const types: ("upload" | "private" | "authenticated")[] = ['upload', 'private', 'authenticated'];
  const resourceTypes = ['image', 'raw', 'video'];

  try {
    for (const resType of resourceTypes) {
      for (const type of types) {
        console.log(`🔍 Searching ${resType} / ${type}...`);
        const result = await cloudinary.api.resources({
          resource_type: resType,
          type: type,
          prefix: folder,
          max_results: 500
        });

        console.log(`📦 Found ${result.resources.length} assets.`);

        for (const resource of result.resources) {
          console.log(`🔧 Updating: ${resource.public_id} (${resource.format}) [current: ${type}]`);
          
          try {
            await cloudinary.api.update(resource.public_id, {
              access_mode: 'public',
              resource_type: resType,
              type: type // The current type is needed for update
            });
            console.log(`✅ Success: ${resource.public_id} is now PUBLIC.`);
          } catch (e: any) {
            console.error(`❌ Failed to update ${resource.public_id}:`, e.message);
          }
        }
      }
    }

    console.log("⭐ Comprehensive Bulk Public Access completed!");
  } catch (err) {
    console.error("❌ Fatal Error during bulk update:", err);
  }
}

makeFolderPublic('educators_content');
