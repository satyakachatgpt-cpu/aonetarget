import cloudinary from '../config/cloudinary.config.js';

export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder,
      resource_type: options.resource_type,
      allowed_formats: options.allowed_formats
    };

    // Add chunked upload for videos to prevent 413 errors
    if (options.resource_type === 'video') {
      uploadOptions.chunk_size = 6000000; // 6MB per chunk
      uploadOptions.timeout = 180000; // 3 min timeout
    }

    // Add chunked upload for large PDFs too
    if (options.resource_type === 'raw') {
      uploadOptions.timeout = 60000; // 1 min timeout
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary stream error:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          duration: result.duration
        });
      }
    );

    // Direct buffer streaming
    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (public_id, resource_type = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, { resource_type });
    return { success: result.result === 'ok' };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return { success: false, error };
  }
};
