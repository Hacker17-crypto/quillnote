/** On-canvas ruler state (screen space). Strokes that start near an edge are drawn along it. */
export interface RulerState {
  cx: number
  cy: number
  /** Radians. */
  angle: number
  length: number
  thickness: number
}

const SNAP_PX = 26
const listeners = new Set<() => void>()

export const ruler = {
  state: { cx: 0, cy: 0, angle: 0, length: 720, thickness: 76 } as RulerState,
  placed: false,
  set(p: Partial<RulerState>): void {
    ruler.state = { ...ruler.state, ...p }
    ruler.placed = true
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void): () => void {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  /** If (clientX, clientY) is close to a ruler edge, return a projector onto that edge in page units. */
  lineNear(clientX: number, clientY: number, svg: SVGSVGElement): { project(x: number, y: number): [number, number] } | null {
    const { cx, cy, angle, length, thickness } = ruler.state
    const ux = Math.cos(angle)
    const uy = Math.sin(angle)
    const nx = -uy
    const ny = ux
    const along = (clientX - cx) * ux + (clientY - cy) * uy
    if (Math.abs(along) > length / 2 + SNAP_PX) return null
    const across = (clientX - cx) * nx + (clientY - cy) * ny
    const edge = Math.abs(across - thickness / 2) < SNAP_PX ? thickness / 2 : Math.abs(across + thickness / 2) < SNAP_PX ? -thickness / 2 : null
    if (edge === null) return null
    const m = svg.getScreenCTM()?.inverse()
    if (!m) return null
    // two points on the edge, converted into page coordinates
    const a = new DOMPoint(cx + nx * edge - ux * 100, cy + ny * edge - uy * 100).matrixTransform(m)
    const b = new DOMPoint(cx + nx * edge + ux * 100, cy + ny * edge + uy * 100).matrixTransform(m)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy || 1
    return {
      project(x, y) {
        const t = ((x - a.x) * dx + (y - a.y) * dy) / len2
        return [a.x + t * dx, a.y + t * dy]
      }
    }
  }
}
