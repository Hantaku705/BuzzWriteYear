import { createClient } from '@/lib/supabase/client'
import type { Product, ProductInsert, ProductUpdate } from '@/types/database'

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Product[] | null) ?? []
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Product | null
}

export async function createProduct(product: Omit<ProductInsert, 'user_id'>): Promise<Product> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const insertData = {
    name: product.name,
    price: product.price,
    user_id: user.id,
    description: product.description ?? null,
    images: product.images ?? [],
    video_urls: product.video_urls ?? [],
    features: product.features ?? null,
    tiktok_shop_id: product.tiktok_shop_id ?? null,
  }

  const { data, error } = await supabase
    .from('products')
    .insert(insertData as never)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, product: ProductUpdate): Promise<Product> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .update(product as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) throw error
}
