// src/infra/cloudinary.ts
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export { cloudinary };

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

type DestroyResult = {
    attempted: Array<"image" | "video" | "raw">;
    result: "ok" | "not_found" | "error";
    lastResponse?: any;
};

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

export async function destroyFromCloudinary(
    publicId: string,
    resourceType: CloudinaryResourceType = "image"
): Promise<DestroyResult> {
    const tryTypes: Array<"image" | "video" | "raw"> =
        resourceType === "auto" ? ["image", "video", "raw"] : [resourceType];

    let lastResponse: any = null;

    for (const rt of tryTypes) {
        try {
            const res = await cloudinary.uploader.destroy(publicId, { resource_type: rt });
            lastResponse = res;

            // Cloudinary costuma retornar { result: "ok" } ou { result: "not found" }
            if (res?.result === "ok") {
                return { attempted: tryTypes, result: "ok", lastResponse: res };
            }

            if (res?.result === "not found") {
                // não dá throw, apenas tenta próximo rt (no caso auto) ou retorna not_found
                continue;
            }

            // qualquer outro retorno incomum
            return { attempted: tryTypes, result: "error", lastResponse: res };
        } catch (err) {
            lastResponse = err;
            // tenta próximo tipo no modo auto
            continue;
        }
    }

    // se chegou aqui, não achou em nenhum resource_type
    return { attempted: tryTypes, result: "not_found", lastResponse };
}