import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function fixCloudinaryFiles() {
  console.log("Starting to fix existing Cloudinary files to be PUBLIC (access_mode = public)...");
  
  try {
    let next_cursor;
    let count = 0;
    
    // 1. Convert any 'authenticated' type files to 'upload' type (public delivery)
    console.log("Phase 1: Checking for 'authenticated' files to convert to 'upload'...");
    do {
      try {
        const res = await cloudinary.api.resources({
          type: 'authenticated',
          prefix: 'educators_content/',
          max_results: 100,
          next_cursor
        });

        for (const file of res.resources) {
          console.log(`Converting ${file.public_id} from private to public delivery...`);
          await cloudinary.uploader.rename(file.public_id, file.public_id, {
            from_type: 'authenticated',
            to_type: 'upload',
            overwrite: true
          });
          count++;
        }
        next_cursor = res.next_cursor;
      } catch (err) {
        console.log("No authenticated files found or error occurred.");
        next_cursor = null;
      }
    } while (next_cursor);

    // 2. Set 'access_mode' = 'public' for all 'upload' type files 
    console.log("Phase 2: Removing any access_mode restrictions on 'upload' files...");
    next_cursor = undefined;
    do {
      try {
        const res = await cloudinary.api.resources({
          type: 'upload',
          prefix: 'educators_content/',
          max_results: 100,
          next_cursor
        });

        for (const file of res.resources) {
          console.log(`Setting access_mode=public for: ${file.public_id}`);
          await cloudinary.api.update(file.public_id, {
            access_mode: 'public'
          });
          count++;
        }
        next_cursor = res.next_cursor;
      } catch (err) {
        console.log("Error updating access mode. Moving on...");
        next_cursor = null;
      }
    } while (next_cursor);

    console.log(`✅ Successfully forced ${count} operations to make your files completely PUBLIC!`);
  } catch(e) {
    console.error("Error fixing cloudinary:", e);
  }
}

fixCloudinaryFiles();
