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
      appointment_requests: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          error_message: string | null
          id: string
          preferred_date: string
          preferred_time: string
          provider_message_id: string | null
          sent_at: string | null
          service: string
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          preferred_date: string
          preferred_time: string
          provider_message_id?: string | null
          sent_at?: string | null
          service: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          preferred_date?: string
          preferred_time?: string
          provider_message_id?: string | null
          sent_at?: string | null
          service?: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_business_customer_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "appointment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          business_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["availability_status"]
        }
        Insert: {
          business_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Update: {
          business_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["availability_status"]
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_faqs: {
        Row: {
          answer: string
          business_id: string
          category: string | null
          created_at: string
          id: string
          question: string
        }
        Insert: {
          answer: string
          business_id: string
          category?: string | null
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          answer?: string
          business_id?: string
          category?: string | null
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_faqs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          closes_at: string
          created_at: string
          day_of_week: number
          id: string
          opens_at: string
        }
        Insert: {
          business_id: string
          closes_at: string
          created_at?: string
          day_of_week: number
          id?: string
          opens_at: string
        }
        Update: {
          business_id?: string
          closes_at?: string
          created_at?: string
          day_of_week?: number
          id?: string
          opens_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_links: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          notes: string
          purpose: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          notes?: string
          purpose?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          notes?: string
          purpose?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_services: {
        Row: {
          business_id: string
          created_at: string
          description: string
          duration_minutes: number | null
          id: string
          is_active: boolean
          max_price: number | null
          min_price: number | null
          name: string
          requires_evaluation: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          max_price?: number | null
          min_price?: number | null
          name: string
          requires_evaluation?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          max_price?: number | null
          min_price?: number | null
          name?: string
          requires_evaluation?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          description: string
          hours: string
          id: string
          location: string
          name: string
          owner_id: string
          phone: string
          rules: string[]
          services: string[]
          slug: string
          type: Database["public"]["Enums"]["business_type"]
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          hours: string
          id?: string
          location: string
          name: string
          owner_id: string
          phone: string
          rules?: string[]
          services?: string[]
          slug: string
          type: Database["public"]["Enums"]["business_type"]
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          hours?: string
          id?: string
          location?: string
          name?: string
          owner_id?: string
          phone?: string
          rules?: string[]
          services?: string[]
          slug?: string
          type?: Database["public"]["Enums"]["business_type"]
          whatsapp_phone_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          customer_id: string
          id: string
          last_intent: Database["public"]["Enums"]["conversation_intent"]
        }
        Insert: {
          business_id: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          customer_id: string
          id?: string
          last_intent?: Database["public"]["Enums"]["conversation_intent"]
        }
        Update: {
          business_id?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          customer_id?: string
          id?: string
          last_intent?: Database["public"]["Enums"]["conversation_intent"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_customer_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          phone: string
          status: Database["public"]["Enums"]["lead_status"]
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          phone: string
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount_cents: number | null
          billing_period: string | null
          business_id: string
          created_at: string
          id: string
          mime_type: string
          notes: string
          object_path: string
          original_name: string
          review_notes: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_receipt_status"]
          uploaded_by: string
        }
        Insert: {
          amount_cents?: number | null
          billing_period?: string | null
          business_id: string
          created_at?: string
          id?: string
          mime_type: string
          notes?: string
          object_path: string
          original_name: string
          review_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_receipt_status"]
          uploaded_by: string
        }
        Update: {
          amount_cents?: number | null
          billing_period?: string | null
          business_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          notes?: string
          object_path?: string
          original_name?: string
          review_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_receipt_status"]
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["profile_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Relationships: []
      }
      quotes: {
        Row: {
          business_id: string
          conversation_id: string | null
          created_at: string
          customer_id: string
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          description: string
          error_message: string | null
          id: string
          max_price: number
          min_price: number
          notes: string
          provider_message_id: string | null
          sent_at: string | null
          service: string
          status: Database["public"]["Enums"]["quote_status"]
        }
        Insert: {
          business_id: string
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          description: string
          error_message?: string | null
          id?: string
          max_price: number
          min_price: number
          notes: string
          provider_message_id?: string | null
          sent_at?: string | null
          service: string
          status?: Database["public"]["Enums"]["quote_status"]
        }
        Update: {
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          description?: string
          error_message?: string | null
          id?: string
          max_price?: number
          min_price?: number
          notes?: string
          provider_message_id?: string | null
          sent_at?: string | null
          service?: string
          status?: Database["public"]["Enums"]["quote_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_customer_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_internal_whatsapp_event: {
        Args: { p_business_id: string; p_event_id: string; p_token: string }
        Returns: boolean
      }
      consume_internal_rate_limit: {
        Args: {
          p_max_requests: number
          p_rate_key: string
          p_token: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_internal_appointment: {
        Args: {
          p_business_id: string
          p_conversation_id: string
          p_customer_id: string
          p_id: string
          p_preferred_date: string
          p_preferred_time: string
          p_service: string
          p_token: string
        }
        Returns: boolean
      }
      finish_internal_whatsapp_event: {
        Args: { p_event_id: string; p_succeeded: boolean; p_token: string }
        Returns: undefined
      }
      get_chat_context: {
        Args: { p_phone_number_id?: string; p_slug?: string; p_token: string }
        Returns: Json
      }
      get_or_create_chat_session: {
        Args: {
          p_business_id: string
          p_channel: Database["public"]["Enums"]["message_channel"]
          p_conversation_id?: string
          p_customer_id?: string
          p_customer_name: string
          p_customer_phone: string
          p_token: string
        }
        Returns: Json
      }
      persist_internal_chat_turn: {
        Args: {
          p_assistant_message: string
          p_business_id: string
          p_conversation_id: string
          p_customer_id: string
          p_customer_message: string
          p_intent: Database["public"]["Enums"]["conversation_intent"]
          p_quote?: Json
          p_token: string
        }
        Returns: Json
      }
    }
    Enums: {
      appointment_status: "pending" | "confirmed" | "cancelled"
      availability_status: "available" | "blocked" | "booked"
      business_type: "dentist" | "repair"
      conversation_intent: "faq" | "quote" | "appointment" | "handoff"
      delivery_status: "pending" | "sent" | "failed"
      lead_status: "new" | "qualified" | "appointment" | "quoted"
      message_channel: "web" | "whatsapp"
      message_role: "assistant" | "customer"
      payment_receipt_status: "pending" | "approved" | "rejected"
      profile_role: "platform_admin" | "business_owner"
      quote_status: "draft" | "sent" | "accepted" | "rejected"
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
      appointment_status: ["pending", "confirmed", "cancelled"],
      availability_status: ["available", "blocked", "booked"],
      business_type: ["dentist", "repair"],
      conversation_intent: ["faq", "quote", "appointment", "handoff"],
      delivery_status: ["pending", "sent", "failed"],
      lead_status: ["new", "qualified", "appointment", "quoted"],
      message_channel: ["web", "whatsapp"],
      message_role: ["assistant", "customer"],
      payment_receipt_status: ["pending", "approved", "rejected"],
      profile_role: ["platform_admin", "business_owner"],
      quote_status: ["draft", "sent", "accepted", "rejected"],
    },
  },
} as const
