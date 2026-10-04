import { createHash } from "node:crypto"
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListMultipartUploadsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3"
import type { UploadObjectStore } from "./upload-service.js"

let client: S3Client | undefined

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function getStorageClient(): S3Client {
  if (client) return client
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 ?? process.env.NEON_STORAGE_ENDPOINT
  client = new S3Client({
    ...(endpoint ? { endpoint } : {}),
    region: process.env.AWS_REGION ?? process.env.NEON_STORAGE_REGION ?? "us-east-2",
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
  })
  return client
}

export class S3UploadObjectStore implements UploadObjectStore {
  constructor(private readonly s3: S3Client = getStorageClient()) {}

  async putStaging(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: bucketForKey(key),
      Key: keyForBucket(key),
      Body: body,
      ContentLength: body.byteLength,
      ContentType: contentType,
      Metadata: { staged: "true" },
    }))
  }

  async deleteStaging(keys: string[]): Promise<void> {
    for (const bucket of new Set(keys.map(bucketForKey))) {
      const objects = keys.filter((key) => bucketForKey(key) === bucket).map((key) => ({ Key: keyForBucket(key) }))
      if (objects.length) await this.s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }))
    }
  }

  async deleteObject(bucket: string, path: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))
  }
}

function bucketForKey(stagingKey: string): string {
  const slash = stagingKey.indexOf("/")
  if (slash <= 0) throw new Error("Invalid staged object key")
  return stagingKey.slice(0, slash)
}

function keyForBucket(stagingKey: string): string {
  const slash = stagingKey.indexOf("/")
  if (slash <= 0) throw new Error("Invalid staged object key")
  return stagingKey.slice(slash + 1)
}

export async function getStorageObject(bucket: string, path: string, range?: string) {
  return getStorageClient().send(new GetObjectCommand({
    Bucket: bucket,
    Key: path,
    ...(range ? { Range: range } : {}),
  }))
}

export async function headStorageObject(bucket: string, path: string) {
  return getStorageClient().send(new HeadObjectCommand({ Bucket: bucket, Key: path }))
}

export async function hashStorageObject(bucket: string, path: string): Promise<{ size: number; sha256: string }> {
  const result = await getStorageObject(bucket, path)
  if (!result.Body) throw new Error("Storage object body is unavailable")
  return hashStorageBody(result.Body as AsyncIterable<Uint8Array>)
}

export async function hashStorageBody(body: AsyncIterable<Uint8Array>): Promise<{ size: number; sha256: string }> {
  const hash = createHash("sha256")
  let size = 0
  for await (const chunk of body) {
    hash.update(chunk)
    size += chunk.byteLength
  }
  return { size, sha256: hash.digest("hex") }
}

export async function startMultipart(bucket: string, path: string, contentType: string) {
  const result = await getStorageClient().send(new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: path,
    ContentType: contentType,
    Metadata: { mocManaged: "true" },
  }))
  if (!result.UploadId) throw new Error("Storage did not return a multipart upload id")
  return result.UploadId
}

export async function putMultipartPart(bucket: string, path: string, uploadId: string, partNumber: number, body: Uint8Array) {
  const result = await getStorageClient().send(new UploadPartCommand({
    Bucket: bucket,
    Key: path,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
    ContentLength: body.byteLength,
  }))
  if (!result.ETag) throw new Error("Storage did not return a multipart part ETag")
  return result.ETag
}

export async function completeMultipart(bucket: string, path: string, uploadId: string, parts: Array<{ PartNumber: number; ETag: string }>) {
  await getStorageClient().send(new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: path,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  }))
}

export async function abortMultipart(bucket: string, path: string, uploadId: string) {
  await getStorageClient().send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: path, UploadId: uploadId }))
}

export async function readStagingObject(bucket: string, path: string): Promise<Uint8Array> {
  const result = await getStorageClient().send(new GetObjectCommand({ Bucket: bucket, Key: path }))
  if (!result.Body) throw new Error("Staged upload chunk is missing")
  return result.Body.transformToByteArray()
}

export async function listStagingObjects(bucket: string, continuationToken?: string) {
  return getStorageClient().send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: ".staging/",
    ContinuationToken: continuationToken,
    MaxKeys: 1000,
  }))
}

export async function deleteStorageObjects(bucket: string, keys: string[]): Promise<void> {
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000)
    if (batch.length) await getStorageClient().send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
    }))
  }
}

export async function listManagedMultipartUploads(bucket: string, keyMarker?: string, uploadIdMarker?: string) {
  return getStorageClient().send(new ListMultipartUploadsCommand({
    Bucket: bucket,
    Prefix: "moc-uploads/",
    KeyMarker: keyMarker,
    UploadIdMarker: uploadIdMarker,
    MaxUploads: 1000,
  }))
}
