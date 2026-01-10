export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          price: number
          images: string[]
          video_urls: string[]
          features: Json | null
          tiktok_shop_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          price: number
          images?: string[]
          video_urls?: string[]
          features?: Json | null
          tiktok_shop_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          price?: number
          images?: string[]
          video_urls?: string[]
          features?: Json | null
          tiktok_shop_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          template_id: string | null
          title: string
          content_type: string
          generation_method: string
          status: string
          tiktok_video_id: string | null
          local_path: string | null
          remote_url: string | null
          duration_seconds: number | null
          input_props: Json | null
          progress: number | null
          progress_message: string | null
          created_at: string
          posted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          template_id?: string | null
          title: string
          content_type: string
          generation_method?: string
          status?: string
          tiktok_video_id?: string | null
          local_path?: string | null
          remote_url?: string | null
          duration_seconds?: number | null
          input_props?: Json | null
          progress?: number | null
          progress_message?: string | null
          created_at?: string
          posted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          template_id?: string | null
          title?: string
          content_type?: string
          generation_method?: string
          status?: string
          tiktok_video_id?: string | null
          local_path?: string | null
          remote_url?: string | null
          duration_seconds?: number | null
          input_props?: Json | null
          progress?: number | null
          progress_message?: string | null
          created_at?: string
          posted_at?: string | null
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          type: string
          content_type: string
          config: Json
          performance_score: number | null
          conversion_rate: number | null
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          content_type: string
          config: Json
          performance_score?: number | null
          conversion_rate?: number | null
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          content_type?: string
          config?: Json
          performance_score?: number | null
          conversion_rate?: number | null
          usage_count?: number
          created_at?: string
        }
      }
      video_analytics: {
        Row: {
          id: string
          video_id: string
          recorded_at: string
          views: number
          likes: number
          comments: number
          shares: number
          clicks: number
          orders: number
          gmv: number
          avg_watch_time: number | null
          completion_rate: number | null
        }
        Insert: {
          id?: string
          video_id: string
          recorded_at?: string
          views?: number
          likes?: number
          comments?: number
          shares?: number
          clicks?: number
          orders?: number
          gmv?: number
          avg_watch_time?: number | null
          completion_rate?: number | null
        }
        Update: {
          id?: string
          video_id?: string
          recorded_at?: string
          views?: number
          likes?: number
          comments?: number
          shares?: number
          clicks?: number
          orders?: number
          gmv?: number
          avg_watch_time?: number | null
          completion_rate?: number | null
        }
      }
      schedules: {
        Row: {
          id: string
          video_id: string
          scheduled_at: string
          status: string
          retry_count: number
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          scheduled_at: string
          status?: string
          retry_count?: number
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          scheduled_at?: string
          status?: string
          retry_count?: number
          error_message?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type Video = Database['public']['Tables']['videos']['Row']
export type VideoInsert = Database['public']['Tables']['videos']['Insert']
export type VideoUpdate = Database['public']['Tables']['videos']['Update']

export type Template = Database['public']['Tables']['templates']['Row']
export type VideoAnalytics = Database['public']['Tables']['video_analytics']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']

// Content types
export type ContentType =
  | 'product_intro'
  | 'before_after'
  | 'review'
  | 'avatar'
  | 'ugc'
  | 'unboxing'

// Generation methods
export type GenerationMethod = 'remotion' | 'heygen' | 'ffmpeg'

// Video status
export type VideoStatus = 'draft' | 'generating' | 'ready' | 'posting' | 'posted' | 'failed' | 'cancelled'

// Schedule status
export type ScheduleStatus = 'pending' | 'processing' | 'completed' | 'failed'
