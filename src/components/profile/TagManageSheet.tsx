'use client'
import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Pencil, Trash2, Check, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/lib/types'

interface Props {
  onClose: () => void
}

export default function TagManageSheet({ onClose }: Props) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { fetchTags() }, [])

  async function fetchTags() {
    setLoading(true)
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('use_count', { ascending: false })
    setTags(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(
    () => search ? tags.filter(t => t.name.includes(search)) : tags,
    [tags, search]
  )

  async function handleAdd() {
    if (!newName.trim() || saving) return
    const exists = tags.some(t => t.name === newName.trim())
    if (exists) return
    setSaving(true)
    await supabase.from('tags').insert({ name: newName.trim(), use_count: 0 })
    setNewName('')
    setSaving(false)
    fetchTags()
  }

  function startEdit(tag: Tag) {
    setEditId(tag.id)
    setEditName(tag.name)
  }

  async function saveEdit() {
    if (!editId || !editName.trim()) return
    await supabase.from('tags').update({ name: editName.trim() }).eq('id', editId)
    setEditId(null)
    fetchTags()
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    await supabase.from('transaction_tags').delete().eq('tag_id', confirmDeleteId)
    await supabase.from('tags').delete().eq('id', confirmDeleteId)
    setConfirmDeleteId(null)
    fetchTags()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[88vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>标签管理</p>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-bg)' }}
          >
            <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索标签..."
              className="flex-1 text-xs bg-transparent outline-none"
              style={{ color: 'var(--color-text)' }}
            />
          </div>
        </div>

        {/* 标签列表 */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5">
          {loading ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              {search ? '没有匹配的标签' : '还没有标签'}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map(tag => (
                <div key={tag.id}>
                  {editId === tag.id ? (
                    /* 编辑模式 */
                    <div className="flex items-center gap-2 py-1.5">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
                      />
                      <button
                        onClick={saveEdit}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ background: 'var(--color-morandi-rose)' }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--color-border)' }}
                      >
                        <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                  ) : confirmDeleteId === tag.id ? (
                    /* 删除确认 */
                    <div className="rounded-xl p-3" style={{ background: '#FFF5F5' }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text)' }}>
                        {tag.use_count > 0
                          ? `「${tag.name}」已使用 ${tag.use_count} 次，确认删除？`
                          : `确认删除「${tag.name}」？`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={confirmDelete}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ background: '#D4726A' }}
                        >
                          确认删除
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 正常显示 */
                    <div className="flex items-center gap-3 py-2.5 px-1">
                      <p className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{tag.name}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                        {tag.use_count} 次
                      </span>
                      <button onClick={() => startEdit(tag)} className="p-1.5 rounded-lg active:opacity-60">
                        <Pencil size={13} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(tag.id)} className="p-1.5 rounded-lg active:opacity-60">
                        <Trash2 size={13} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 添加新标签 */}
        <div className="px-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="添加新标签..."
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || saving}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity"
              style={{ background: 'var(--color-morandi-rose)', opacity: !newName.trim() || saving ? 0.4 : 1 }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
