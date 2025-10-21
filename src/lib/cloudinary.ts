import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

/**
 * Upload an image buffer to Cloudinary
 */
export async function uploadImageToCloudinary(
  imageBuffer: Buffer,
  publicId: string,
  folder: string = 'dxr-media'
): Promise<{ url: string; publicId: string; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }, // Auto-optimize
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          // Also generate thumbnail URL
          const thumbnailUrl = cloudinary.url(result.public_id, {
            transformation: [
              { width: 200, height: 200, crop: 'fill', quality: 'auto' },
            ],
          });

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl,
          });
        }
      }
    );

    uploadStream.end(imageBuffer);
  });
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Get optimized image URL from Cloudinary
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  } = {}
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options.width,
        height: options.height,
        crop: options.crop || 'fill',
        quality: options.quality || 'auto',
        fetch_format: 'auto',
      },
    ],
  });
}
