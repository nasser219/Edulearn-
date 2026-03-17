import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config({ override: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function fixSpecificAsset(publicId: string) {
  console.log(`🎯 Targeting Specific Asset: ${publicId}...`);
  const resourceTypes = ['image', 'raw', 'video'];
  
  for (const resType of resourceTypes) {
    try {
      console.log(`🔍 Checking as ${resType}...`);
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: resType
      });
      
      console.log(`📦 Found! Folder: ${resource.folder}, Type: ${resource.type}, Access: ${resource.access_mode}`);
      
      if (resource.access_mode !== 'public') {
        console.log("🔧 Flipping to PUBLIC...");
        await cloudinary.api.update(publicId, {
          resource_type: resType,
          access_mode: 'public',
          type: resource.type // Keep the same type (upload/private/authenticated) but make mode public
        });
        console.log("✅ Success! Asset is now PUBLIC.");
      } else {
        console.log("✨ Asset is already PUBLIC.");
      }
      return;
    } catch (e) {
      // Continue searching
    }
  }
  
  console.log("❌ Asset not found with exact ID. Searching by prefix...");
  try {
     const result = await cloudinary.api.resources({
       prefix: publicId.split('/').pop(),
       resource_type: 'image', // Try image first
       max_results: 10
     });
     if (result.resources.length > 0) {
        console.log(`💡 Found ${result.resources.length} matches. Best match: ${result.resources[0].public_id}`);
     }
  } catch (e) {}
}

const targetId = 'educators_content/qf50wessuvizmgul0pzd';
fixSpecificAsset(targetId);
