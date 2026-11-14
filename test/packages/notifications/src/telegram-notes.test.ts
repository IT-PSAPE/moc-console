import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  appendAttributionFooter,
  appendPlainTelegramFooter,
  readTelegramActorFromPayload,
} from "../../../../packages/notifications/src/telegram-attribution.js"
import {
  appendUpdateFooter,
  renderActionNote,
  renderDeletedOriginal,
  renderFollowUpNote,
  renderScanNote,
} from "../../../../packages/notifications/src/telegram-notes.js"

describe("Telegram attribution", () => {
  it("appends escaped member and automation footers to a rich body", () => {
    assert.equal(appendAttributionFooter("<p>Stream</p>", { action: "created", source: "member", name: "A & <B>" }),
      "<p>Stream</p>\n<footer>Created by A &amp; &lt;B&gt;</footer>")
    assert.equal(appendAttributionFooter("<p>Stream</p>", { action: "updated", source: "automation", name: "YouTube" }),
      "<p>Stream</p>\n<footer>Automation · Updated by YouTube</footer>")
  })

  it("does not invent an actor for older deliveries, and keeps plain replies within the Telegram limit", () => {
    assert.deepEqual(readTelegramActorFromPayload({}), { source: "unknown" })
    const plain = appendPlainTelegramFooter("😀".repeat(2300), { action: "assigned", source: "unknown" })
    assert.ok(plain.length <= 4096)
    assert.match(plain, /…\n\nAssigned · Actor not recorded$/)
  })
})

describe("renderFollowUpNote", () => {
  it("reports what changed for a requester update", () => {
    assert.equal(
      renderFollowUpNote("request.requester_updated", { changeSummary: "Title, due date" }),
      "✏️ Updated by requester — Title, due date",
    )
  })

  it("falls back to a generic note when changeSummary is missing", () => {
    assert.equal(renderFollowUpNote("booking.requester_updated", {}), "✏️ Updated by requester")
  })

  it("reports the new status for a status change", () => {
    assert.equal(renderFollowUpNote("request.status_changed", { status: "in progress" }), "🔄 Status changed to in progress")
  })

  it("reports the cancellation reason", () => {
    assert.equal(
      renderFollowUpNote("venue_booking.cancelled", { cancelReason: "Clashes with elders' meeting" }),
      "🚫 Cancelled — Clashes with elders' meeting",
    )
  })

  it("escapes HTML-significant characters in token values", () => {
    assert.equal(
      renderFollowUpNote("request.requester_updated", { changeSummary: "Notes & <urgent>" }),
      "✏️ Updated by requester — Notes &amp; &lt;urgent&gt;",
    )
  })

  it("handles the new stream/meeting update keys", () => {
    assert.equal(renderFollowUpNote("stream.updated", {}), "✏️ Stream details updated")
    assert.equal(renderFollowUpNote("meeting.updated", { changeSummary: "Time" }), "✏️ Meeting updated — Time")
  })
})

describe("renderActionNote", () => {
  it("renders a short sentence per action", () => {
    assert.equal(renderActionNote("start", "Craig"), "▶️ Started by Craig")
    assert.equal(renderActionNote("complete", "Craig"), "✅ Completed by Craig")
    assert.equal(renderActionNote("check_out", "Craig"), "📤 Checked out by Craig")
    assert.equal(renderActionNote("return", "Craig"), "📥 Returned by Craig")
    assert.equal(renderActionNote("approve", "Craig"), "✅ Approved by Craig")
    assert.equal(renderActionNote("reject", "Craig"), "🚫 Cancelled by Craig")
  })
})

describe("renderScanNote", () => {
  it("reports missing items", () => {
    assert.equal(
      renderScanNote({ mode: "check_out", actorName: "Craig", scannedCount: 5, itemCount: 6, missingNames: ["Shure SM58"] }),
      "📋 Check-out scan by Craig — 5/6 items scanned. Missing: Shure SM58",
    )
  })

  it("omits the Missing clause when nothing is missing", () => {
    assert.equal(
      renderScanNote({ mode: "return", actorName: "Craig", scannedCount: 3, itemCount: 3, missingNames: [] }),
      "📋 Return scan by Craig — 3/3 items scanned.",
    )
  })
})

describe("appendUpdateFooter", () => {
  it("appends a footer carrying the note and a <tg-time>", () => {
    const out = appendUpdateFooter("<h3>Title</h3>", "▶️ Started by Craig", new Date("2026-05-21T17:00:00Z"))
    assert.ok(out.startsWith("<h3>Title</h3>\n<footer>"))
    assert.ok(out.includes("▶️ Started by Craig"))
    assert.ok(out.includes('<tg-time unix="1779382800" format="t">17:00 UTC</tg-time>'))
  })

  it("leaves an unrelated tracking-code footer alone", () => {
    const withTracking = "<h3>Title</h3>\n<footer>TRACK-9</footer>"
    const out = appendUpdateFooter(withTracking, "▶️ Started by Craig", new Date("2026-05-21T17:00:00Z"))
    assert.equal((out.match(/<footer>/g) ?? []).length, 2)
    assert.ok(out.includes("TRACK-9"))
    assert.ok(out.includes("Started by Craig"))
  })
})

describe("renderDeletedOriginal", () => {
  it("adds a banner and strikes through each text block", () => {
    assert.equal(
      renderDeletedOriginal("<h3>Title</h3>\n<p>Line</p>\n<footer>RQ-1</footer>"),
      "<p><b>🗑️ Deleted by requester</b></p>\n<h3><s>Title</s></h3>\n<p><s>Line</s></p>\n<footer><s>RQ-1</s></footer>",
    )
  })
})
