import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sharp.cache(false);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const saveImage = async (file, folderType, subFolder) => {
  if (!file) return null;

  const sanitizedSubFolder = subFolder ? subFolder.replace(/[^a-zA-Z0-9]/g, '_') : 'general';
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderType, sanitizedSubFolder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `${folderType}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const localFilename = `${filename}.webp`;
  const localFilePath = path.join(uploadDir, localFilename);
  const localFileUrl = `/uploads/${folderType}/${sanitizedSubFolder}/${localFilename}`;

  await sharp(file.path)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(localFilePath);

  setTimeout(() => {
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (e) {
      console.error(e);
    }
  }, 1000);

  const useCloud = process.env.USE_CLOUD_STORAGE === 'true';

  if (useCloud) {
    try {
      const result = await cloudinary.uploader.upload(localFilePath, {
        folder: `${process.env.CLOUDINARY_FOLDER || 'gold_app'}/${folderType}/${sanitizedSubFolder}`,
        public_id: filename,
        use_filename: true,
        unique_filename: false,
      });
      
      return result.secure_url; 

    } catch (error) {
      console.error(error);
      return localFileUrl;
    }
  }

  return localFileUrl;
};

export const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;

  const cloudFolder = process.env.CLOUDINARY_FOLDER || 'gold_app';

  if (imageUrl.includes('cloudinary.com')) {
    try {
      const splitUrl = imageUrl.split('/');
      const folderStartIndex = splitUrl.findIndex(part => part === cloudFolder);
      
      if (folderStartIndex !== -1) {
        const pathParts = splitUrl.slice(folderStartIndex);
        const publicIdWithExt = pathParts.join('/');
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error(error);
    }
  }

  try {
    let relativePath = '';

    if (imageUrl.includes('cloudinary.com')) {
      const parts = imageUrl.split('/');
      const folderIndex = parts.indexOf(cloudFolder);
      
      if (folderIndex !== -1) {
        const pathAfterRoot = parts.slice(folderIndex + 1).join('/');
        relativePath = pathAfterRoot;
      }
    } else {
      relativePath = imageUrl.startsWith('/uploads/') 
        ? imageUrl.replace('/uploads/', '') 
        : imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    }

    if (relativePath) {
      const fullLocalPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
      
      if (fs.existsSync(fullLocalPath)) {
        setTimeout(() => {
            try {
                fs.unlinkSync(fullLocalPath);
            } catch (err) {
                console.error(err);
            }
        }, 500);
      }
    }
  } catch (error) {
    console.error(error);
  }
};