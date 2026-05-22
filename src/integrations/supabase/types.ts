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
      abandoned_carts: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          items: Json
          recovered: boolean | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          seller_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          items?: Json
          recovered?: boolean | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          seller_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          items?: Json
          recovered?: boolean | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          seller_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_business_sessions: {
        Row: {
          active: boolean
          admin_id: string
          consent_responded_at: string | null
          consent_status: string
          ended_at: string | null
          id: string
          owner_id: string
          reason: string | null
          started_at: string
        }
        Insert: {
          active?: boolean
          admin_id: string
          consent_responded_at?: string | null
          consent_status?: string
          ended_at?: string | null
          id?: string
          owner_id: string
          reason?: string | null
          started_at?: string
        }
        Update: {
          active?: boolean
          admin_id?: string
          consent_responded_at?: string | null
          consent_status?: string
          ended_at?: string | null
          id?: string
          owner_id?: string
          reason?: string | null
          started_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          read_by: string | null
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          read_by?: string | null
          title: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          read_by?: string | null
          title?: string
        }
        Relationships: []
      }
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
      assistant_permissions: {
        Row: {
          assistant_id: string
          can_create_sales: boolean | null
          can_delete_products: boolean | null
          can_edit_customers: boolean | null
          can_edit_inventory: boolean | null
          can_edit_products: boolean | null
          can_view_customers: boolean | null
          can_view_inventory: boolean | null
          can_view_products: boolean | null
          can_view_reports: boolean | null
          can_view_sales: boolean | null
          created_at: string | null
          id: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          assistant_id: string
          can_create_sales?: boolean | null
          can_delete_products?: boolean | null
          can_edit_customers?: boolean | null
          can_edit_inventory?: boolean | null
          can_edit_products?: boolean | null
          can_view_customers?: boolean | null
          can_view_inventory?: boolean | null
          can_view_products?: boolean | null
          can_view_reports?: boolean | null
          can_view_sales?: boolean | null
          created_at?: string | null
          id?: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          assistant_id?: string
          can_create_sales?: boolean | null
          can_delete_products?: boolean | null
          can_edit_customers?: boolean | null
          can_edit_inventory?: boolean | null
          can_edit_products?: boolean | null
          can_view_customers?: boolean | null
          can_view_inventory?: boolean | null
          can_view_products?: boolean | null
          can_view_reports?: boolean | null
          can_view_sales?: boolean | null
          created_at?: string | null
          id?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      branch_staff: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ads: {
        Row: {
          created_at: string
          description: string | null
          display_location: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          owner_id: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_location?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          owner_id: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_location?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          owner_id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_branches: {
        Row: {
          branch_name: string
          branch_type: string
          created_at: string
          district: string | null
          features: Json
          id: string
          is_active: boolean
          owner_id: string
          region: string | null
          street: string | null
          subscription_amount: number
          subscription_expires_at: string | null
          subscription_status: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          branch_name: string
          branch_type?: string
          created_at?: string
          district?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          owner_id: string
          region?: string | null
          street?: string | null
          subscription_amount?: number
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          branch_name?: string
          branch_type?: string
          created_at?: string
          district?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          owner_id?: string
          region?: string | null
          street?: string | null
          subscription_amount?: number
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      business_compliance: {
        Row: {
          block_mode: string
          block_until: string | null
          business_license: string | null
          completed_at: string | null
          created_at: string
          enforced_by: string | null
          id: string
          nida_number: string | null
          notes: string | null
          owner_id: string
          required_after: string
          tin_number: string | null
          updated_at: string
        }
        Insert: {
          block_mode?: string
          block_until?: string | null
          business_license?: string | null
          completed_at?: string | null
          created_at?: string
          enforced_by?: string | null
          id?: string
          nida_number?: string | null
          notes?: string | null
          owner_id: string
          required_after?: string
          tin_number?: string | null
          updated_at?: string
        }
        Update: {
          block_mode?: string
          block_until?: string | null
          business_license?: string | null
          completed_at?: string | null
          created_at?: string
          enforced_by?: string | null
          id?: string
          nida_number?: string | null
          notes?: string | null
          owner_id?: string
          required_after?: string
          tin_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_contracts: {
        Row: {
          admin_notes: string | null
          agreed_terms: boolean
          contract_version: string
          created_at: string
          expires_at: string | null
          full_legal_name: string | null
          id: string
          last_reminder_at: string | null
          owner_id: string
          required_by: string | null
          review_later_until: string | null
          signature_data: string | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agreed_terms?: boolean
          contract_version?: string
          created_at?: string
          expires_at?: string | null
          full_legal_name?: string | null
          id?: string
          last_reminder_at?: string | null
          owner_id: string
          required_by?: string | null
          review_later_until?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agreed_terms?: boolean
          contract_version?: string
          created_at?: string
          expires_at?: string | null
          full_legal_name?: string | null
          id?: string
          last_reminder_at?: string | null
          owner_id?: string
          required_by?: string | null
          review_later_until?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
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
      business_members: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["business_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["business_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["business_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_license: string | null
          created_at: string
          created_by: string | null
          district: string | null
          email: string | null
          founded_at: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          nida_number: string | null
          phone: string | null
          region: string | null
          street: string | null
          tin_number: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          business_license?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          email?: string | null
          founded_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          nida_number?: string | null
          phone?: string | null
          region?: string | null
          street?: string | null
          tin_number?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          business_license?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          email?: string | null
          founded_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          nida_number?: string | null
          phone?: string | null
          region?: string | null
          street?: string | null
          tin_number?: string | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          recipient_id: string | null
          sender_id: string
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          recipient_id?: string | null
          sender_id: string
          sender_name?: string | null
          sender_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_id?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: []
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          owner_id: string
          starts_at: string | null
          updated_at: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          owner_id: string
          starts_at?: string | null
          updated_at?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          owner_id?: string
          starts_at?: string | null
          updated_at?: string | null
          used_count?: number | null
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
          branch_id: string | null
          business_id: string | null
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
          branch_id?: string | null
          business_id?: string | null
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
          branch_id?: string | null
          business_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          owner_id: string
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          owner_id: string
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          owner_id?: string
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      income_records: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          income_date: string
          owner_id: string
          payment_method: string | null
          reference_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          owner_id: string
          payment_method?: string | null
          reference_id?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          owner_id?: string
          payment_method?: string | null
          reference_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          owner_id: string
          product_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          owner_id: string
          product_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          owner_id?: string
          product_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          id: string
          owner_id: string
          reference_id: string | null
          reference_type: string | null
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          entry_date?: string
          id?: string
          owner_id: string
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          owner_id?: string
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_name: string
          account_type: string
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_name: string
          account_type: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
      login_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          id: string
          last_attempt_at: string
          locked_by: string | null
          locked_until: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          id?: string
          last_attempt_at?: string
          locked_by?: string | null
          locked_until?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          id?: string
          last_attempt_at?: string
          locked_by?: string | null
          locked_until?: string | null
        }
        Relationships: []
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
      nurath_logs: {
        Row: {
          api_latency_ms: number | null
          command: string | null
          confidence: number | null
          created_at: string
          id: string
          kind: string
          lang: string | null
          note: string | null
          response: string | null
          source: string
          stage: string | null
          transcript: string | null
          user_id: string
          utterance_id: string | null
          wake_triggered: boolean | null
        }
        Insert: {
          api_latency_ms?: number | null
          command?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          kind: string
          lang?: string | null
          note?: string | null
          response?: string | null
          source: string
          stage?: string | null
          transcript?: string | null
          user_id: string
          utterance_id?: string | null
          wake_triggered?: boolean | null
        }
        Update: {
          api_latency_ms?: number | null
          command?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          kind?: string
          lang?: string | null
          note?: string | null
          response?: string | null
          source?: string
          stage?: string | null
          transcript?: string | null
          user_id?: string
          utterance_id?: string | null
          wake_triggered?: boolean | null
        }
        Relationships: []
      }
      owner_payment_numbers: {
        Row: {
          account_name: string | null
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          is_default: boolean
          lipa_namba: string
          network: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_default?: boolean
          lipa_namba: string
          network: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_default?: boolean
          lipa_namba?: string
          network?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string | null
          payment_method: string | null
          phone_number: string | null
          provider: string | null
          provider_reference: string | null
          status: string
          subscription_id: string | null
          transaction_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          phone_number?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          phone_number?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sokoni_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          branch_id: string | null
          business_id: string | null
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_archived: boolean | null
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
          branch_id?: string | null
          business_id?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
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
          branch_id?: string | null
          business_id?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
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
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          country: string | null
          created_at: string
          district: string | null
          email: string | null
          email_consent: Json
          email_notifications_enabled: boolean
          facebook_pixel_id: string | null
          full_name: string | null
          google_pixel_id: string | null
          id: string
          location_set: boolean | null
          phone: string | null
          region: string | null
          store_description: string | null
          store_logo_url: string | null
          store_slug: string | null
          street: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          business_name?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          email_consent?: Json
          email_notifications_enabled?: boolean
          facebook_pixel_id?: string | null
          full_name?: string | null
          google_pixel_id?: string | null
          id: string
          location_set?: boolean | null
          phone?: string | null
          region?: string | null
          store_description?: string | null
          store_logo_url?: string | null
          store_slug?: string | null
          street?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          business_name?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          email_consent?: Json
          email_notifications_enabled?: boolean
          facebook_pixel_id?: string | null
          full_name?: string | null
          google_pixel_id?: string | null
          id?: string
          location_set?: boolean | null
          phone?: string | null
          region?: string | null
          store_description?: string | null
          store_logo_url?: string | null
          store_slug?: string | null
          street?: string | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          amount_paid: number | null
          balance: number | null
          created_at: string
          expected_delivery: string | null
          id: string
          items: Json
          notes: string | null
          order_date: string
          owner_id: string
          payment_method: string | null
          status: string
          supplier_id: string | null
          supplier_name: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string
          owner_id: string
          payment_method?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance?: number | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string
          owner_id?: string
          payment_method?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_bug_reports: {
        Row: {
          console_excerpt: string | null
          created_at: string
          description: string | null
          id: string
          page_path: string
          reporter_id: string | null
          screenshot_urls: string[] | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_agent: string | null
          viewport: string | null
        }
        Insert: {
          console_excerpt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          page_path: string
          reporter_id?: string | null
          screenshot_urls?: string[] | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_agent?: string | null
          viewport?: string | null
        }
        Update: {
          console_excerpt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          page_path?: string
          reporter_id?: string | null
          screenshot_urls?: string[] | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_agent?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          created_at: string | null
          customer_phone: string
          id: string
          items: Json | null
          order_id: string | null
          reason: string
          refund_amount: number | null
          refund_method: string | null
          seller_id: string
          seller_notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_phone: string
          id?: string
          items?: Json | null
          order_id?: string | null
          reason: string
          refund_amount?: number | null
          refund_method?: string | null
          seller_id: string
          seller_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_phone?: string
          id?: string
          items?: Json | null
          order_id?: string | null
          reason?: string
          refund_amount?: number | null
          refund_method?: string | null
          seller_id?: string
          seller_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sokoni_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          created_at: string
          id: string
          reply_text: string
          review_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_text: string
          review_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_text?: string
          review_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "public_product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          business_id: string | null
          created_at: string
          created_by: string | null
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
          branch_id?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string | null
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
          branch_id?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
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
          product_id: string | null
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
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
            foreignKeyName: "sales_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
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
          {
            foreignKeyName: "sales_predictions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_whatsapp_messages: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string
          error_message: string | null
          id: string
          message: string
          message_type: string
          owner_id: string
          phone_number: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name: string
          error_message?: string | null
          id?: string
          message: string
          message_type?: string
          owner_id: string
          phone_number: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          error_message?: string | null
          id?: string
          message?: string
          message_type?: string
          owner_id?: string
          phone_number?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sokoni_customers: {
        Row: {
          country: string | null
          created_at: string
          district: string | null
          email_marketing_consent: boolean
          email_transactional_consent: boolean
          id: string
          name: string | null
          phone: string
          pin_hash: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          district?: string | null
          email_marketing_consent?: boolean
          email_transactional_consent?: boolean
          id?: string
          name?: string | null
          phone: string
          pin_hash?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          district?: string | null
          email_marketing_consent?: boolean
          email_transactional_consent?: boolean
          id?: string
          name?: string | null
          phone?: string
          pin_hash?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sokoni_orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_paid_at: string | null
          customer_phone: string
          customer_received: boolean | null
          customer_received_at: string | null
          delivery_address: string
          delivery_person_name: string | null
          delivery_person_phone: string | null
          email_consent: boolean
          id: string
          items: Json
          linked_sale_id: string | null
          order_status: string
          payment_method: string | null
          payment_status: string
          seller_id: string
          total_amount: number
          tracking_code: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_paid_at?: string | null
          customer_phone: string
          customer_received?: boolean | null
          customer_received_at?: string | null
          delivery_address: string
          delivery_person_name?: string | null
          delivery_person_phone?: string | null
          email_consent?: boolean
          id?: string
          items: Json
          linked_sale_id?: string | null
          order_status?: string
          payment_method?: string | null
          payment_status?: string
          seller_id: string
          total_amount: number
          tracking_code?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_paid_at?: string | null
          customer_phone?: string
          customer_received?: boolean | null
          customer_received_at?: string | null
          delivery_address?: string
          delivery_person_name?: string | null
          delivery_person_phone?: string | null
          email_consent?: boolean
          id?: string
          items?: Json
          linked_sale_id?: string | null
          order_status?: string
          payment_method?: string | null
          payment_status?: string
          seller_id?: string
          total_amount?: number
          tracking_code?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sokoni_orders_linked_sale_id_fkey"
            columns: ["linked_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sokoni_pin_attempts: {
        Row: {
          attempt_count: number
          first_attempt_at: string
          last_attempt_at: string
          locked_until: string | null
          phone: string
        }
        Insert: {
          attempt_count?: number
          first_attempt_at?: string
          last_attempt_at?: string
          locked_until?: string | null
          phone: string
        }
        Update: {
          attempt_count?: number
          first_attempt_at?: string
          last_attempt_at?: string
          locked_until?: string | null
          phone?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          outstanding_balance: number | null
          owner_id: string
          phone: string | null
          tin_number: string | null
          total_purchases: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          outstanding_balance?: number | null
          owner_id: string
          phone?: string | null
          tin_number?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          outstanding_balance?: number | null
          owner_id?: string
          phone?: string | null
          tin_number?: string | null
          total_purchases?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          admin_fee_notes: string | null
          approved_at: string | null
          approved_by: string | null
          assistant_count: number
          assistant_fee: number
          base_fee: number
          branch_count: number
          branch_fee: number
          calculated_fee: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          custom_fee: number | null
          fee_breakdown: Json | null
          has_sokoni: boolean
          id: string
          notes: string | null
          payment_amount: number | null
          payment_reference: string | null
          sokoni_fee: number
          status: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_fee_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assistant_count?: number
          assistant_fee?: number
          base_fee?: number
          branch_count?: number
          branch_fee?: number
          calculated_fee?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          custom_fee?: number | null
          fee_breakdown?: Json | null
          has_sokoni?: boolean
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          sokoni_fee?: number
          status?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_fee_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assistant_count?: number
          assistant_fee?: number
          base_fee?: number
          branch_count?: number
          branch_fee?: number
          calculated_fee?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          custom_fee?: number | null
          fee_breakdown?: Json | null
          has_sokoni?: boolean
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          sokoni_fee?: number
          status?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      whatsapp_messages: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          message: string
          message_type: string
          owner_id: string
          phone_number: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          message: string
          message_type?: string
          owner_id: string
          phone_number: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          message?: string
          message_type?: string
          owner_id?: string
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_marketplace_products: {
        Row: {
          branch_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          owner_id: string | null
          price: number | null
          stock_quantity: number | null
        }
        Insert: {
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          owner_id?: string | null
          price?: number | null
          stock_quantity?: number | null
        }
        Update: {
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          owner_id?: string | null
          price?: number | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      public_product_reviews: {
        Row: {
          created_at: string | null
          customer_name: string | null
          id: string | null
          is_verified_purchase: boolean | null
          product_id: string | null
          rating: number | null
          review_text: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          id?: string | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number | null
          review_text?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          id?: string | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number | null
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_storefronts: {
        Row: {
          business_name: string | null
          district: string | null
          facebook_pixel_id: string | null
          google_pixel_id: string | null
          id: string | null
          phone: string | null
          region: string | null
          store_description: string | null
          store_logo_url: string | null
          store_slug: string | null
        }
        Insert: {
          business_name?: string | null
          district?: string | null
          facebook_pixel_id?: string | null
          google_pixel_id?: string | null
          id?: string | null
          phone?: string | null
          region?: string | null
          store_description?: string | null
          store_logo_url?: string | null
          store_slug?: string | null
        }
        Update: {
          business_name?: string | null
          district?: string | null
          facebook_pixel_id?: string | null
          google_pixel_id?: string | null
          id?: string | null
          phone?: string | null
          region?: string | null
          store_description?: string | null
          store_logo_url?: string | null
          store_slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_assistant_permission: {
        Args: {
          p_assistant_id: string
          p_business_name?: string
          p_owner_id: string
        }
        Returns: Json
      }
      add_assistant_permission_by_email: {
        Args: {
          p_assistant_email: string
          p_business_name?: string
          p_owner_id: string
        }
        Returns: Json
      }
      admin_delete_business: {
        Args: {
          p_confirmation_name: string
          p_owner_id: string
          p_scope?: Json
        }
        Returns: Json
      }
      approve_user_subscription: {
        Args: {
          p_admin_id: string
          p_months?: number
          p_subscription_id: string
        }
        Returns: Json
      }
      can_access_branch: { Args: { p_branch_id: string }; Returns: boolean }
      can_access_business_data: {
        Args: { _business_id: string }
        Returns: boolean
      }
      can_access_owner_data: {
        Args: { target_owner_id: string }
        Returns: boolean
      }
      check_user_subscription: { Args: { p_user_id: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_tracking_code: { Args: never; Returns: string }
      get_primary_business_id: { Args: { _user_id?: string }; Returns: string }
      get_user_business_ids: { Args: { _user_id?: string }; Returns: string[] }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_business_role: {
        Args: {
          _business_id: string
          _role: Database["public"]["Enums"]["business_role"]
          _user_id?: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: { _business_id: string; _user_id?: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_owner_email: {
        Args: {
          _data: Json
          _idempotency: string
          _owner_id: string
          _template: string
        }
        Returns: undefined
      }
      process_sokoni_order_to_sale: {
        Args: { order_id: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      sokoni_register_customer: {
        Args: { p_name?: string; p_phone: string; p_pin: string }
        Returns: Json
      }
      sokoni_update_customer_name: {
        Args: { p_name: string; p_phone: string; p_pin: string }
        Returns: Json
      }
      sokoni_verify_pin: {
        Args: { p_phone: string; p_pin: string }
        Returns: Json
      }
      track_sokoni_order: {
        Args: { p_phone: string; p_tracking_code: string }
        Returns: {
          created_at: string
          id: string
          items: Json
          order_status: string
          payment_status: string
          total_amount: number
          tracking_code: string
          updated_at: string
        }[]
      }
      validate_coupon: {
        Args: { p_code: string; p_seller_ids: string[]; p_subtotal: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "owner" | "assistant" | "super_admin"
      business_role:
        | "owner"
        | "co_owner"
        | "branch_manager"
        | "cashier"
        | "salesperson"
        | "inventory_officer"
        | "accountant"
        | "assistant"
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
    Enums: {
      app_role: ["owner", "assistant", "super_admin"],
      business_role: [
        "owner",
        "co_owner",
        "branch_manager",
        "cashier",
        "salesperson",
        "inventory_officer",
        "accountant",
        "assistant",
      ],
    },
  },
} as const
