import { createHash, randomUUID } from "node:crypto"
import { describe, expect, test } from "bun:test"
import { StorageUploadService, type UploadManifest, type UploadRepository, type UploadObjectStore } from "../../../../packages/backend/src/storage/upload-service"
import { MAX_CHUNK_SIZE } from "../../../../packages/backend/src/storage/upload-protocol"

class MemoryUploads implements UploadRepository {
  readonly manifests = new Map<string, UploadManifest>()
  readonly chunks = new Map<string, Map<number, { key: string; size: number; sha256: string }>>()
  readonly queued = new Set<string>()
  async create(manifest: UploadManifest) { this.manifests.set(manifest.id, manifest); this.chunks.set(manifest.id, new Map()) }
  async get(id: string) { return this.manifests.get(id) ?? null }
  async chunksFor(id: string) { return [...(this.chunks.get(id)?.entries() ?? [])].map(([index, value]) => ({ index, ...value })) }
  async addChunk(id: string, index: number, chunk: { key: string; size: number; sha256: string }) {
    const entries = this.chunks.get(id)!
    const prior = entries.get(index)
    if (prior) return prior.sha256 === chunk.sha256 && prior.size === chunk.size ? "same" : "conflict"
    entries.set(index, chunk)
    return "created"
  }
  async enqueue(id: string) { this.queued.add(id); this.manifests.set(id, { ...this.manifests.get(id)!, status: "queued" }) }
  async abort(id: string) { this.manifests.set(id, { ...this.manifests.get(id)!, status: "aborted" }) }
}

class MemoryObjects implements UploadObjectStore {
  readonly staging = new Map<string, Uint8Array>()
  async putStaging(key: string, body: Uint8Array) { this.staging.set(key, body.slice()) }
  async deleteStaging(keys: string[]) { keys.forEach((key) => this.staging.delete(key)) }
  async deleteObject() {}
}

const digest = (body: Uint8Array) => createHash("sha256").update(body).digest("hex")

function setup() {
  const repository = new MemoryUploads()
  const objects = new MemoryObjects()
  const service = new StorageUploadService(repository, objects, randomUUID)
  return { repository, objects, service }
}

describe("storage upload service", () => {
  test("keeps a session private to its owner", async () => {
    const { service } = setup()
    const session = await service.create({ ownerUserId: "owner-a", purpose: "avatar", size: MAX_CHUNK_SIZE + 1, contentType: "image/png", fileName: "face.png" })

    await expect(service.status("owner-b", session.id)).rejects.toMatchObject({ code: "not_found" })
  })

  test("keeps new multipart targets under the managed prefix and scopes workspace media to its uploader", async () => {
    const { service } = setup()
    const session = await service.create({
      ownerUserId: "owner-a", workspaceId: "workspace-a", purpose: "broadcast-audio",
      size: 8, contentType: "audio/mpeg", fileName: "track.mp3",
    })

    expect(session.objectPath).toMatch(/^moc-uploads\/workspace-a\/owner-a\/broadcast-media\//)
    expect(session.bucket).toBe("broadcast-media")
  })

  test("accepts identical chunk retries and rejects conflicting bytes for an index", async () => {
    const { service, repository, objects } = setup()
    const session = await service.create({ ownerUserId: "owner-a", purpose: "avatar", size: 4, contentType: "image/png", fileName: "face.png" })
    const chunk = new Uint8Array([1, 2, 3, 4])

    await expect(service.putChunk("owner-a", session.id, 0, chunk, "image/png")).resolves.toMatchObject({ duplicate: false })
    await expect(service.putChunk("owner-a", session.id, 0, chunk, "image/png")).resolves.toMatchObject({ duplicate: true })
    await expect(service.putChunk("owner-a", session.id, 0, new Uint8Array([4, 3, 2, 1]), "image/png")).rejects.toMatchObject({ code: "conflict" })
    expect(repository.chunks.get(session.id)?.get(0)?.sha256).toBe(digest(chunk))
    expect(objects.staging.size).toBe(1)
  })

  test("requires a complete integrity-checked manifest before durable finalization", async () => {
    const { service, repository } = setup()
    const session = await service.create({ ownerUserId: "owner-a", purpose: "avatar", size: MAX_CHUNK_SIZE + 1, contentType: "image/png", fileName: "face.png" })
    await expect(service.finalize("owner-a", session.id)).rejects.toMatchObject({ code: "incomplete_upload" })

    await service.putChunk("owner-a", session.id, 0, new Uint8Array(MAX_CHUNK_SIZE), "image/png")
    await expect(service.finalize("owner-a", session.id)).rejects.toMatchObject({ code: "incomplete_upload" })
    await service.putChunk("owner-a", session.id, 1, new Uint8Array([5]), "image/png")

    await expect(service.finalize("owner-a", session.id)).resolves.toMatchObject({ status: "queued" })
    expect(repository.queued.has(session.id)).toBe(true)
    expect(await service.status("owner-a", session.id)).toMatchObject({ status: "queued" })
  })

  test("aborts the manifest and removes every private staging object", async () => {
    const { service, objects } = setup()
    const session = await service.create({ ownerUserId: "owner-a", purpose: "avatar", size: 4, contentType: "image/png", fileName: "face.png" })
    await service.putChunk("owner-a", session.id, 0, new Uint8Array([1, 2, 3, 4]), "image/png")

    await expect(service.abort("owner-a", session.id)).resolves.toMatchObject({ status: "aborted" })
    expect(objects.staging.size).toBe(0)
    await expect(service.putChunk("owner-a", session.id, 0, new Uint8Array([1, 2, 3, 4]), "image/png")).rejects.toMatchObject({ code: "upload_closed" })
  })
})
