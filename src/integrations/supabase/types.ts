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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          org_id: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          org_id?: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          org_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      periods: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string | null
          org_id: string
          start_date: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string | null
          org_id?: string
          start_date: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string | null
          org_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          price: number
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          org_id?: string
          price: number
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_entries: {
        Row: {
          created_at: string
          id: string
          org_id: string
          product_id: string
          quantity: number
          total: number | null
          unit_price: number
          work_date: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string
          product_id: string
          quantity: number
          total?: number | null
          unit_price: number
          work_date?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          product_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
          work_date?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_sessions: {
        Row: {
          created_at: string
          expires_at: string
          token: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          token?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
          worker_id?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          pin_hash: string
          worker_code: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id?: string
          pin_hash: string
          worker_code: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          pin_hash?: string
          worker_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      workers_safe: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string | null
          name: string | null
          worker_code: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          worker_code?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          worker_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_entry: {
        Args: {
          _entry_id: string
          _product_id: string
          _quantity: number
          _work_date: string
        }
        Returns: undefined
      }
      admin_upsert_worker: {
        Args: {
          _active: boolean
          _code: string
          _id: string
          _name: string
          _pin: string
        }
        Returns: string
      }
      claim_first_admin: { Args: never; Returns: undefined }
      close_current_period: {
        Args: { _end_date?: string; _next_start?: string }
        Returns: string
      }
      current_org_id: { Args: never; Returns: string }
      delete_my_entry: {
        Args: { _entry_id: string; _token: string }
        Returns: undefined
      }
      get_current_period: {
        Args: never
        Returns: {
          id: string
          start_date: string
        }[]
      }
      get_my_entries: {
        Args: { _period_id?: string; _token: string }
        Returns: {
          category_name: string
          created_at: string
          id: string
          product_name: string
          quantity: number
          total: number
          unit_price: number
          work_date: string
        }[]
      }
      get_my_periods: {
        Args: { _token: string }
        Returns: {
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
        }[]
      }
      get_worker_period: {
        Args: { _token: string }
        Returns: {
          end_date: string
          id: string
          name: string
          start_date: string
        }[]
      }
      get_worker_products: {
        Args: { _token: string }
        Returns: {
          category_id: string
          category_name: string
          id: string
          name: string
          price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      period_auto_name: { Args: { _d: string }; Returns: string }
      set_admin_pin: {
        Args: { _new_pin: string; _old_pin: string }
        Returns: undefined
      }
      submit_work_entry: {
        Args: {
          _product_id: string
          _quantity: number
          _token: string
          _work_date: string
        }
        Returns: string
      }
      update_my_entry: {
        Args: {
          _entry_id: string
          _product_id: string
          _quantity: number
          _token: string
          _work_date: string
        }
        Returns: undefined
      }
      verify_admin_pin: { Args: { _pin: string }; Returns: boolean }
      worker_login: {
        Args: { _code: string; _pin: string }
        Returns: {
          expires_at: string
          id: string
          name: string
          session_token: string
          worker_code: string
        }[]
      }
      worker_logout: { Args: { _token: string }; Returns: undefined }
      worker_org_id: { Args: { _wid: string }; Returns: string }
      worker_session_check: { Args: { _token: string }; Returns: string }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
