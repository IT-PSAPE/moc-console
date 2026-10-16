import type { ChildNode, Plugin, Rule } from 'postcss'

const VIEWPORT_ORDER = ['desktop', 'tablet', 'landscape', 'portrait']

function getSelectorOrder(rule: Rule): number | undefined {
  const matches = rule.selector.matchAll(/(?:\.|\\:)(desktop|tablet|landscape|portrait)\\:/g)
  const orders = Array.from(matches, match => VIEWPORT_ORDER.indexOf(match[1]))
  return orders.length > 0 ? Math.max(...orders) : undefined
}

function getViewportOrder(node: ChildNode): number | undefined {
  if (node.type === 'rule') return getSelectorOrder(node)
  if (node.type !== 'atrule' || !['media', 'supports', 'container'].includes(node.name) || !node.nodes?.length) return undefined
  const orders = node.nodes.filter(child => child.type !== 'comment').map(getViewportOrder)
  const order = orders[0]
  return order !== undefined && orders.every(value => value === order) ? order : undefined
}

/** Tailwind reserves portrait/landscape for orientation and retains their original
 * variant order when overridden. Sort only generated viewport utilities after
 * Tailwind compilation so named, descending breakpoints have normal specificity. */
export function namedBreakpointOrder(): Plugin {
  return {
    postcssPlugin: 'moc-named-breakpoint-order',
    OnceExit(root) {
      root.walkAtRules('layer', layer => {
        if (layer.params !== 'utilities' || !layer.nodes?.length) return
        const responsive = layer.nodes.flatMap((node, index) => {
          const order = getViewportOrder(node)
          return order === undefined ? [] : [{ node, index, order }]
        })
        responsive.sort((first, second) => first.order - second.order || first.index - second.index)
        for (const { node } of responsive) node.remove()
        for (const { node } of responsive) layer.append(node)
      })
    },
  }
}
