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
          delivery_address: string | null
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
          pickup_address: string | null
          priority: string
          require_photo: boolean
          require_signature: boolean
          route_sequence: number | null
          scheduled_end: string | null
          scheduled_start: string
          series_date: string | null
          series_id: string | null
          service_type: string | null
          signature_url: string | null
          status: string
          title: string
          tracking_enabled: boolean
          tracking_token: string
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
          delivery_address?: string | null
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
          pickup_address?: string | null
          priority?: string
          require_photo?: boolean
          require_signature?: boolean
          route_sequence?: number | null
          scheduled_end?: string | null
          scheduled_start: string
          series_date?: string | null
          series_id?: string | null
          service_type?: string | null
          signature_url?: string | null
          status?: string
          title: string
          tracking_enabled?: boolean
          tracking_token?: string
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
          delivery_address?: string | null
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
          pickup_address?: string | null
          priority?: string
          require_photo?: boolean
          require_signature?: boolean
          route_sequence?: number | null
          scheduled_end?: string | null
          scheduled_start?: string
          series_date?: string | null
          series_id?: string | null
          service_type?: string | null
          signature_url?: string | null
          status?: string
          title?: string
          tracking_enabled?: boolean
          tracking_token?: string
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
            foreignKeyName: "assignments_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "recurring_assignment_series"
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
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
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
          public_order_number: string | null
          public_request_id: string | null
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
          public_order_number?: string | null
          public_request_id?: string | null
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
          public_order_number?: string | null
          public_request_id?: string | null
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
          public_booking_slug: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          onboarding_completed?: boolean | null
          org_nr?: string | null
          public_booking_slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          org_nr?: string | null
          public_booking_slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
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
      driver_documents: {
        Row: {
          company_id: string
          created_at: string
          doc_type: string
          driver_id: string
          expires_at: string | null
          file_url: string | null
          id: string
          label: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_type: string
          driver_id: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_type?: string
          driver_id?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_company_id_fkey"
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
      driver_push_tokens: {
        Row: {
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_settings: {
        Row: {
          company_id: string | null
          id: string
          require_photo: boolean
          require_signature: boolean
          show_availability_toggle: boolean
          show_time_report: boolean
          show_total_hours: boolean
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          require_photo?: boolean
          require_signature?: boolean
          show_availability_toggle?: boolean
          show_time_report?: boolean
          show_total_hours?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          id?: string
          require_photo?: boolean
          require_signature?: boolean
          show_availability_toggle?: boolean
          show_time_report?: boolean
          show_total_hours?: boolean
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
          show_total_hours: boolean | null
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
          show_total_hours?: boolean | null
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
          show_total_hours?: boolean | null
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
      driver_sync_operations: {
        Row: {
          assignment_id: string
          company_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          operation_type: string
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          operation_type: string
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          operation_type?: string
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_sync_operations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_sync_operations_company_id_fkey"
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
      fortnox_connections: {
        Row: {
          access_token_secret_id: string
          company_id: string
          connected_at: string
          connected_by: string | null
          fortnox_company_name: string | null
          fortnox_organization_number: string | null
          id: string
          last_error: string | null
          refresh_token_secret_id: string
          scopes: string[]
          status: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token_secret_id: string
          company_id: string
          connected_at?: string
          connected_by?: string | null
          fortnox_company_name?: string | null
          fortnox_organization_number?: string | null
          id?: string
          last_error?: string | null
          refresh_token_secret_id: string
          scopes?: string[]
          status?: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token_secret_id?: string
          company_id?: string
          connected_at?: string
          connected_by?: string | null
          fortnox_company_name?: string | null
          fortnox_organization_number?: string | null
          id?: string
          last_error?: string | null
          refresh_token_secret_id?: string
          scopes?: string[]
          status?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fortnox_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fortnox_customer_mappings: {
        Row: {
          company_id: string
          customer_id: string
          fortnox_customer_number: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          customer_id: string
          fortnox_customer_number: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          customer_id?: string
          fortnox_customer_number?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fortnox_customer_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fortnox_customer_mappings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      fortnox_invoice_syncs: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          fortnox_document_number: string | null
          id: string
          idempotency_key: string
          invoice_id: string
          request_payload: Json | null
          response_payload: Json | null
          status: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          fortnox_document_number?: string | null
          id?: string
          idempotency_key?: string
          invoice_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          fortnox_document_number?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fortnox_invoice_syncs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fortnox_invoice_syncs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fortnox_oauth_states: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string
          id: string
          redirect_after: string
          state_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          redirect_after?: string
          state_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_after?: string
          state_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fortnox_oauth_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_order_emails: {
        Row: {
          attachments: Json
          channel_id: string | null
          company_id: string
          converted_assignment_id: string | null
          created_at: string
          error_message: string | null
          from_address: string
          html_body: string | null
          id: string
          message_id: string | null
          parse_confidence: number
          parsed_payload: Json | null
          provider: string
          provider_email_id: string
          received_at: string
          reviewed_at: string | null
          status: string
          subject: string
          text_body: string | null
          to_addresses: string[]
          updated_at: string
        }
        Insert: {
          attachments?: Json
          channel_id?: string | null
          company_id: string
          converted_assignment_id?: string | null
          created_at?: string
          error_message?: string | null
          from_address: string
          html_body?: string | null
          id?: string
          message_id?: string | null
          parse_confidence?: number
          parsed_payload?: Json | null
          provider?: string
          provider_email_id: string
          received_at?: string
          reviewed_at?: string | null
          status?: string
          subject?: string
          text_body?: string | null
          to_addresses?: string[]
          updated_at?: string
        }
        Update: {
          attachments?: Json
          channel_id?: string | null
          company_id?: string
          converted_assignment_id?: string | null
          created_at?: string
          error_message?: string | null
          from_address?: string
          html_body?: string | null
          id?: string
          message_id?: string | null
          parse_confidence?: number
          parsed_payload?: Json | null
          provider?: string
          provider_email_id?: string
          received_at?: string
          reviewed_at?: string | null
          status?: string
          subject?: string
          text_body?: string | null
          to_addresses?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_order_emails_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "order_inbox_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_order_emails_converted_assignment_id_fkey"
            columns: ["converted_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
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
          lines: Json
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
          lines?: Json
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
          lines?: Json
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
      leads: {
        Row: {
          admin_notes: string | null
          company_name: string
          contact_person: string
          created_at: string
          email: string
          fleet_size: string | null
          id: string
          lead_score: number
          message: string | null
          org_number: string | null
          phone: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          admin_notes?: string | null
          company_name: string
          contact_person: string
          created_at?: string
          email: string
          fleet_size?: string | null
          id?: string
          lead_score?: number
          message?: string | null
          org_number?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          admin_notes?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          fleet_size?: string | null
          id?: string
          lead_score?: number
          message?: string | null
          org_number?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          attempts: number
          channel: string
          company_id: string | null
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          attempts?: number
          channel: string
          company_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          attempts?: number
          channel?: string
          company_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: []
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
      ob_rates: {
        Row: {
          active: boolean
          applies_to_saturdays: boolean
          applies_to_sundays: boolean
          applies_to_weekdays: boolean
          company_id: string | null
          created_at: string
          end_time: string
          id: string
          name: string
          rate_per_hour: number
          start_time: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_saturdays?: boolean
          applies_to_sundays?: boolean
          applies_to_weekdays?: boolean
          company_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          name: string
          rate_per_hour?: number
          start_time?: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_saturdays?: boolean
          applies_to_sundays?: boolean
          applies_to_weekdays?: boolean
          company_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          rate_per_hour?: number
          start_time?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_inbox_channels: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          id: string
          inbox_key: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          inbox_key?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          inbox_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_inbox_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
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
      per_diem_rates: {
        Row: {
          active: boolean
          amount: number
          company_id: string | null
          created_at: string
          id: string
          min_hours: number
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          min_hours?: number
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          min_hours?: number
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "per_diem_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          message: string
          target: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          message: string
          target?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          target?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_messages: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          message: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          message: string
          sender_name: string
          sender_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          message?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_customer_id_fkey"
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
      public_booking_rate_limits: {
        Row: {
          bucket_start: string
          company_id: string
          created_at: string
          fingerprint: string
          request_count: number
        }
        Insert: {
          bucket_start: string
          company_id: string
          created_at?: string
          fingerprint: string
          request_count?: number
        }
        Update: {
          bucket_start?: string
          company_id?: string
          created_at?: string
          fingerprint?: string
          request_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_rate_limits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_assignment_series: {
        Row: {
          active: boolean
          address: string
          assigned_driver_id: string
          company_id: string
          created_at: string
          customer_id: string
          day_of_month: number | null
          duration_minutes: number
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          priority: string
          scheduled_time: string
          start_date: string
          title: string
          updated_at: string
          vehicle_id: string | null
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          address: string
          assigned_driver_id: string
          company_id: string
          created_at?: string
          customer_id: string
          day_of_month?: number | null
          duration_minutes?: number
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          priority?: string
          scheduled_time?: string
          start_date?: string
          title: string
          updated_at?: string
          vehicle_id?: string | null
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          address?: string
          assigned_driver_id?: string
          company_id?: string
          created_at?: string
          customer_id?: string
          day_of_month?: number | null
          duration_minutes?: number
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          priority?: string
          scheduled_time?: string
          start_date?: string
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "recurring_assignment_series_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_assignment_series_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_assignment_series_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_assignment_series_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_generation_runs: {
        Row: {
          company_id: string | null
          considered: number
          created_at: string
          error: string | null
          finished_at: string | null
          generated: number
          horizon_days: number | null
          id: string
          series_count: number
          started_at: string
          status: string
          triggered_by: string
          triggered_by_user: string | null
        }
        Insert: {
          company_id?: string | null
          considered?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          generated?: number
          horizon_days?: number | null
          id?: string
          series_count?: number
          started_at?: string
          status?: string
          triggered_by: string
          triggered_by_user?: string | null
        }
        Update: {
          company_id?: string | null
          considered?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          generated?: number
          horizon_days?: number | null
          id?: string
          series_count?: number
          started_at?: string
          status?: string
          triggered_by?: string
          triggered_by_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_generation_runs_company_id_fkey"
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
          invoice_mode: string
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
          invoice_mode?: string
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
          invoice_mode?: string
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
      support_tickets: {
        Row: {
          admin_reply: string | null
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          message: string
          priority: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          message: string
          priority?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          priority?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
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
      vehicle_maintenance: {
        Row: {
          company_id: string
          completed_at: string | null
          cost: number | null
          created_at: string
          due_date: string | null
          due_odometer_km: number | null
          id: string
          notes: string | null
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          due_date?: string | null
          due_odometer_km?: number | null
          id?: string
          notes?: string | null
          type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          due_date?: string | null
          due_odometer_km?: number | null
          id?: string
          notes?: string | null
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: undefined
      }
      consume_public_booking_rate_limit: {
        Args: { p_company_id: string; p_fingerprint: string; p_limit?: number }
        Returns: boolean
      }
      create_invoice_with_lines: {
        Args: {
          p_assignment_ids: string[]
          p_customer_id: string
          p_due_date: string
          p_invoice_date: string
          p_invoice_number: number
          p_lines?: Json
          p_message?: string
          p_reference?: string
          p_status: string
          p_total_ex_vat: number
          p_total_inc_vat: number
          p_vat_amount: number
        }
        Returns: {
          assignment_ids: string[]
          company_id: string | null
          created_at: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: number
          lines: Json
          message: string | null
          reference: string | null
          status: string
          total_ex_vat: number
          total_inc_vat: number
          vat_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      get_portal_messages: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          message: string
          sender_name: string
          sender_type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "portal_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      lookup_invitation_by_token: { Args: { p_token: string }; Returns: Json }
      next_invoice_number: { Args: never; Returns: number }
      read_fortnox_tokens: {
        Args: { p_company_id: string }
        Returns: {
          access_token: string
          refresh_token: string
          scopes: string[]
          status: string
          token_expires_at: string
        }[]
      }
      register_company: {
        Args: { _name: string; _org_nr?: string; _user_full_name?: string }
        Returns: string
      }
      send_portal_message: {
        Args: { p_message: string; p_sender_name?: string; p_token: string }
        Returns: string
      }
      store_fortnox_tokens: {
        Args: {
          p_access_token: string
          p_company_id: string
          p_expires_at: string
          p_refresh_token: string
          p_scopes: string[]
          p_user_id: string
        }
        Returns: undefined
      }
      submit_satisfaction: {
        Args: { p_comment?: string; p_rating: number; p_token: string }
        Returns: undefined
      }
      validate_customer_token: { Args: { p_token: string }; Returns: Json }
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
