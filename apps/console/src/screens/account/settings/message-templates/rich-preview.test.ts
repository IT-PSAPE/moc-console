import { describe, expect, test } from "bun:test"
import { isValidElement, type ReactElement, type ReactNode } from "react"
import { renderRichPreviewNodes } from "./rich-preview"

type ElementProps = { href?: string; children?: ReactNode }

function collect(nodes: ReactNode[], out: { tags: string[]; text: string; hrefs: (string | undefined)[] }) {
  for (const node of nodes) {
    if (typeof node === "string") {
      out.text += node
    } else if (isValidElement(node)) {
      const element = node as ReactElement<ElementProps>
      out.tags.push(String(element.type))
      if (element.type === "a") out.hrefs.push(element.props.href)
      const children = element.props.children
      collect(Array.isArray(children) ? children : children === undefined ? [] : [children], out)
    }
  }
  return out
}

function render(html: string) {
  return collect(renderRichPreviewNodes(html), { tags: [], text: "", hrefs: [] })
}

describe("renderRichPreviewNodes", () => {
  test("keeps plain <br> line breaks", () => {
    expect(render("<p>One<br>Two</p>").tags).toEqual(["p", "br"])
  })

  test("drops unsafe link schemes and keeps safe ones", () => {
    expect(render('<a href="javascript:alert(1)">x</a><a href="https://t.me">y</a>').hrefs).toEqual([undefined, "https://t.me"])
  })

  test("decodes entities for display and never renders unknown tags", () => {
    const result = render("<p>Tom &amp; Jerry &lt;b&gt;</p><script>alert(1)</script>")
    expect(result.text).toBe("Tom & Jerry <b>alert(1)")
    expect(result.tags).toEqual(["p"])
  })
})
