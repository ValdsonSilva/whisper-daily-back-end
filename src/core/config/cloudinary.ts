// src/infra/cloudinary.ts
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
});

export { cloudinary };

export type CloudinaryResult = UploadApiResponse;

export function uploadToCloudinaryStream(opts: UploadApiOptions): {
    handler: NodeJS.WritableStream;
    done: Promise<CloudinaryResult>;
} {
    let resolve!: (r: CloudinaryResult) => void;
    let reject!: (e: any) => void;
    const done = new Promise<CloudinaryResult>((res, rej) => { resolve = res; reject = rej; });

    const handler = cloudinary.uploader.upload_stream(opts, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res!);
    });

    return { handler, done };
}

export async function destroyFromCloudinary(publicId: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image') {
    // quando "auto", Cloudinary aceita "image" ou "video" para destroy; tentamos ambos
    if (resourceType === 'auto') {
        try { await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }); return; } catch { }
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        return;
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
