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
      articles: {
        Row: {
          active: boolean
          article_number: string | null
          company_id: string | null
          created_at: string
          default_price: number
          description: string | null
          id: string
          name: string
          unit: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          active?: boolean
          article_number?: string | null
          company_id?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name: string
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          active?: boolean
          article_number?: string | null
          company_id?: string | null
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name?: string
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assignment_id: string
          comment: string | null
          company_id: string | null
          created_at: string
          id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assignment_id: string
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assignment_id?: string
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_approvals_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_articles: {
        Row: {
          article_id: string | null
          assignment_id: string
          company_id: string | null
          created_at: string
          id: string
          name: string
          quantity: number
          unit: string
          unit_price: number
          vat_rate: number
        }
        Insert: {
          article_id?: string | null
          assignment_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          quantity?: number
          unit?: string
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          article_id?: string | null
          assignment_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          unit?: string
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignment_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_articles_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_logs: {
        Row: {
          action: string
          assignment_id: string
          company_id: string | null
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          assignment_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          assignment_id?: string
          company_id?: string | null
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
          {
            foreignKeyName: "assignment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_protocols: {
        Row: {
          assignment_id: string
          company_id: string | null
          content: string | null
          created_at: string
          created_by: string
          id: string
          protocol_type: string
          signature_url: string | null
          title: string
        }
        Insert: {
          assignment_id: string
          company_id?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          protocol_type?: string
          signature_url?: string | null
          title: string
        }
        Update: {
          assignment_id?: string
          company_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          protocol_type?: string
          signature_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_protocols_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_protocols_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          co2_kg: number | null
          company_id: string | null
          consignment_photo_url: string | null
          cost: number | null
          created_at: string
          customer_id: string
          distance_km: number | null
          driver_comment: string | null
          fuel_liters: number | null
          geofence_lat: number | null
          geofence_lng: number | null
          geofence_radius: number | null
          id: string
          instructions: string | null
          invoiced: boolean
          order_id: string | null
          priority: string
          require_photo: boolean
          require_signature: boolean
          scheduled_end: string | null
          scheduled_start: string
          signature_url: string | null
          status: string
          title: string
          vehicle_id: string | null
        }
        Insert: {
          actual_start?: string | null
          actual_stop?: string | null
          address: string
          admin_comment?: string | null
          assigned_driver_id: string
          co2_kg?: number | null
          company_id?: string | null
          consignment_photo_url?: string | null
          cost?: number | null
          created_at?: string
          customer_id: string
          distance_km?: number | null
          driver_comment?: string | null
          fuel_liters?: number | null
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_radius?: number | null
          id?: string
          instructions?: string | null
          invoiced?: boolean
          order_id?: string | null
          priority?: string
          require_photo?: boolean
          require_signature?: boolean
          scheduled_end?: string | null
          scheduled_start: string
          signature_url?: string | null
          status?: string
          title: string
          vehicle_id?: string | null
        }
        Update: {
          actual_start?: string | null
          actual_stop?: string | null
          address?: string
          admin_comment?: string | null
          assigned_driver_id?: string
          co2_kg?: number | null
          company_id?: string | null
          consignment_photo_url?: string | null
          cost?: number | null
          created_at?: string
          customer_id?: string
          distance_km?: number | null
          driver_comment?: string | null
          fuel_liters?: number | null
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_radius?: number | null
          id?: string
          instructions?: string | null
          invoiced?: boolean
          order_id?: string | null
          priority?: string
          require_photo?: boolean
          require_signature?: boolean
          scheduled_end?: string | null
          scheduled_start?: string
          signature_url?: string | null
          status?: string
          title?: string
          vehicle_id?: string | null
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
            foreignKeyName: "assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          admin_note: string | null
          company_id: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          id: string
          preferred_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          preferred_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          preferred_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          onboarding_completed: boolean | null
          org_nr: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          onboarding_completed?: boolean | null
          org_nr?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          org_nr?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      customer_access_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          token: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_access_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_price_lists: {
        Row: {
          article_id: string
          company_id: string | null
          created_at: string
          customer_id: string
          id: string
          price: number
        }
        Insert: {
          article_id: string
          company_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          price: number
        }
        Update: {
          article_id?: string
          company_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_price_lists_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_satisfaction: {
        Row: {
          assignment_id: string | null
          comment: string | null
          company_id: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number
        }
        Insert: {
          assignment_id?: string | null
          comment?: string | null
          company_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating: number
        }
        Update: {
          assignment_id?: string | null
          comment?: string | null
          company_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_satisfaction_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_satisfaction_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_satisfaction_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_absences: {
        Row: {
          approved: boolean
          company_id: string | null
          created_at: string
          driver_id: string
          end_date: string
          id: string
          note: string | null
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          company_id?: string | null
          created_at?: string
          driver_id: string
          end_date: string
          id?: string
          note?: string | null
          start_date: string
          type?: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          company_id?: string | null
          created_at?: string
          driver_id?: string
          end_date?: string
          id?: string
          note?: string | null
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_absences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_absences_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_compensation: {
        Row: {
          company_id: string | null
          compensation_type: Database["public"]["Enums"]["compensation_type"]
          created_at: string
          driver_id: string
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          notes: string | null
          per_assignment_rate: number | null
          tax_table: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          compensation_type?: Database["public"]["Enums"]["compensation_type"]
          created_at?: string
          driver_id: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          notes?: string | null
          per_assignment_rate?: number | null
          tax_table?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          compensation_type?: Database["public"]["Enums"]["compensation_type"]
          created_at?: string
          driver_id?: string
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          notes?: string | null
          per_assignment_rate?: number | null
          tax_table?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_compensation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          assignment_id: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          {
            foreignKeyName: "driver_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settings: {
        Row: {
          company_id: string | null
          id: string
          require_photo: boolean
          require_signature: boolean
          show_availability_toggle: boolean
          show_time_report: boolean
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          require_photo?: boolean
          require_signature?: boolean
          show_availability_toggle?: boolean
          show_time_report?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          id?: string
          require_photo?: boolean
          require_signature?: boolean
          show_availability_toggle?: boolean
          show_time_report?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settings_overrides: {
        Row: {
          company_id: string | null
          driver_id: string
          id: string
          require_photo: boolean | null
          require_signature: boolean | null
          show_availability_toggle: boolean | null
          show_time_report: boolean | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          driver_id: string
          id?: string
          require_photo?: boolean | null
          require_signature?: boolean | null
          show_availability_toggle?: boolean | null
          show_time_report?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          driver_id?: string
          id?: string
          require_photo?: boolean | null
          require_signature?: boolean | null
          show_availability_toggle?: boolean | null
          show_time_report?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settings_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_resources: {
        Row: {
          active: boolean
          company: string | null
          company_id: string | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_resources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_settings: {
        Row: {
          category: string
          company_id: string | null
          description: string | null
          enabled: boolean
          feature_key: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          company_id?: string | null
          description?: string | null
          enabled?: boolean
          feature_key: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string | null
          description?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          id: string
          name: string | null
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          company_id: string | null
          created_at: string
          footer_html: string | null
          header_html: string | null
          id: string
          is_default: boolean
          name: string
          primary_color: string
          show_bank_details: boolean
          show_logo: boolean
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_default?: boolean
          name: string
          primary_color?: string
          show_bank_details?: boolean
          show_logo?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_default?: boolean
          name?: string
          primary_color?: string
          show_bank_details?: boolean
          show_logo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          assignment_ids: string[]
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          message: string
          read_by: string[]
          target_role: string | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          message: string
          read_by?: string[]
          target_role?: string | null
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          read_by?: string[]
          target_role?: string | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_templates: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_number: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_number?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_number?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_available: boolean
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_available?: boolean
          role?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_available?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          bankgiro: string | null
          company_id: string | null
          company_name: string
          created_at: string
          currency: string
          currency_symbol: string
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
          company_id?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          currency_symbol?: string
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
          company_id?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          currency_symbol?: string
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
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          name: string
          notes: string | null
          registration_number: string | null
          type: string
          updated_at: string
          year: number | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          registration_number?: string | null
          type?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          registration_number?: string | null
          type?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      get_my_company_id: { Args: never; Returns: string }
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
      compensation_type: "hourly" | "per_assignment" | "monthly"
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
      compensation_type: ["hourly", "per_assignment", "monthly"],
    },
  },
} as const
