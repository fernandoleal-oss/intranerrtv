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
      attachments: {
        Row: {
          budget_id: string
          created_at: string
          file_size: number | null
          file_url: string
          filename: string
          id: string
          mime_type: string | null
          version_id: string | null
        }
        Insert: {
          budget_id: string
          created_at?: string
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          mime_type?: string | null
          version_id?: string | null
        }
        Update: {
          budget_id?: string
          created_at?: string
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          mime_type?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_history: {
        Row: {
          action: string
          budget_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          budget_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          budget_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_history_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_number: string | null
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          display_id: string | null
          id: string
          product_id: string | null
          status: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string | null
        }
        Insert: {
          budget_number?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          display_id?: string | null
          id?: string
          product_id?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
        }
        Update: {
          budget_number?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          display_id?: string | null
          id?: string
          product_id?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          product_id: string
          responsible_user_id: string
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          product_id: string
          responsible_user_id: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          product_id?: string
          responsible_user_id?: string
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_honorarios: {
        Row: {
          client_name: string
          created_at: string | null
          honorario_percent: number
          id: string
          updated_at: string | null
        }
        Insert: {
          client_name: string
          created_at?: string | null
          honorario_percent?: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string | null
          honorario_percent?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          honorario_percentage: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          honorario_percentage?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          honorario_percentage?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_events: {
        Row: {
          ap: string | null
          cliente: string
          created_at: string
          descricao: string | null
          fornecedor: string | null
          honorario_agencia_cents: number
          honorario_percent: number | null
          id: string
          imported_at: string
          raw: Json | null
          ref_month: string
          total_cents: number
          updated_at: string
          valor_fornecedor_cents: number
        }
        Insert: {
          ap?: string | null
          cliente: string
          created_at?: string
          descricao?: string | null
          fornecedor?: string | null
          honorario_agencia_cents?: number
          honorario_percent?: number | null
          id?: string
          imported_at?: string
          raw?: Json | null
          ref_month: string
          total_cents?: number
          updated_at?: string
          valor_fornecedor_cents?: number
        }
        Update: {
          ap?: string | null
          cliente?: string
          created_at?: string
          descricao?: string | null
          fornecedor?: string | null
          honorario_agencia_cents?: number
          honorario_percent?: number | null
          id?: string
          imported_at?: string
          raw?: Json | null
          ref_month?: string
          total_cents?: number
          updated_at?: string
          valor_fornecedor_cents?: number
        }
        Relationships: []
      }
      finance_holidays: {
        Row: {
          created_at: string
          description: string | null
          holiday_date: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          holiday_date: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          holiday_date?: string
          id?: string
        }
        Relationships: []
      }
      finance_import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          ref_month: string
          rows_imported: number | null
          rows_skipped: number | null
          sheet_name: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ref_month: string
          rows_imported?: number | null
          rows_skipped?: number | null
          sheet_name?: string | null
          started_at: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ref_month?: string
          rows_imported?: number | null
          rows_skipped?: number | null
          sheet_name?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      finance_reports_annual: {
        Row: {
          by_client: Json
          by_supplier: Json
          created_at: string
          html_url: string | null
          id: string
          json_url: string | null
          kpis: Json
          pdf_url: string | null
          trends: Json
          updated_at: string
          year: number
        }
        Insert: {
          by_client?: Json
          by_supplier?: Json
          created_at?: string
          html_url?: string | null
          id?: string
          json_url?: string | null
          kpis?: Json
          pdf_url?: string | null
          trends?: Json
          updated_at?: string
          year: number
        }
        Update: {
          by_client?: Json
          by_supplier?: Json
          created_at?: string
          html_url?: string | null
          id?: string
          json_url?: string | null
          kpis?: Json
          pdf_url?: string | null
          trends?: Json
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      finance_reports_monthly: {
        Row: {
          by_client: Json
          by_supplier: Json
          created_at: string
          html_url: string | null
          id: string
          json_url: string | null
          kpis: Json
          pdf_url: string | null
          ref_month: string
          trends: Json
          updated_at: string
        }
        Insert: {
          by_client?: Json
          by_supplier?: Json
          created_at?: string
          html_url?: string | null
          id?: string
          json_url?: string | null
          kpis?: Json
          pdf_url?: string | null
          ref_month: string
          trends?: Json
          updated_at?: string
        }
        Update: {
          by_client?: Json
          by_supplier?: Json
          created_at?: string
          html_url?: string | null
          id?: string
          json_url?: string | null
          kpis?: Json
          pdf_url?: string | null
          ref_month?: string
          trends?: Json
          updated_at?: string
        }
        Relationships: []
      }
      finance_supplier_balances: {
        Row: {
          created_at: string | null
          fornecedor: string
          id: string
          last_updated: string | null
          notes: string | null
          saldo_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fornecedor: string
          id?: string
          last_updated?: string | null
          notes?: string | null
          saldo_cents?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fornecedor?: string
          id?: string
          last_updated?: string | null
          notes?: string | null
          saldo_cents?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          rows_synced: number | null
          sheet_url: string | null
          sheets_synced: Json | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          rows_synced?: number | null
          sheet_url?: string | null
          sheets_synced?: Json | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          rows_synced?: number | null
          sheet_url?: string | null
          sheets_synced?: Json | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rights: {
        Row: {
          client: string
          contract_signed_cast: string | null
          contract_signed_production: string | null
          created_at: string
          expire_date: string | null
          first_air: string | null
          id: string
          idempotent_key: string | null
          link_drive: string | null
          link_film: string | null
          notified_15d: boolean
          notified_30d: boolean
          notified_expired: boolean
          product: string
          renewal_contract_url: string | null
          renewal_signed_at: string | null
          renewal_validity_months: number | null
          renewed: boolean
          status_label: string | null
          title: string
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          client: string
          contract_signed_cast?: string | null
          contract_signed_production?: string | null
          created_at?: string
          expire_date?: string | null
          first_air?: string | null
          id?: string
          idempotent_key?: string | null
          link_drive?: string | null
          link_film?: string | null
          notified_15d?: boolean
          notified_30d?: boolean
          notified_expired?: boolean
          product: string
          renewal_contract_url?: string | null
          renewal_signed_at?: string | null
          renewal_validity_months?: number | null
          renewed?: boolean
          status_label?: string | null
          title: string
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          client?: string
          contract_signed_cast?: string | null
          contract_signed_production?: string | null
          created_at?: string
          expire_date?: string | null
          first_air?: string | null
          id?: string
          idempotent_key?: string | null
          link_drive?: string | null
          link_film?: string | null
          notified_15d?: boolean
          notified_30d?: boolean
          notified_expired?: boolean
          product?: string
          renewal_contract_url?: string | null
          renewal_signed_at?: string | null
          renewal_validity_months?: number | null
          renewed?: boolean
          status_label?: string | null
          title?: string
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      rights_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: number
          right_id: string
          snapshot: Json
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: number
          right_id: string
          snapshot: Json
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: number
          right_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rights_history_right_id_fkey"
            columns: ["right_id"]
            isOneToOne: false
            referencedRelation: "rights"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_jobs: {
        Row: {
          budget_id: string | null
          created_at: string | null
          id: string
          job_type: string | null
          supplier_id: string | null
          value_cents: number | null
        }
        Insert: {
          budget_id?: string | null
          created_at?: string | null
          id?: string
          job_type?: string | null
          supplier_id?: string | null
          value_cents?: number | null
        }
        Update: {
          budget_id?: string | null
          created_at?: string | null
          id?: string
          job_type?: string | null
          supplier_id?: string | null
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_jobs_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_jobs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string | null
          files: Json
          id: string
          link: string | null
          note: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          files: Json
          id?: string
          link?: string | null
          note?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          files?: Json
          id?: string
          link?: string | null
          note?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      versions: {
        Row: {
          budget_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          honorario_total: number | null
          id: string
          motivo_nova_versao: string | null
          payload: Json | null
          total_geral: number | null
          updated_at: string | null
          versao: number
        }
        Insert: {
          budget_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          honorario_total?: number | null
          id?: string
          motivo_nova_versao?: string | null
          payload?: Json | null
          total_geral?: number | null
          updated_at?: string | null
          versao?: number
        }
        Update: {
          budget_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          honorario_total?: number | null
          id?: string
          motivo_nova_versao?: string | null
          payload?: Json | null
          total_geral?: number | null
          updated_at?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_budget_previews: { Args: never; Returns: undefined }
      create_budget_full_rpc: {
        Args: { p_payload: Json; p_total: number; p_type_text: string }
        Returns: {
          display_id: string
          id: string
          version_id: string
        }[]
      }
      create_budget_with_version:
        | { Args: { p_tipo: string }; Returns: Json }
        | {
            Args: {
              p_campaign_id: string
              p_type: Database["public"]["Enums"]["budget_type"]
            }
            Returns: Json
          }
      generate_budget_number: { Args: never; Returns: string }
      generate_display_id: { Args: never; Returns: string }
      get_budget_view_rpc: {
        Args: { p_budget_id: string }
        Returns: {
          budget_id: string
          created_at: string
          display_id: string
          payload: Json
          status: string
          total_geral: number
          type: string
          versao: number
          version_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_finance_editor: { Args: never; Returns: boolean }
    }
    Enums: {
      budget_status: "rascunho" | "enviado_atendimento" | "aprovado"
      budget_type: "filme" | "audio" | "cc" | "imagem" | "livre"
      user_role: "admin" | "rtv" | "financeiro"
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
      budget_status: ["rascunho", "enviado_atendimento", "aprovado"],
      budget_type: ["filme", "audio", "cc", "imagem", "livre"],
      user_role: ["admin", "rtv", "financeiro"],
    },
  },
} as const
