import {
	CopyObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { STORAGE_BASE_URL } from "./constants";

// Helper to construct full URL from relative path
export function getImageUrl(relativePath: string): string {
	if (!relativePath) return "";
	// If already a full URL, return as-is
	if (
		relativePath.startsWith("http://") ||
		relativePath.startsWith("https://")
	) {
		return relativePath;
	}
	const bucket = import.meta.env.YANDEX_STORAGE_BUCKET || "";
	return `${STORAGE_BASE_URL}/${bucket}/${relativePath}`;
}

const region = import.meta.env.YANDEX_STORAGE_REGION || "ru-central1";

const s3Client = new S3Client({
	endpoint: STORAGE_BASE_URL,
	region: region,
	credentials: {
		accessKeyId: import.meta.env.YANDEX_STORAGE_ACCESS_KEY || "",
		secretAccessKey: import.meta.env.YANDEX_STORAGE_SECRET_KEY || "",
	},
	forcePathStyle: true,
});

const bucket = import.meta.env.YANDEX_STORAGE_BUCKET || "";

async function fileExists(key: string): Promise<boolean> {
	try {
		await s3Client.send(
			new HeadObjectCommand({
				Bucket: bucket,
				Key: key,
			}),
		);
		return true;
	} catch {
		return false;
	}
}

async function getUniqueKey(baseKey: string): Promise<string> {
	let key = baseKey;
	let copyNumber = 0;

	// Parse filename parts
	const lastSlashIndex = baseKey.lastIndexOf("/");
	const directory = baseKey.substring(0, lastSlashIndex);
	const filename = baseKey.substring(lastSlashIndex + 1);
	const lastDotIndex = filename.lastIndexOf(".");
	const nameWithoutExt =
		lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
	const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";

	while (await fileExists(key)) {
		copyNumber++;
		const suffix = copyNumber === 1 ? "-copy" : `-copy${copyNumber}`;
		key = `${directory}/${nameWithoutExt}${suffix}${extension}`;
	}

	return key;
}

export async function uploadProductImage(
	file: File,
	productName: string,
): Promise<string> {
	const sanitizedProductName = sanitizeFilename(productName);
	const sanitizedFileName = sanitizeFilename(file.name);

	// Handle empty filename case
	let finalName = sanitizedFileName;
	if (!finalName || finalName.replace(/[.-]/g, "").length === 0) {
		const timestamp = Date.now();
		finalName = `image-${timestamp}.webp`;
	}

	// Handle empty product name (avoid double slash)
	let directory = "images";
	if (sanitizedProductName && sanitizedProductName.trim().length > 0) {
		directory = `images/${sanitizedProductName}`;
	}

	const baseKey = `${directory}/${finalName}`;

	// Ensure unique key to prevent overwrites (adds -copy suffix if needed)
	const key = await getUniqueKey(baseKey);

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await s3Client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: buffer,
			ContentType: file.type,
		}),
	);

	// Return relative path without base URL (key already includes "images/" prefix)
	return key;
}

// Helper function to get storage key from path (handles both relative paths and full URLs)
export function getStorageKey(pathOrUrl: string): string {
	// If it's already a relative path with images/ prefix, return as-is
	if (pathOrUrl.startsWith("images/")) {
		return pathOrUrl;
	}

	// Legacy: handle old staging paths without images/ prefix
	if (pathOrUrl.startsWith("staging/")) {
		return pathOrUrl;
	}

	// If it contains the bucket name, extract the key
	const urlParts = pathOrUrl.split(`${bucket}/`);
	if (urlParts.length === 2) {
		return urlParts[1];
	}

	// Otherwise assume it's already a key
	return pathOrUrl;
}

export async function deleteProductImage(
	imagePathOrUrl: string,
): Promise<void> {
	const key = getStorageKey(imagePathOrUrl);

	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		}),
	);
}

export async function uploadMultipleProductImages(
	files: File[],
	productName: string,
): Promise<string[]> {
	const uploadPromises = files.map((file) =>
		uploadProductImage(file, productName),
	);
	return await Promise.all(uploadPromises);
}

function sanitizeFilename(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9.-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Returns a presigned URL for direct client upload to staging.
 * Bypasses API Gateway payload limits - client uploads straight to Object Storage.
 */
export async function getStagingUploadUrl(
	filename: string,
	contentType: string,
	sessionId?: string,
): Promise<{ uploadUrl: string; imagePath: string }> {
	const sanitizedName = sanitizeFilename(filename);
	let finalName = sanitizedName;
	if (!finalName || finalName.replace(/[.-]/g, "").length === 0) {
		finalName = `image-${Date.now()}.webp`;
	}
	const session = sessionId || `session-${Date.now()}`;
	const baseKey = `images/staging/${session}/${finalName}`;
	const key = await getUniqueKey(baseKey);

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: contentType,
	});

	const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

	return { uploadUrl, imagePath: key };
}

