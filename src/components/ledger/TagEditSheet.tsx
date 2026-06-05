'use client'
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/lib/types'

interface Props {
  tags: Tag[]
  onRefresh: () => void
  onClose: () => void
}

export default function TagEditSheet({ tags, onRefresh, onClose }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  async function addTag() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    await supabase.from('tags').insert({ name, use_count: 0 })
    setNewName('')
    onRefresh()
    setAdding(false)
  }

  async function deleteTag(id: string) {
    await supabase.from('tags').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl p-4 pb-8"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 拖动条 */}
        <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--color-border)' }} />
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>管理标签</p>

        {/* 现有标签（可删除）*/}
        <div className="flex flex-wrap gap-2 mb-4 min-h-8">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs"
              style={{ background: 'var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-text)' }}>{tag.name}</span>
              <button
                onClick={() => deleteTag(tag.id)}
                className="w-4 h-4 rounded-full flex items-center justify-center ml-0.5"
                style={{ background: '#C4A09B30', color: 'var(--color-morandi-rose)' }}
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>

        {/* 添加新标签 */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
          style={{ background: 'var(--color-border)' }}
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="添加新标签..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text)' }}
          />
          <button
            onClick={addTag}
            disabled={!newName.trim() || adding}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              background: newName.trim() ? 'var(--color-morandi-rose)' : '#C4A09B50',
              color: 'white',
            }}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
