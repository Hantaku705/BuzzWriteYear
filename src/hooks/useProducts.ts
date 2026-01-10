'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/api/products'
import type { ProductInsert, ProductUpdate } from '@/types/database'

export const productKeys = {
  all: ['products'] as const,
  detail: (id: string) => ['products', id] as const,
}

export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: getProducts,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (product: Omit<ProductInsert, 'user_id'>) => createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, product }: { id: string; product: ProductUpdate }) =>
      updateProduct(id, product),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(data.id) })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
