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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_members: {
        Row: {
          aadhaar_number: string
          aadhaar_photo: string
          booking_id: string
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          aadhaar_number: string
          aadhaar_photo: string
          booking_id: string
          created_at?: string
          full_name: string
          id?: string
        }
        Update: {
          aadhaar_number?: string
          aadhaar_photo?: string
          booking_id?: string
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_members_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_source: string
          created_at: string
          id: string
          is_group: boolean
          notes: string | null
          payment_status: string
          primary_aadhaar: string | null
          primary_aadhaar_photo: string | null
          primary_age: number | null
          primary_email: string | null
          primary_gender: string | null
          primary_name: string
          primary_phone: string
          seats_booked: number
          status: string
          trek_id: string | null
          trek_name: string
          user_id: string | null
        }
        Insert: {
          booking_source?: string
          created_at?: string
          id?: string
          is_group?: boolean
          notes?: string | null
          payment_status?: string
          primary_aadhaar?: string | null
          primary_aadhaar_photo?: string | null
          primary_age?: number | null
          primary_email?: string | null
          primary_gender?: string | null
          primary_name: string
          primary_phone: string
          seats_booked?: number
          status?: string
          trek_id?: string | null
          trek_name: string
          user_id?: string | null
        }
        Update: {
          booking_source?: string
          created_at?: string
          id?: string
          is_group?: boolean
          notes?: string | null
          payment_status?: string
          primary_aadhaar?: string | null
          primary_aadhaar_photo?: string | null
          primary_age?: number | null
          primary_email?: string | null
          primary_gender?: string | null
          primary_name?: string
          primary_phone?: string
          seats_booked?: number
          status?: string
          trek_id?: string | null
          trek_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      callback_requests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          mobile_number: string
          preferred_time: string | null
          status: string
          trip_id: string | null
          trip_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          mobile_number: string
          preferred_time?: string | null
          status?: string
          trip_id?: string | null
          trip_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          mobile_number?: string
          preferred_time?: string | null
          status?: string
          trip_id?: string | null
          trip_name?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          alt_text: string | null
          category: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          storage_path: string | null
        }
        Insert: {
          alt_text?: string | null
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          storage_path?: string | null
        }
        Update: {
          alt_text?: string | null
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          storage_path?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          aadhaar_photo_path: string | null
          age: number | null
          created_at: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          aadhaar_number?: string | null
          aadhaar_photo_path?: string | null
          age?: number | null
          created_at?: string
          full_name?: string
          gender?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          aadhaar_number?: string | null
          aadhaar_photo_path?: string | null
          age?: number | null
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_album_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          trek_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          trek_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          trek_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_album_images_trek_id_fkey"
            columns: ["trek_id"]
            isOneToOne: false
            referencedRelation: "upcoming_treks"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_treks: {
        Row: {
          additional_dates: string[]
          album_url: string | null
          altitude: string | null
          base_village: string | null
          created_at: string
          description: string | null
          destination: string | null
          difficulty: Database["public"]["Enums"]["trek_difficulty"]
          distance: string | null
          duration: string | null
          duration_text: string | null
          elevation_gain: string | null
          event_type: string
          field_labels: Json
          id: string
          image_url: string | null
          instructions: string | null
          is_archived: boolean
          is_draft: boolean
          itinerary_days: Json
          itinerary_file_path: string | null
          itinerary_url: string | null
          location: string | null
          max_seats: number
          meeting_point: string | null
          mountain_range: string | null
          name: string
          price: number
          region: string | null
          seats_taken: number
          starting_price: number | null
          starting_price_label: string | null
          status_override: string | null
          stay_location: string | null
          top_end_price: number | null
          top_end_price_label: string | null
          trek_date: string | null
          trek_difficulty: string | null
          trek_distance: string | null
          trek_time: string | null
        }
        Insert: {
          additional_dates?: string[]
          album_url?: string | null
          altitude?: string | null
          base_village?: string | null
          created_at?: string
          description?: string | null
          destination?: string | null
          difficulty?: Database["public"]["Enums"]["trek_difficulty"]
          distance?: string | null
          duration?: string | null
          duration_text?: string | null
          elevation_gain?: string | null
          event_type?: string
          field_labels?: Json
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_archived?: boolean
          is_draft?: boolean
          itinerary_days?: Json
          itinerary_file_path?: string | null
          itinerary_url?: string | null
          location?: string | null
          max_seats?: number
          meeting_point?: string | null
          mountain_range?: string | null
          name: string
          price?: number
          region?: string | null
          seats_taken?: number
          starting_price?: number | null
          starting_price_label?: string | null
          status_override?: string | null
          stay_location?: string | null
          top_end_price?: number | null
          top_end_price_label?: string | null
          trek_date?: string | null
          trek_difficulty?: string | null
          trek_distance?: string | null
          trek_time?: string | null
        }
        Update: {
          additional_dates?: string[]
          album_url?: string | null
          altitude?: string | null
          base_village?: string | null
          created_at?: string
          description?: string | null
          destination?: string | null
          difficulty?: Database["public"]["Enums"]["trek_difficulty"]
          distance?: string | null
          duration?: string | null
          duration_text?: string | null
          elevation_gain?: string | null
          event_type?: string
          field_labels?: Json
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_archived?: boolean
          is_draft?: boolean
          itinerary_days?: Json
          itinerary_file_path?: string | null
          itinerary_url?: string | null
          location?: string | null
          max_seats?: number
          meeting_point?: string | null
          mountain_range?: string | null
          name?: string
          price?: number
          region?: string | null
          seats_taken?: number
          starting_price?: number | null
          starting_price_label?: string | null
          status_override?: string | null
          stay_location?: string | null
          top_end_price?: number | null
          top_end_price_label?: string | null
          trek_date?: string | null
          trek_difficulty?: string | null
          trek_distance?: string | null
          trek_time?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_trek_seat_stats: {
        Args: never
        Returns: {
          max_seats: number
          seats_remaining: number
          seats_taken: number
          trek_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      trek_difficulty: "Easy" | "Moderate" | "Hard"
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
      app_role: ["admin", "user"],
      trek_difficulty: ["Easy", "Moderate", "Hard"],
    },
  },
} as const