export async function uploadToStaging(
	file: File,
	sessionId?: string,
): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return uploadToStagingFromBuffer(buffer, file.name, file.type, sessionId);
}

export async function uploadToStagingFromBuffer(
	buffer: Buffer,
	originalFilename: string,
	contentType: string,
	sessionId?: string,
): Promise<string> {
	// Keep original filename, just sanitize it
	const sanitizedName = sanitizeFilename(originalFilename);

	// If filename is empty after sanitization, use timestamp
	let finalName = sanitizedName;
	if (!finalName || finalName.replace(/[.-]/g, "").length === 0) {
		const timestamp = Date.now();
		finalName = `image-${timestamp}.webp`;
	}

	// Use standardized staging structure: images/staging/{sessionId}/
	const session = sessionId || `session-${Date.now()}`;
	const baseKey = `images/staging/${session}/${finalName}`;

	// Ensure unique key to prevent overwrites (adds -copy suffix if needed)
	const key = await getUniqueKey(baseKey);

	await s3Client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: buffer,
			ContentType: contentType,
		}),
	);

	// Return relative path without base URL
	return key;
}

export interface MoveStagingResult {
	success: boolean;
	movedImages: string[];
	pathMap: Record<string, string>;
	failedImages: string[];
}

export async function moveStagingToFinalBatch(
	stagingPaths: string[],
	productName: string,
): Promise<MoveStagingResult> {
	const movedImages: string[] = [];
	const pathMap: Record<string, string> = {};
	const failedImages: string[] = [];

	if (!stagingPaths || stagingPaths.length === 0) {
		return { success: true, movedImages: [], pathMap: {}, failedImages: [] };
	}

	const sanitizedProductName = sanitizeFilename(productName);

	for (const stagingPathOrUrl of stagingPaths) {
		try {
			const stagingKey = getStorageKey(stagingPathOrUrl);

			// Check if it's a staging path (handle both old and new conventions)
			if (
				!stagingKey.startsWith("images/staging/") &&
				!stagingKey.startsWith("staging/")
			) {
				// Already in final location, skip but add to map
				movedImages.push(stagingKey);
				pathMap[stagingPathOrUrl] = stagingKey;
				console.log(`Skipping non-staging path: ${stagingKey}`);
				continue;
			}

			// Extract filename from staging path
			const pathParts = stagingKey.split("/");
			const fileName = pathParts[pathParts.length - 1];

			// Handle empty product name (avoid double slash)
			let finalDirectory = "images";
			if (sanitizedProductName && sanitizedProductName.trim().length > 0) {
				finalDirectory = `images/${sanitizedProductName}`;
			}

			const baseFinalKey = `${finalDirectory}/${fileName}`;

			// Ensure unique key to prevent overwrites
			const finalKey = await getUniqueKey(baseFinalKey);

			// Copy from staging to final location
			await s3Client.send(
				new CopyObjectCommand({
					Bucket: bucket,
					CopySource: `${bucket}/${stagingKey}`,
					Key: finalKey,
				}),
			);

			// Delete from staging after successful copy
			await s3Client.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: stagingKey,
				}),
			);

			movedImages.push(finalKey);
			pathMap[stagingPathOrUrl] = finalKey;

			console.log(`✅ Moved staging image: ${stagingKey} → ${finalKey}`);
		} catch (error) {
			console.error(
				`❌ Failed to move staging image ${stagingPathOrUrl}:`,
				error,
			);
			failedImages.push(stagingPathOrUrl);
			// Continue with other images even if one fails
		}
	}

	console.log("Move staging images result:", {
		movedCount: movedImages.length,
		failedCount: failedImages.length,
		totalRequested: stagingPaths.length,
	});

	// If we had staging images but none were moved successfully, that's an error
	const actualStagingPaths = stagingPaths.filter((p) => {
		const k = getStorageKey(p);
		return k.startsWith("staging/") || k.startsWith("images/staging/");
	});
	if (
		actualStagingPaths.length > 0 &&
		movedImages.length === 0 &&
		failedImages.length === actualStagingPaths.length
	) {
		throw new Error(
			`Failed to move any staging images. All ${failedImages.length} image(s) failed to move.`,
		);
	}

	return { success: true, movedImages, pathMap, failedImages };
}

export async function moveStagingToFinal(
	stagingPathOrUrl: string,
	productName: string,
): Promise<string> {
	const result = await moveStagingToFinalBatch([stagingPathOrUrl], productName);

	if (result.failedImages.length > 0) {
		throw new Error(`Failed to move staging image: ${stagingPathOrUrl}`);
	}

	return result.movedImages[0] || stagingPathOrUrl;
}
