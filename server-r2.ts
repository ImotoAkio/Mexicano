import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "";
const publicDomain = process.env.R2_PUBLIC_DOMAIN || "";

export const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/** Indica se as credenciais do bucket R2 estão presentes no ambiente. */
export const isR2Configured = (): boolean =>
  Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

export interface UploadToR2Options {
  /** Ex.: `inline; filename="contrato.pdf"` — controla visualização/download no navegador. */
  contentDisposition?: string;
  /** Metadados livres gravados junto ao objeto (somente ASCII). */
  metadata?: Record<string, string>;
}

export const uploadToR2 = async (
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: UploadToR2Options = {}
): Promise<string> => {
  if (!isR2Configured()) {
    throw new Error("R2 not configured securely via environment variables");
  }

  const uploadParams = {
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
    ...(options.contentDisposition ? { ContentDisposition: options.contentDisposition } : {}),
    ...(options.metadata ? { Metadata: options.metadata } : {}),
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  if (publicDomain) {
    return `${publicDomain.replace(/\/$/, "")}/${filename}`;
  }
  
  // Se não houver domínio público explícito, fallback para a URL de objeto virtual
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filename}`;
};

export const generatePresignedUrl = async (filename: string, mimeType: string, expiresIn = 3600): Promise<{ uploadUrl: string, publicUrl: string }> => {
  if (!isR2Configured()) {
    throw new Error("R2 not configured securely via environment variables");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  let computedPublicUrl = "";
  if (publicDomain) {
    computedPublicUrl = `${publicDomain.replace(/\/$/, "")}/${filename}`;
  } else {
    // URL fallback caso acesse via storage direto e permita public read (o que nem sempre é o caso sem custom domain)
    computedPublicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filename}`;
  }

  return { uploadUrl, publicUrl: computedPublicUrl };
};
