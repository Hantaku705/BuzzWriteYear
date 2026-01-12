'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CreateBatchRequest,
  CreateBatchResponse,
  BatchStatusResponse,
} from '@/types/batch'

// API関数
async function createBatchJob(params: CreateBatchRequest): Promise<CreateBatchResponse> {
  const response = await fetch('/api/videos/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create batch job')
  }

  return response.json()
}

async function getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
  const response = await fetch(`/api/videos/batch?id=${batchId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch batch status')
  }

  return response.json()
}

interface BatchJobSummary {
  id: string
  type: string
  name: string | null
  status: string
  totalCount: number
  completedCount: number
  failedCount: number
  progress: number
  createdAt: string
}

async function getBatchJobs(): Promise<BatchJobSummary[]> {
  const response = await fetch('/api/videos/batch')

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch batch jobs')
  }

  const data = await response.json()
  return data.batchJobs
}

// Query Keys
export const batchKeys = {
  all: ['batch-jobs'] as const,
  list: () => [...batchKeys.all, 'list'] as const,
  status: (id: string) => [...batchKeys.all, 'status', id] as const,
}

// Hooks

// バッチジョブ一覧取得
export function useBatchJobs() {
  return useQuery({
    queryKey: batchKeys.list(),
    queryFn: getBatchJobs,
    staleTime: 1000 * 30, // 30秒
  })
}

// バッチジョブステータス取得（ポーリング対応）
export function useBatchStatus(
  batchId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: batchKeys.status(batchId ?? ''),
    queryFn: () => getBatchStatus(batchId!),
    enabled: !!batchId && (options?.enabled !== false),
    refetchInterval: (query) => {
      const data = query.state.data
      // 完了またはキャンセル時はポーリング停止
      if (
        data?.status === 'completed' ||
        data?.status === 'failed' ||
        data?.status === 'cancelled'
      ) {
        return false
      }
      return 3000 // 3秒ごとにポーリング
    },
  })
}

// バッチジョブ作成
export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBatchJob,
    onSuccess: () => {
      // バッチジョブ一覧を再取得
      queryClient.invalidateQueries({ queryKey: batchKeys.list() })
    },
  })
}

// CSV解析ユーティリティ
export function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSVには少なくともヘッダーと1行のデータが必要です')
  }

  // ヘッダー解析
  const headers = parseCSVLine(lines[0])

  // データ行解析
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line)
    if (values.length !== headers.length) {
      throw new Error(`Row ${index + 2}: Column count mismatch`)
    }
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i]
      return obj
    }, {} as Record<string, string>)
  })

  return { headers, rows }
}

// CSV行解析（クォート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())

  return result
}
