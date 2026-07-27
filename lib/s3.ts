import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET;
// Optional: point at an S3-compatible service (MinIO, Cloudflare R2, etc.) for local dev.
const ENDPOINT = process.env.AWS_S3_ENDPOINT || undefined;
const FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: ENDPOINT ? FORCE_PATH_STYLE || true : FORCE_PATH_STYLE,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  return cachedClient;
}

function requireBucket(): string {
  if (!BUCKET) {
    throw new Error(
      "AWS_S3_BUCKET não está configurado. Defina AWS_S3_BUCKET (e as credenciais AWS_*) no seu .env antes de anexar arquivos."
    );
  }
  return BUCKET;
}

/** Uploads a file buffer to S3 under the given key and returns that same key. */
export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = requireBucket();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/** Deletes an object from S3. Safe to call even if the object no longer exists. */
export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Generates a temporary signed URL to download/view a private S3 object.
 * Falls back to "#" if S3 isn't configured yet, so pages don't crash before
 * the bucket/credentials are set up.
 */
export async function getS3SignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (!BUCKET) return "#";
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}
