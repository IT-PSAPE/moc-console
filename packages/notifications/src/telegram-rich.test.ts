import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { toLegacyHtml, toRichHtml } from "./telegram-rich.js"

describe("toRichHtml", () => {
  it("groups consecutive non-empty plain lines into one <p> joined by <br>", () => {
    assert.equal(toRichHtml("Line one\nLine two"), "<p>Line one<br>Line two</p>")
  })

  it("starts a new <p> on a blank line", () => {
    assert.equal(toRichHtml("A\n\nB"), "<p>A</p>\n<p>B</p>")
  })

  it("passes a single-line block tag through as-is", () => {
    assert.equal(toRichHtml("<h3>Heading</h3>\nBody line"), "<h3>Heading</h3>\n<p>Body line</p>")
  })

  it("passes a single-line <footer> and <blockquote> through untouched", () => {
    assert.equal(toRichHtml("<footer>TRACK-9</footer>"), "<footer>TRACK-9</footer>")
    assert.equal(toRichHtml("<blockquote>{{notes}}</blockquote>"), "<blockquote>{{notes}}</blockquote>")
  })

  it("joins a multi-line <blockquote> with <br> instead of wrapping its lines in <p>", () => {
    assert.equal(toRichHtml("<blockquote>Line A\nLine B</blockquote>"), "<blockquote>Line A<br>Line B</blockquote>")
  })

  it("keeps a multi-line <table> intact, including nested <tr>/<td> on their own lines", () => {
    const input = "<table>\n<tr><td>A</td><td>B</td></tr>\n</table>"
    assert.equal(toRichHtml(input), input)
  })

  it("leaves escapeHtml's output (&amp; &lt; &gt;) alone", () => {
    assert.equal(toRichHtml("Fish &amp; Chips"), "<p>Fish &amp; Chips</p>")
  })

  it("drops a fully blank template down to no paragraphs", () => {
    assert.equal(toRichHtml(""), "")
    assert.equal(toRichHtml("\n\n"), "")
  })
})

describe("toLegacyHtml", () => {
  it("turns headings into <b>", () => {
    assert.equal(toLegacyHtml("<h3>Hello</h3>"), "<b>Hello</b>")
  })

  it("turns <p>/<br> into newlines", () => {
    assert.equal(toLegacyHtml("<p>Line one<br>Line two</p>"), "Line one\nLine two")
  })

  it("turns <hr/> into a divider line", () => {
    assert.equal(toLegacyHtml("Before<hr/>After"), "Before\n──────────\nAfter")
  })

  it("turns a two-column table into label: value lines", () => {
    const input = "<table><tr><td>Venue</td><td>Main Hall</td></tr><tr><td>Time</td><td>6 PM</td></tr></table>"
    assert.equal(toLegacyHtml(input), "Venue: Main Hall\nTime: 6 PM")
  })

  it("strips tags the legacy parser doesn't support, keeping their text", () => {
    assert.equal(
      toLegacyHtml("<mark>Highlighted</mark> and <tg-spoiler>secret</tg-spoiler>"),
      "Highlighted and <tg-spoiler>secret</tg-spoiler>",
    )
  })

  it("keeps legacy-supported tags untouched, including <a href>", () => {
    assert.equal(toLegacyHtml("<blockquote>Note here</blockquote>"), "<blockquote>Note here</blockquote>")
    assert.equal(
      toLegacyHtml('<a href="https://example.com">Open</a>'),
      '<a href="https://example.com">Open</a>',
    )
  })

  it("turns <footer> into a plain trailing line", () => {
    assert.equal(toLegacyHtml("<footer>TRACK-9</footer>"), "TRACK-9")
  })
})
