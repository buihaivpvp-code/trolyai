import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type UploadDocumentParams = {
  key: string;
  body: Buffer;
  contentType?: string;
};

type DownloadDocumentResult = {
  body: Buffer;
  contentType?: string;
  contentLength?: number;
};

function getRequiredEnv(name: string): string {
  return String(process.env[name] || "").trim();
}

function normalizeConfiguredEndpoint(rawEndpoint: string): { endpoint: string; bucketFromPath: string } | null {
  const trimmed = rawEndpoint.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const bucketFromPath = parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    const endpoint = `${parsed.protocol}//${parsed.host}`;
    return { endpoint, bucketFromPath };
  } catch {
    return null;
  }
}

function buildR2Client(): S3Client | null {
  const explicitEndpoint = getRequiredEnv("CF_R2_ENDPOINT");
  const accountId = getRequiredEnv("CF_R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("CF_R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("CF_R2_SECRET_ACCESS_KEY");

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  const normalizedEndpoint = normalizeConfiguredEndpoint(explicitEndpoint);
  const endpoint = normalizedEndpoint?.endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  if (!endpoint) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(stream)) {
    return stream;
  }

  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }

  const asyncIterable = stream as AsyncIterable<Uint8Array>;
  if (typeof asyncIterable[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of asyncIterable) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported R2 object body stream.");
}

class R2StorageService {
  private client: S3Client | null;
  private bucketName: string;
  private publicBaseUrl: string;

  constructor() {
    this.client = buildR2Client();

    const explicitEndpoint = getRequiredEnv("CF_R2_ENDPOINT");
    const normalizedEndpoint = normalizeConfiguredEndpoint(explicitEndpoint);
    const configuredBucketName = getRequiredEnv("CF_R2_BUCKET_NAME");

    this.bucketName = configuredBucketName || normalizedEndpoint?.bucketFromPath || "";
    this.publicBaseUrl = getRequiredEnv("CF_R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  }

  isEnabled(): boolean {
    return Boolean(this.client && this.bucketName);
  }

  getPublicUrl(key: string): string | null {
    if (!this.publicBaseUrl) return null;
    return `${this.publicBaseUrl}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  }

  async uploadDocument(params: UploadDocumentParams): Promise<{ key: string; url?: string | null }> {
    if (!this.client || !this.bucketName) {
      throw new Error("Cloudflare R2 is not configured.");
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType || "application/octet-stream",
      })
    );

    return {
      key: params.key,
      url: this.getPublicUrl(params.key),
    };
  }

  async documentExists(key: string): Promise<boolean> {
    if (!this.client || !this.bucketName) {
      return false;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async downloadDocument(key: string): Promise<DownloadDocumentResult | null> {
    if (!this.client || !this.bucketName) {
      return null;
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      const body = await streamToBuffer(response.Body);
      return {
        body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch {
      return null;
    }
  }
}

export const R2Storage = new R2StorageService();