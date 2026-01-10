'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, Package, Pencil, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProductForm } from '@/components/product/ProductForm'
import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { Product } from '@/types/database'

export default function ProductsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  const { data: products = [], isLoading, error, refetch } = useProducts()
  const deleteProduct = useDeleteProduct()

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingProduct(null)
  }

  const handleDelete = async () => {
    if (deletingProductId) {
      try {
        await deleteProduct.mutateAsync(deletingProductId)
        toast.success('商品を削除しました')
      } catch {
        toast.error('削除に失敗しました')
      }
      setDeletingProductId(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price)
  }

  // Show login prompt if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">商品管理</h1>
          <p className="text-zinc-400">商品を登録してバズ動画を作成</p>
        </div>
        <LoginPrompt
          title="ログインして商品を管理"
          description="Googleアカウントでログインすると、商品を登録・管理できます。登録した商品から動画を自動生成できます。"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">商品管理</h1>
          <p className="text-zinc-400">商品を登録してバズ動画を作成</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-pink-500 hover:bg-pink-600">
              <Plus className="mr-2 h-4 w-4" />
              商品を追加
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingProduct ? '商品を編集' : '商品を追加'}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              productId={editingProduct?.id}
              initialData={
                editingProduct
                  ? {
                      name: editingProduct.name,
                      description: editingProduct.description || '',
                      price: editingProduct.price,
                      images: editingProduct.images,
                      features: Array.isArray(editingProduct.features)
                        ? (editingProduct.features as string[])
                        : [],
                    }
                  : undefined
              }
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="商品名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">
            商品一覧 {products.length > 0 && `(${products.length}件)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-4 py-3 border-b border-zinc-800">
                <Skeleton className="h-4 w-24 bg-zinc-800" />
                <Skeleton className="h-4 w-16 bg-zinc-800" />
                <Skeleton className="h-4 w-20 bg-zinc-800" />
                <Skeleton className="h-4 w-20 bg-zinc-800" />
                <Skeleton className="h-4 w-16 bg-zinc-800" />
              </div>
              {/* Table Row Skeletons */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3 animate-in fade-in-50 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded bg-zinc-800" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-zinc-800" />
                      <Skeleton className="h-3 w-48 bg-zinc-800" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20 bg-zinc-800" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
                    <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
                  </div>
                  <Skeleton className="h-4 w-24 bg-zinc-800" />
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded bg-zinc-800" />
                    <Skeleton className="h-8 w-8 rounded bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-red-500 mb-2">データの読み込みに失敗しました</p>
              <p className="text-sm text-zinc-500 mb-4">{String(error)}</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                再読み込み
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-zinc-700 mb-4" />
              <p className="text-zinc-400">
                {searchQuery ? '検索結果がありません' : 'まだ商品がありません'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {searchQuery
                  ? '検索キーワードを変更してください'
                  : '「商品を追加」ボタンから最初の商品を登録しましょう'}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  最初の商品を追加
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">商品名</TableHead>
                  <TableHead className="text-zinc-400">価格</TableHead>
                  <TableHead className="text-zinc-400">特徴</TableHead>
                  <TableHead className="text-zinc-400">作成日</TableHead>
                  <TableHead className="text-zinc-400 w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-3">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center">
                            <Package className="h-5 w-5 text-zinc-600" />
                          </div>
                        )}
                        <div>
                          <div>{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      {formatPrice(product.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(product.features) &&
                          (product.features as string[]).slice(0, 2).map((feature, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="bg-zinc-800 text-zinc-300"
                            >
                              {feature}
                            </Badge>
                          ))}
                        {Array.isArray(product.features) &&
                          (product.features as string[]).length > 2 && (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-800 text-zinc-500"
                            >
                              +{(product.features as string[]).length - 2}
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(product.created_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-500"
                          onClick={() => setDeletingProductId(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingProductId}
        onOpenChange={(open) => !open && setDeletingProductId(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              商品を削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              この操作は取り消せません。商品に関連する動画も削除される可能性があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '削除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
