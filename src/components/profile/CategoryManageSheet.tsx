'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TransactionType, Category } from '@/lib/types'

const MORANDI_PALETTE = [
  '#C4A09B', '#C9A88A', '#CBBEA6', '#A3AB8E',
  '#9FB5A3', '#8FB5B0', '#94ACBE', '#ADA8C6', '#B89EB5',
]

interface Props {
  onClose: () => void
}

export default function CategoryManageSheet({ onClose }: Props) {
  const [type, setType] = useState<TransactionType>('expense')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(MORANDI_PALETTE[0])
  const [saving, setSaving] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteCount, setDeleteCount] = useState(0)

  useEffect(() => { fetchCategories() }, [type])

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('sort_order')
    setCategories(data ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!newName.trim() || saving) return
    setSaving(true)
    const maxOrder = categories.length > 0
      ? Math.max(...categories.map((c: Category & { sort_order?: number }) => (c as { sort_order?: number }).sort_order ?? 0))
      : 0
    await supabase.from('categories').insert({
      name: newName.trim(),
      type,
      color: newColor,
      sort_order: maxOrder + 1,
    })
    setNewName('')
    setNewColor(MORANDI_PALETTE[0])
    setSaving(false)
    fetchCategories()
  }

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  async function saveEdit() {
    if (!editId || !editName.trim()) return
    await supabase.from('categories').update({
      name: editName.trim(),
      color: editColor,
    }).eq('id', editId)
    setEditId(null)
    fetchCategories()
  }

  async function swapOrder(i: number, j: number) {
    const a = categories[i] as Category & { sort_order?: number }
    const b = categories[j] as Category & { sort_order?: number }
    const aOrder = a.sort_order ?? i
    const bOrder = b.sort_order ?? j
    await Promise.all([
      supabase.from('categories').update({ sort_order: bOrder }).eq('id', a.id),
      supabase.from('categories').update({ sort_order: aOrder }).eq('id', b.id),
    ])
    fetchCategories()
  }

  async function startDelete(id: string) {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
    setDeleteCount(count ?? 0)
    setConfirmDeleteId(id)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    await supabase.from('categories').delete().eq('id', confirmDeleteId)
    setConfirmDeleteId(null)
    fetchCategories()
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
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>分类管理</p>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* 支出/收入 Tab */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex p-1 rounded-xl" style={{ background: 'var(--color-border)' }}>
            {(['expense', 'income'] as const).map(t => {
              const active = type === t
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'var(--color-card)' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {t === 'expense' ? '支出分类' : '收入分类'}
                </button>
              )
            })}
          </div>
        </div>

        {/* 分类列表 */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5">
          {loading ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</p>
          ) : categories.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              还没有{type === 'expense' ? '支出' : '收入'}分类
            </p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat, idx) => (
                <div key={cat.id}>
                  {editId === cat.id ? (
                    /* 编辑模式 */
                    <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}
                        />
                        <button
                          onClick={saveEdit}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ background: editColor }}
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
                      <div className="flex gap-2 flex-wrap">
                        {MORANDI_PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className="w-7 h-7 rounded-full"
                            style={{
                              background: c,
                              outline: editColor === c ? `2.5px solid ${c}` : '2.5px solid transparent',
                              outlineOffset: '2px',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : confirmDeleteId === cat.id ? (
                    /* 删除确认 */
                    <div className="rounded-xl p-3" style={{ background: '#FFF5F5' }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text)' }}>
                        {deleteCount > 0
                          ? `「${cat.name}」下有 ${deleteCount} 笔记录，确认删除？`
                          : `确认删除「${cat.name}」？`}
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
                    <div className="flex items-center gap-2 py-2.5 px-1">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <p className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{cat.name}</p>
                      <button onClick={() => idx > 0 && swapOrder(idx, idx - 1)}
                        className="p-1 rounded-lg active:opacity-60"
                        style={{ opacity: idx === 0 ? 0.2 : 1 }}>
                        <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                      <button onClick={() => idx < categories.length - 1 && swapOrder(idx, idx + 1)}
                        className="p-1 rounded-lg active:opacity-60"
                        style={{ opacity: idx === categories.length - 1 ? 0.2 : 1 }}>
                        <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                      <button onClick={() => startEdit(cat)} className="p-1 rounded-lg active:opacity-60">
                        <Pencil size={13} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                      <button onClick={() => startDelete(cat.id)} className="p-1 rounded-lg active:opacity-60">
                        <Trash2 size={13} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 添加新分类 */}
        <div className="px-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>添加分类</p>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="分类名称"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || saving}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity"
              style={{ background: newColor, opacity: !newName.trim() || saving ? 0.4 : 1 }}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {MORANDI_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-7 h-7 rounded-full"
                style={{
                  background: c,
                  outline: newColor === c ? `2.5px solid ${c}` : '2.5px solid transparent',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
