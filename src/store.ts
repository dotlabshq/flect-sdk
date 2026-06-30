import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StoreClient {
  put(key: string, body: string | Uint8Array | Buffer, opts?: { contentType?: string }): Promise<void>
  get(key: string): Promise<string | null>
  getBytes(key: string): Promise<Uint8Array | null>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  list(prefix?: string): Promise<string[]>
  presignedPut(key: string, opts?: { expiresIn?: number; contentType?: string }): Promise<string>
  presignedGet(key: string, opts?: { expiresIn?: number }): Promise<string>
}

export function createStoreClient(endpoint: string, bucket: string, accessKeyId: string, secretAccessKey: string, region: string): StoreClient {
  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  return {
    async put(key, body, opts) {
      await s3.send(new PutObjectCommand({
        Bucket: bucket, Key: key,
        Body: body,
        ContentType: opts?.contentType ?? 'application/octet-stream',
      }))
    },

    async get(key) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        return res.Body ? await res.Body.transformToString() : null
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'NoSuchKey') return null
        throw err
      }
    },

    async getBytes(key) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'NoSuchKey') return null
        throw err
      }
    },

    async del(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    },

    async exists(key) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        return true
      } catch {
        return false
      }
    },

    async list(prefix) {
      const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
      return (res.Contents ?? []).map(o => o.Key!).filter(Boolean)
    },

    async presignedPut(key, opts) {
      return getSignedUrl(s3, new PutObjectCommand({
        Bucket: bucket, Key: key,
        ContentType: opts?.contentType ?? 'application/octet-stream',
      }), { expiresIn: opts?.expiresIn ?? 3600 })
    },

    async presignedGet(key, opts) {
      return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: opts?.expiresIn ?? 3600 })
    },
  }
}
