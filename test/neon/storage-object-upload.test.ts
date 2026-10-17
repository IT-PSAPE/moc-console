import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const { putStorageObjectIfAbsent } = await import('../../neon/database/storage-object-upload.mjs') as {
  putStorageObjectIfAbsent: (client: { send: (command: unknown) => Promise<unknown> }, object: Record<string, unknown>, path: string) => Promise<void>
}

class FakePrivateStore {
  bytes: Buffer | null = null
  metadata: Record<string, string> | null = null
  puts = 0
  rejectPutWhenPresent = false

  async send(command: unknown): Promise<unknown> {
    if (command instanceof PutObjectCommand) {
      this.puts += 1
      expect(command.input.IfNoneMatch).toBe('*')
      if (this.rejectPutWhenPresent && this.bytes) throw Object.assign(new Error('exists'), { $metadata: { httpStatusCode: 412 } })
      const chunks: Buffer[] = []
      for await (const chunk of command.input.Body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk))
      this.bytes = Buffer.concat(chunks)
      this.metadata = command.input.Metadata ?? null
      return {}
    }
    if (command instanceof GetObjectCommand) return { Body: Readable.from(this.bytes ? [this.bytes] : []) }
    if (command instanceof HeadObjectCommand) return { Metadata: this.metadata }
    throw new Error('Unexpected S3 command')
  }
}

async function withLocalObject(work: (path: string, object: Record<string, unknown>) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'moc-storage-upload-'))
  const path = join(directory, 'object.bin')
  const bytes = Buffer.from('verified source bytes')
  await writeFile(path, bytes)
  const object = {
    sourceBucket: 'media', sourcePath: 'workspace/path.bin', sourceSize: bytes.length,
    sourceContentType: 'application/octet-stream', targetBucket: 'media', targetPath: 'moc-uploads/path.bin',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sourceObject: { bucket_id: 'media', name: 'workspace/path.bin', metadata: { size: bytes.length } },
  }
  try {
    await work(path, object)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

describe('private storage upload', () => {
  it('creates conditionally and verifies bytes plus source metadata', async () => {
    await withLocalObject(async (path, object) => {
      const store = new FakePrivateStore()
      await putStorageObjectIfAbsent(store, object, path)
      expect(store.puts).toBe(1)
      expect(store.bytes?.toString()).toBe('verified source bytes')
      expect(store.metadata?.['source-storage-object']).toBeTruthy()
    })
  })

  it('accepts an existing identical object without overwriting it', async () => {
    await withLocalObject(async (path, object) => {
      const store = new FakePrivateStore()
      await putStorageObjectIfAbsent(store, object, path)
      store.rejectPutWhenPresent = true
      store.puts = 0
      await putStorageObjectIfAbsent(store, object, path)
      expect(store.puts).toBe(1)
      expect(store.bytes?.toString()).toBe('verified source bytes')
    })
  })

  it('refuses an existing object with different bytes', async () => {
    await withLocalObject(async (path, object) => {
      const store = new FakePrivateStore()
      store.bytes = Buffer.from('different object')
      store.rejectPutWhenPresent = true
      await expect(putStorageObjectIfAbsent(store, object, path)).rejects.toThrow('Existing private object differs')
      expect(store.bytes.toString()).toBe('different object')
    })
  })
})
