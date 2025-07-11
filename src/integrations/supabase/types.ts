export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          language: string | null
          messages: Json | null
          session_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          messages?: Json | null
          session_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          messages?: Json | null
          session_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_insights: {
        Row: {
          expires_at: string | null
          generated_at: string
          id: string
          insight_data: Json
          insight_type: string
          owner_id: string
        }
        Insert: {
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_data: Json
          insight_type: string
          owner_id: string
        }
        Update: {
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_data?: Json
          insight_type?: string
          owner_id?: string
        }
        Relationships: []
      }
      business_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_main_location: boolean | null
          manager_id: string | null
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_main_location?: boolean | null
          manager_id?: string | null
          name: string
          owner_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_main_location?: boolean | null
          manager_id?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      customer_credit: {
        Row: {
          created_at: string
          credit_limit: number | null
          credit_score: number | null
          current_balance: number | null
          customer_id: string
          id: string
          last_payment_date: string | null
          owner_id: string
          payment_history: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          current_balance?: number | null
          customer_id: string
          id?: string
          last_payment_date?: string | null
          owner_id: string
          payment_history?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number | null
          credit_score?: number | null
          current_balance?: number | null
          customer_id?: string
          id?: string
          last_payment_date?: string | null
          owner_id?: string
          payment_history?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty_points: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          last_transaction_date: string | null
          owner_id: string
          points_earned_today: number | null
          total_points: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          last_transaction_date?: string | null
          owner_id: string
          points_earned_today?: number | null
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          last_transaction_date?: string | null
          owner_id?: string
          points_earned_today?: number | null
          total_points?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discounts: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          id: string
          type: string
          value: number
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          id?: string
          type: string
          value: number
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          id?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          application_data: Json | null
          created_at: string
          id: string
          loan_type: string
          requested_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_data?: Json | null
          created_at?: string
          id?: string
          loan_type: string
          requested_amount: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_data?: Json | null
          created_at?: string
          id?: string
          loan_type?: string
          requested_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_programs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          points_per_tzs: number | null
          reward_threshold: number | null
          reward_value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          points_per_tzs?: number | null
          reward_threshold?: number | null
          reward_value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          points_per_tzs?: number | null
          reward_threshold?: number | null
          reward_value?: number | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          listing_type: string | null
          location: string | null
          product_name: string
          quantity: number
          seller_id: string
          unit_price: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_type?: string | null
          location?: string | null
          product_name: string
          quantity: number
          seller_id: string
          unit_price: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_type?: string | null
          location?: string | null
          product_name?: string
          quantity?: number
          seller_id?: string
          unit_price?: number
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          is_verified_purchase: boolean | null
          product_id: string
          rating: number | null
          review_text: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id: string
          rating?: number | null
          review_text?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number | null
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          generated_barcode: boolean | null
          id: string
          image_url: string | null
          low_stock_threshold: number | null
          name: string
          owner_id: string
          price: number
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          generated_barcode?: boolean | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          name: string
          owner_id: string
          price?: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          generated_barcode?: boolean | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          name?: string
          owner_id?: string
          price?: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          sale_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          discount_id: string | null
          id: string
          owner_id: string
          payment_method: string | null
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_id?: string | null
          id?: string
          owner_id: string
          payment_method?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_id?: string | null
          id?: string
          owner_id?: string
          payment_method?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          owner_id: string
          predicted_date: string
          predicted_quantity: number
          prediction_factors: Json | null
          product_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          owner_id: string
          predicted_date: string
          predicted_quantity: number
          prediction_factors?: Json | null
          product_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          owner_id?: string
          predicted_date?: string
          predicted_quantity?: number
          prediction_factors?: Json | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_predictions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          business_name: string | null
          created_at: string | null
          currency: string | null
          enable_notifications: boolean | null
          id: string
          owner_id: string
          receipt_footer: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          currency?: string | null
          enable_notifications?: boolean | null
          id?: string
          owner_id: string
          receipt_footer?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          currency?: string | null
          enable_notifications?: boolean | null
          id?: string
          owner_id?: string
          receipt_footer?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      smart_receipts: {
        Row: {
          created_at: string
          customer_notes: string | null
          digital_wallet_data: Json | null
          id: string
          qr_code: string
          sale_id: string
          tax_category: string | null
          warranty_info: Json | null
        }
        Insert: {
          created_at?: string
          customer_notes?: string | null
          digital_wallet_data?: Json | null
          id?: string
          qr_code: string
          sale_id: string
          tax_category?: string | null
          warranty_info?: Json | null
        }
        Update: {
          created_at?: string
          customer_notes?: string | null
          digital_wallet_data?: Json | null
          id?: string
          qr_code?: string
          sale_id?: string
          tax_category?: string | null
          warranty_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_receipts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      social_shares: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          owner_id: string
          platform: string | null
          share_count: number | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          owner_id: string
          platform?: string | null
          share_count?: number | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          platform?: string | null
          share_count?: number | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          email: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          phone: string | null
          role: string
          store_location_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          phone?: string | null
          role?: string
          store_location_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          phone?: string | null
          role?: string
          store_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_store_location_id_fkey"
            columns: ["store_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance: {
        Row: {
          commission_earned: number | null
          created_at: string
          id: string
          location_id: string
          performance_date: string
          sales_amount: number | null
          sales_count: number | null
          staff_id: string
        }
        Insert: {
          commission_earned?: number | null
          created_at?: string
          id?: string
          location_id: string
          performance_date: string
          sales_amount?: number | null
          sales_count?: number | null
          staff_id: string
        }
        Update: {
          commission_earned?: number | null
          created_at?: string
          id?: string
          location_id?: string
          performance_date?: string
          sales_amount?: number | null
          sales_count?: number | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_main_location: boolean | null
          manager_id: string | null
          name: string
          owner_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_main_location?: boolean | null
          manager_id?: string | null
          name: string
          owner_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_main_location?: boolean | null
          manager_id?: string | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string
          currency: string
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          billing_period?: string
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
        }
        Update: {
          billing_period?: string
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          usage_count: number | null
          usage_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          usage_count?: number | null
          usage_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          usage_count?: number | null
          usage_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_admin_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_id: string
          created_at: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          last_payment_date: string | null
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_payment_date?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_payment_date?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_commands: {
        Row: {
          action_taken: string | null
          command_text: string
          created_at: string
          id: string
          language: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          command_text: string
          created_at?: string
          id?: string
          language: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          command_text?: string
          created_at?: string
          id?: string
          language?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      warranty_claims: {
        Row: {
          claim_data: Json | null
          claim_status: string
          claim_type: string
          created_at: string
          customer_id: string | null
          id: string
          product_id: string
          receipt_id: string
        }
        Insert: {
          claim_data?: Json | null
          claim_status?: string
          claim_type: string
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id: string
          receipt_id: string
        }
        Update: {
          claim_data?: Json | null
          claim_status?: string
          claim_type?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "smart_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          owner_id: string
          phone_number: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          owner_id: string
          phone_number: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          owner_id?: string
          phone_number?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_status: {
        Args: { user_uuid: string }
        Returns: {
          is_active: boolean
          status: string
          days_remaining: number
        }[]
      }
      generate_barcode_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_assistant: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
