export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          session_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_insights: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          insight_data: Json
          insight_type: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          insight_data: Json
          insight_type: string
          owner_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          insight_data?: Json
          insight_type?: string
          owner_id?: string
        }
        Relationships: []
      }
      customer_transactions: {
        Row: {
          amount_paid: number | null
          balance: number | null
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          notes: string | null
          owner_id: string
          payment_method: string | null
          payment_status: string
          product_name: string | null
          quantity: number | null
          total_amount: number
          transaction_date: string
          transaction_type: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          payment_status?: string
          product_name?: string | null
          quantity?: number | null
          total_amount: number
          transaction_date?: string
          transaction_type: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          payment_status?: string
          product_name?: string | null
          quantity?: number | null
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          outstanding_balance: number | null
          owner_id: string
          phone: string | null
          total_purchases: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          outstanding_balance?: number | null
          owner_id: string
          phone?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          outstanding_balance?: number | null
          owner_id?: string
          phone?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          active: boolean | null
          applicable_products: Json | null
          created_at: string
          discount_type: string
          end_date: string | null
          id: string
          name: string
          owner_id: string
          start_date: string | null
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean | null
          applicable_products?: Json | null
          created_at?: string
          discount_type: string
          end_date?: string | null
          id?: string
          name: string
          owner_id: string
          start_date?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          active?: boolean | null
          applicable_products?: Json | null
          created_at?: string
          discount_type?: string
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      inventory_snapshots: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          product_id: string
          quantity: number
          snapshot_date: string
          snapshot_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          product_id: string
          quantity: number
          snapshot_date?: string
          snapshot_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          product_id?: string
          quantity?: number
          snapshot_date?: string
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "micro_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          contact_info: Json | null
          created_at: string
          description: string | null
          id: string
          listing_type: string
          location: string | null
          price: number | null
          product_name: string
          quantity: number
          seller_id: string
          status: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          listing_type: string
          location?: string | null
          price?: number | null
          product_name: string
          quantity: number
          seller_id: string
          status?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          listing_type?: string
          location?: string | null
          price?: number | null
          product_name?: string
          quantity?: number
          seller_id?: string
          status?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      micro_loans: {
        Row: {
          amount_paid: number | null
          balance: number
          created_at: string
          customer_id: string | null
          customer_name: string
          due_date: string
          id: string
          interest_rate: number | null
          loan_amount: number
          loan_date: string
          notes: string | null
          owner_id: string
          phone: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance: number
          created_at?: string
          customer_id?: string | null
          customer_name: string
          due_date: string
          id?: string
          interest_rate?: number | null
          loan_amount: number
          loan_date?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          due_date?: string
          id?: string
          interest_rate?: number | null
          loan_amount?: number
          loan_date?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_loans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_weight_based: boolean | null
          low_stock_threshold: number | null
          min_quantity: number | null
          name: string
          owner_id: string
          parent_product_id: string | null
          price: number
          stock_quantity: number
          unit: string | null
          unit_type: string | null
          updated_at: string
          variant_name: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_weight_based?: boolean | null
          low_stock_threshold?: number | null
          min_quantity?: number | null
          name: string
          owner_id: string
          parent_product_id?: string | null
          price: number
          stock_quantity?: number
          unit?: string | null
          unit_type?: string | null
          updated_at?: string
          variant_name?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_weight_based?: boolean | null
          low_stock_threshold?: number | null
          min_quantity?: number | null
          name?: string
          owner_id?: string
          parent_product_id?: string | null
          price?: number
          stock_quantity?: number
          unit?: string | null
          unit_type?: string | null
          updated_at?: string
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          id: string
          owner_id: string
          payment_method: string | null
          payment_status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          owner_id: string
          payment_method?: string | null
          payment_status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          owner_id?: string
          payment_method?: string | null
          payment_status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
          predicted_quantity: number
          prediction_date: string
          prediction_factors: Json | null
          product_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          owner_id: string
          predicted_quantity: number
          prediction_date: string
          prediction_factors?: Json | null
          product_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          owner_id?: string
          predicted_quantity?: number
          prediction_date?: string
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
      voice_commands: {
        Row: {
          command_text: string
          command_type: string | null
          created_at: string
          id: string
          result: Json | null
          user_id: string
        }
        Insert: {
          command_text: string
          command_type?: string | null
          created_at?: string
          id?: string
          result?: Json | null
          user_id: string
        }
        Update: {
          command_text?: string
          command_type?: string | null
          created_at?: string
          id?: string
          result?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
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
