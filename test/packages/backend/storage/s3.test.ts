import { createHash } from "node:crypto"
import { describe, expect, test } from "bun:test"
import { hashStorageBody } from "../../../../packages/backend/src/storage/s3"

describe("storage object verification", () => {
  test("hashes existing object streams without buffering the full object", async () => {
    const first = new Uint8Array([1, 2])
    const second = new Uint8Array([3, 4, 5])
    async function* body(): AsyncGenerator<Uint8Array> {
      yield first
      yield second
    }

    const result = await hashStorageBody(body())

    expect(result.size).toBe(5)
    expect(result.sha256).toBe(createHash("sha256").update(new Uint8Array([1, 2, 3, 4, 5])).digest("hex"))
  })
})
