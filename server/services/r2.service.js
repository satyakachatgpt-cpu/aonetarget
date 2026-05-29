import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// R2 requires explicitly setting the endpoint
const getS3Client = () => {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
};

/**
 * Uploads a local file to Cloudflare R2
 * @param {string} filePath - The local temp file path
 * @param {string} originalName - Original name of the uploaded file
 * @param {string} mimetype - Mimetype of the file
 * @returns {Promise<Object>} - Object with url and public_id (same format as Cloudinary)
 */
export const uploadFileToR2 = async (filePath, originalName, mimetype) => {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    throw new Error('R2 configuration missing. Please check your environment variables.');
  }

  const s3 = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const baseUrl = process.env.R2_PUBLIC_BASE_URL; // e.g., https://files.aonetarget.in

  // Generate safe filename structure: aot/documents/YYYY/MM/timestamp-random-original-name
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Make filename safe
  const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '').toLowerCase();
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  
  const key = `aot/documents/${year}/${month}/${uniqueSuffix}-${safeOriginalName}`;

  // Read file from disk
  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;
  const fileExtension = path.extname(originalName).replace('.', '') || 'raw';

  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mimetype,
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Return the response object in a format that the frontend expects
    return {
      url: `${baseUrl}/${key}`,
      secure_url: `${baseUrl}/${key}`,
      public_id: key, // Using the S3 key as the public_id
      key: key,
      bytes: fileSize,
      format: fileExtension,
      resource_type: "raw", // PDFs and docs are typically 'raw' in Cloudinary terminology
      storage: "r2",
      provider: "cloudflare-r2"
    };
  } catch (error) {
    console.error('R2 upload failed:', error);
    throw new Error(`Failed to upload to R2: ${error.message}`);
  }
};
