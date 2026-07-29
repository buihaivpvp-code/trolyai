import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
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

function readStorageConfig() {
  const endpoint =
    getRequiredEnv("STORAGE_S3_ENDPOINT") ||
    getRequiredEnv("S3_ENDPOINT") ||
    getRequiredEnv("AWS_ENDPOINT") ||
    getRequiredEnv("CF_R2_ENDPOINT");

  const region =
    getRequiredEnv("STORAGE_S3_REGION") ||
    getRequiredEnv("S3_REGION") ||
    getRequiredEnv("AWS_REGION") ||
    "auto";

  const accessKeyId =
    getRequiredEnv("STORAGE_S3_ACCESS_KEY_ID") ||
    getRequiredEnv("S3_ACCESS_KEY_ID") ||
    getRequiredEnv("AWS_ACCESS_KEY_ID") ||
    getRequiredEnv("CF_R2_ACCESS_KEY_ID");

  const secretAccessKey =
    getRequiredEnv("STORAGE_S3_SECRET_ACCESS_KEY") ||
    getRequiredEnv("S3_SECRET_ACCESS_KEY") ||
    getRequiredEnv("AWS_SECRET_ACCESS_KEY") ||
    getRequiredEnv("CF_R2_SECRET_ACCESS_KEY");

  const bucketName =
    getRequiredEnv("STORAGE_S3_BUCKET") ||
    getRequiredEnv("S3_BUCKET") ||
    getRequiredEnv("AWS_BUCKET") ||
    getRequiredEnv("CF_R2_BUCKET_NAME");

  const publicBaseUrl =
    getRequiredEnv("STORAGE_PUBLIC_BASE_URL") ||
    getRequiredEnv("S3_PUBLIC_BASE_URL") ||
    getRequiredEnv("AWS_PUBLIC_BASE_URL") ||
    getRequiredEnv("CF_R2_PUBLIC_BASE_URL");

  const forcePathStyleValue =
    getRequiredEnv("STORAGE_S3_FORCE_PATH_STYLE") ||
    getRequiredEnv("S3_FORCE_PATH_STYLE") ||
    getRequiredEnv("AWS_S3_FORCE_PATH_STYLE");

  const accountId = getRequiredEnv("CF_R2_ACCOUNT_ID");
  const normalizedEndpoint = normalizeConfiguredEndpoint(endpoint);
  const resolvedEndpoint =
    normalizedEndpoint?.endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  return {
    endpoint: resolvedEndpoint,
    bucketName: bucketName || normalizedEndpoint?.bucketFromPath || "",
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
    forcePathStyle:
      forcePathStyleValue.trim() === ""
        ? true
        : !["0", "false", "no"].includes(forcePathStyleValue.toLowerCase())
  };
}

function buildR2Client(config: ReturnType<typeof readStorageConfig>): S3Client | null {
  if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
    return null;
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
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
    const config = readStorageConfig();
    this.client = buildR2Client(config);
    this.bucketName = config.bucketName;
    this.publicBaseUrl = config.publicBaseUrl;
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
      throw new Error("S3/R2 object storage is not configured.");
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

  async findDocumentKey(prefix: string): Promise<string | null> {
    if (!this.client || !this.bucketName) {
      return null;
    }

    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          MaxKeys: 1,
        })
      );

      return response.Contents?.[0]?.Key || null;
    } catch {
      return null;
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

  async deleteDocument(key: string): Promise<boolean> {
    if (!this.client || !this.bucketName) {
      return false;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch (e) {
      console.error(`[R2Storage] Failed to delete key ${key}:`, e);
      return false;
    }
  }
}

export const R2Storage = new R2StorageService();