import cloudinary from '../config/cloudinary.config.js';

/**
 * Uploads a file to Cloudinary. 
 * @param {Buffer|String} source - Buffer or file path string
 * @param {Object} options - Upload options
 */
export const uploadToCloudinary = (source, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder,
      resource_type: options.resource_type,
      allowed_formats: options.allowed_formats
    };

    // Add chunked upload / high timeout for larger files
    if (options.resource_type === 'video' || options.resource_type === 'raw' || options.resource_type === 'auto') {
      uploadOptions.chunk_size = 6000000; // 6MB per chunk
      uploadOptions.timeout = 180000; // 3 min timeout
    }

    const handleResult = (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
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
    };

    if (Buffer.isBuffer(source)) {
      // Direct buffer streaming
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, handleResult);
      uploadStream.end(source);
    } else if (typeof source === 'string') {
      // Upload from file path
      cloudinary.uploader.upload(source, uploadOptions, handleResult);
    } else {
      reject(new Error('Invalid source type: must be Buffer or file path string'));
    }
  });
};

export const uploadBase64ToCloudinary = (base64String, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(base64String, {
      folder: options.folder || 'aot/images',
      resource_type: options.resource_type || 'image',
      ...options
    }, (error, result) => {
      if (error) {
        console.error('Cloudinary base64 upload error:', error);
        return reject(error);
      }
      resolve({
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes
      });
    });
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
