import { NotebookPen } from 'lucide-react'
import { useLibrary } from '../../stores/library'
import { useTabs } from '../../stores/tabs'
import { ITEM_TYPE_LABEL } from '@shared/docs'

/** Stand-in until the editor shell lands in M3: shows what was opened. */
export function EditorPlaceholder({ id }: { id: string }): JSX.Element {
  const item = useLibrary((s) => s.items.find((i) => i.id === id))
  const activate = useTabs((s) => s.activate)
  return (
    <div className="editor-ph">
      <NotebookPen size={44} strokeWidth={1.4} />
      <h2>{item?.title ?? 'Document'}</h2>
      <p>
        {item ? `${ITEM_TYPE_LABEL[item.type]} · ${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}` : ''}
        <br />
        The page editor arrives in the next milestone.
      </p>
      <button type="button" className="q-btn outline" onClick={() => activate('home')}>
        Back to library
      </button>
    </div>
  )
}
