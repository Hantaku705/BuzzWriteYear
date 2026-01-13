/**
 * UGCスタイル React Query フック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UGCStyle,
  UGCStyleWithSamples,
  CreateUGCStyleRequest,
  UpdateUGCStyleRequest,
  UGCStyleExportJSON,
} from '@/types/ugc-style'

// ============================================
// API関数
// ============================================

async function fetchUGCStyles(): Promise<UGCStyle[]> {
  const res = await fetch('/api/ugc-styles')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'スタイルの取得に失敗しました')
  }
  const data = await res.json()
  return data.styles
}

async function fetchUGCStyle(id: string): Promise<UGCStyleWithSamples & { progress: number }> {
  const res = await fetch(`/api/ugc-styles/${id}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'スタイルの取得に失敗しました')
  }
  return res.json()
}

async function createUGCStyle(data: CreateUGCStyleRequest): Promise<{
  id: string
  status: string
  sampleCount: number
  estimatedTime: number
}> {
  const res = await fetch('/api/ugc-styles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'スタイルの作成に失敗しました')
  }
  return res.json()
}

async function updateUGCStyle(
  id: string,
  data: UpdateUGCStyleRequest
): Promise<UGCStyle> {
  const res = await fetch(`/api/ugc-styles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'スタイルの更新に失敗しました')
  }
  return res.json()
}

async function deleteUGCStyle(id: string): Promise<void> {
  const res = await fetch(`/api/ugc-styles/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'スタイルの削除に失敗しました')
  }
}

async function exportUGCStyle(id: string): Promise<UGCStyleExportJSON> {
  const res = await fetch(`/api/ugc-styles/${id}/export`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'エクスポートに失敗しました')
  }
  return res.json()
}

async function importUGCStyle(data: UGCStyleExportJSON): Promise<{
  success: boolean
  id: string
  name: string
  message?: string
}> {
  const res = await fetch('/api/ugc-styles/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'インポートに失敗しました')
  }
  return res.json()
}

// ============================================
// フック
// ============================================

/** スタイル一覧取得 */
export function useUGCStyles() {
  return useQuery({
    queryKey: ['ugc-styles'],
    queryFn: fetchUGCStyles,
  })
}

/** スタイル詳細取得（ポーリング対応） */
export function useUGCStyle(id: string | null, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['ugc-style', id],
    queryFn: () => fetchUGCStyle(id!),
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  })
}

/** スタイル詳細取得（分析中のポーリング） */
export function useUGCStyleWithPolling(id: string | null) {
  const query = useUGCStyle(id, {
    refetchInterval: 5000, // 5秒ごとにポーリング
  })

  // readyになったらポーリング停止
  const shouldPoll = query.data?.status === 'analyzing'

  return useQuery({
    queryKey: ['ugc-style', id],
    queryFn: () => fetchUGCStyle(id!),
    enabled: !!id,
    refetchInterval: shouldPoll ? 5000 : false,
  })
}

/** スタイル作成 */
export function useCreateUGCStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createUGCStyle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ugc-styles'] })
    },
  })
}

/** スタイル更新 */
export function useUpdateUGCStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUGCStyleRequest }) =>
      updateUGCStyle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ugc-styles'] })
      queryClient.invalidateQueries({ queryKey: ['ugc-style', variables.id] })
    },
  })
}

/** スタイル削除 */
export function useDeleteUGCStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUGCStyle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ugc-styles'] })
    },
  })
}

/** スタイルエクスポート */
export function useExportUGCStyle() {
  return useMutation({
    mutationFn: exportUGCStyle,
  })
}

/** スタイルインポート */
export function useImportUGCStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: importUGCStyle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ugc-styles'] })
    },
  })
}

// ============================================
// ユーティリティ
// ============================================

/** JSONファイルをダウンロード */
export function downloadJSON(data: UGCStyleExportJSON, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** JSONファイルを読み込み */
export async function readJSONFile(file: File): Promise<UGCStyleExportJSON> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        resolve(json)
      } catch (error) {
        reject(new Error('無効なJSONファイルです'))
      }
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsText(file)
  })
}
