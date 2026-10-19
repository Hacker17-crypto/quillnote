export type BadgeKind = 'new' | 'beta'

const LABEL: Record<BadgeKind, string> = { new: 'NEW', beta: 'BETA' }

export function Badge({ kind, children }: { kind: BadgeKind; children?: string }): JSX.Element {
  return <span className={`q-badge ${kind}`}>{children ?? LABEL[kind]}</span>
}
