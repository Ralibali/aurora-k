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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assignment_logs: {
        Row: {
          action: string
          assignment_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          assignment_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          assignment_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_logs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          actual_start: string | null
          actual_stop: string | null
          address: string
          admin_comment: string | null
          assigned_driver_id: string
          consignment_photo_url: string | null
          created_at: string
          customer_id: string
          driver_comment: string | null
          id: string
          instructions: string | null
          invoiced: boolean
          priority: string
          scheduled_end: string | null
          scheduled_start: string
          signature_url: string | null
          status: string
          title: string
        }
        Insert: {
          actual_start?: string | null
          actual_stop?: string | null
          address: string
          admin_comment?: string | null
          assigned_driver_id: string
          consignment_photo_url?: string | null
          created_at?: string
          customer_id: string
          driver_comment?: string | null
          id?: string
          instructions?: string | null
          invoiced?: boolean
          priority?: string
          scheduled_end?: string | null
          scheduled_start: string
          signature_url?: string | null
          status?: string
          title: string
        }
        Update: {
          actual_start?: string | null
          actual_stop?: string | null
          address?: string
          admin_comment?: string | null
          assigned_driver_id?: string
          consignment_photo_url?: string | null
          created_at?: string
          customer_id?: string
          driver_comment?: string | null
          id?: string
          instructions?: string | null
          invoiced?: boolean
          priority?: string
          scheduled_end?: string | null
          scheduled_start?: string
          signature_url?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          invoice_address: string | null
          name: string
          notes: string | null
          org_number: string | null
          payment_terms_days: number
          phone: string | null
          price_per_delivery: number | null
          price_per_hour: number | null
          pricing_type: string
          visit_address: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_address?: string | null
          name: string
          notes?: string | null
          org_number?: string | null
          payment_terms_days?: number
          phone?: string | null
          price_per_delivery?: number | null
          price_per_hour?: number | null
          pricing_type?: string
          visit_address?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_address?: string | null
          name?: string
          notes?: string | null
          org_number?: string | null
          payment_terms_days?: number
          phone?: string | null
          price_per_delivery?: number | null
          price_per_hour?: number | null
          pricing_type?: string
          visit_address?: string | null
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          assignment_id: string | null
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settings: {
        Row: {
          id: string
          require_photo: boolean
          require_signature: boolean
          show_availability_toggle: boolean
          show_time_report: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          require_photo?: boolean
          require_signature?: boolean
          show_availability_toggle?: boolean
          show_time_report?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          require_photo?: boolean
          require_signature?: boolean
          show_availability_toggle?: boolean
          show_time_report?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      driver_settings_overrides: {
        Row: {
          driver_id: string
          id: string
          require_photo: boolean | null
          require_signature: boolean | null
          show_availability_toggle: boolean | null
          show_time_report: boolean | null
          updated_at: string
        }
        Insert: {
          driver_id: string
          id?: string
          require_photo?: boolean | null
          require_signature?: boolean | null
          show_availability_toggle?: boolean | null
          show_time_report?: boolean | null
          updated_at?: string
        }
        Update: {
          driver_id?: string
          id?: string
          require_photo?: boolean | null
          require_signature?: boolean | null
          show_availability_toggle?: boolean | null
          show_time_report?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          assignment_ids: string[]
          created_at: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: number
          message: string | null
          reference: string | null
          status: string
          total_ex_vat: number
          total_inc_vat: number
          vat_amount: number
        }
        Insert: {
          assignment_ids?: string[]
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: number
          message?: string | null
          reference?: string | null
          status?: string
          total_ex_vat?: number
          total_inc_vat?: number
          vat_amount?: number
        }
        Update: {
          assignment_ids?: string[]
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: number
          message?: string | null
          reference?: string | null
          status?: string
          total_ex_vat?: number
          total_inc_vat?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_available: boolean
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_available?: boolean
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_available?: boolean
          role?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          bankgiro: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          org_number: string | null
          phone: string | null
          plusgiro: string | null
          updated_at: string
          vat_number: string | null
          zip_city: string | null
        }
        Insert: {
          address?: string | null
          bankgiro?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          org_number?: string | null
          phone?: string | null
          plusgiro?: string | null
          updated_at?: string
          vat_number?: string | null
          zip_city?: string | null
        }
        Update: {
          address?: string | null
          bankgiro?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          org_number?: string | null
          phone?: string | null
          plusgiro?: string | null
          updated_at?: string
          vat_number?: string | null
          zip_city?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      driver_update_assignment: {
        Args: {
          _actual_start?: string
          _actual_stop?: string
          _consignment_photo_url?: string
          _driver_comment?: string
          _id: string
          _signature_url?: string
          _status?: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "driver"
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
      app_role: ["admin", "driver"],
    },
  },
} as const
