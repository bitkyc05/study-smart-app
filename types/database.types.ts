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
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          metadata: Json | null
          provider_settings: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          provider_settings?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          provider_settings?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string
          file_context_id: string
          id: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          file_context_id: string
          id?: string
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          file_context_id?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_file_context_id_fkey"
            columns: ["file_context_id"]
            isOneToOne: false
            referencedRelation: "file_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      file_contexts: {
        Row: {
          content_embedding: string | null
          content_text: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          processed_at: string | null
          status: Database["public"]["Enums"]["file_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          content_embedding?: string | null
          content_text?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["file_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          content_embedding?: string | null
          content_text?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["file_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_completed: boolean | null
          target_date: string | null
          target_minutes: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_completed?: boolean | null
          target_date?: string | null
          target_minutes?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_completed?: boolean | null
          target_date?: string | null
          target_minutes?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journals: {
        Row: {
          content: string | null
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          d_day_target: string | null
          full_name: string | null
          id: string
          total_goal_time_minutes: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          d_day_target?: string | null
          full_name?: string | null
          id: string
          total_goal_time_minutes?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          d_day_target?: string | null
          full_name?: string | null
          id?: string
          total_goal_time_minutes?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          actual_duration: number | null
          created_at: string | null
          duration_seconds: number
          end_time: string
          ended_at: string | null
          id: number
          notes: string | null
          overtime_duration: number | null
          planned_duration_seconds: number | null
          pomodoro_cycle_id: string | null
          pomodoro_session_sequence: number | null
          session_type: string
          start_time: string
          started_at: string | null
          status: string | null
          subject_id: number | null
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          created_at?: string | null
          duration_seconds: number
          end_time: string
          ended_at?: string | null
          id?: number
          notes?: string | null
          overtime_duration?: number | null
          planned_duration_seconds?: number | null
          pomodoro_cycle_id?: string | null
          pomodoro_session_sequence?: number | null
          session_type: string
          start_time: string
          started_at?: string | null
          status?: string | null
          subject_id?: number | null
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          created_at?: string | null
          duration_seconds?: number
          end_time?: string
          ended_at?: string | null
          id?: number
          notes?: string | null
          overtime_duration?: number | null
          planned_duration_seconds?: number | null
          pomodoro_cycle_id?: string | null
          pomodoro_session_sequence?: number | null
          session_type?: string
          start_time?: string
          started_at?: string | null
          status?: string | null
          subject_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color_hex: string | null
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          custom_url: string | null
          encrypted_key: string
          id: string
          is_active: boolean
          key_name: string
          last_used_at: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_url?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean
          key_name: string
          last_used_at?: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          user_id: string
        }
        Update: {
          created_at?: string
          custom_url?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean
          key_name?: string
          last_used_at?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          user_id?: string
        }
        Relationships: []
      }
      user_api_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          prompt_tokens: number
          provider: Database["public"]["Enums"]["ai_provider"]
          request_count: number
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          prompt_tokens?: number
          provider: Database["public"]["Enums"]["ai_provider"]
          request_count?: number
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          prompt_tokens?: number
          provider?: Database["public"]["Enums"]["ai_provider"]
          request_count?: number
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          progress: number | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          badge_id: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          badge_id?: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: number
          notification_settings: Json | null
          pomodoro_settings: Json | null
          preferences: Json | null
          study_goals: Json | null
          timezone: string | null
          ui_settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          notification_settings?: Json | null
          pomodoro_settings?: Json | null
          preferences?: Json | null
          study_goals?: Json | null
          timezone?: string | null
          ui_settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          notification_settings?: Json | null
          pomodoro_settings?: Json | null
          preferences?: Json | null
          study_goals?: Json | null
          timezone?: string | null
          ui_settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_dday_progress: {
        Args: { p_user_id: string }
        Returns: {
          accumulated_minutes: number
          daily_progress: Json
          start_date: string
          end_date: string
          days_elapsed: number
          days_remaining: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_provider: Database["public"]["Enums"]["ai_provider"]
        }
        Returns: boolean
      }
      decrypt_api_key: {
        Args: {
          p_user_id: string
          p_provider: Database["public"]["Enums"]["ai_provider"]
        }
        Returns: string
      }
      encrypt_api_key: {
        Args: { p_api_key: string; p_user_id: string }
        Returns: string
      }
      get_daily_study_summary: {
        Args: {
          start_date: string
          end_date: string
          p_user_id: string
          p_timezone?: string
        }
        Returns: {
          day: string
          total_minutes: number
          session_count: number
          subjects: string[]
        }[]
      }
      get_hourly_study_pattern: {
        Args: {
          start_date: string
          end_date: string
          p_user_id: string
          p_timezone?: string
        }
        Returns: {
          day_of_week: number
          hour: number
          total_minutes: number
          session_count: number
        }[]
      }
      get_learning_pattern_analysis: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_monthly_calendar_data: {
        Args: {
          year: number
          month: number
          p_user_id: string
          p_timezone?: string
        }
        Returns: {
          date: string
          total_minutes: number
          session_count: number
          subjects: string[]
        }[]
      }
      get_monthly_progress: {
        Args: { p_user_id: string; p_year?: number; p_month?: number }
        Returns: {
          month_start: string
          month_end: string
          total_minutes: number
          daily_goal: number
          monthly_goal: number
          daily_progress: Json
        }[]
      }
      get_monthly_study_trend: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_study_insights: {
        Args: {
          start_date: string
          end_date: string
          p_user_id: string
          p_timezone?: string
        }
        Returns: {
          total_minutes: number
          total_sessions: number
          study_days: number
          avg_session_minutes: number
          most_studied_subject: string
          most_productive_hour: number
          longest_session_minutes: number
        }[]
      }
      get_subject_analysis: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_achievements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_profile_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_weekly_comparison: {
        Args: { week_start: string; p_user_id: string; p_timezone?: string }
        Returns: {
          week_offset: number
          day_of_week: number
          total_minutes: number
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_token_usage: {
        Args: {
          p_user_id: string
          p_provider: Database["public"]["Enums"]["ai_provider"]
          p_prompt_tokens: number
          p_completion_tokens: number
        }
        Returns: undefined
      }
      upsert_api_key: {
        Args: {
          p_user_id: string
          p_provider: Database["public"]["Enums"]["ai_provider"]
          p_api_key: string
          p_custom_url?: string
        }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      ai_provider: "openai" | "anthropic" | "google" | "grok" | "custom"
      file_status: "processing" | "ready" | "failed"
      message_role: "user" | "assistant" | "system"
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
      ai_provider: ["openai", "anthropic", "google", "grok", "custom"],
      file_status: ["processing", "ready", "failed"],
      message_role: ["user", "assistant", "system"],
    },
  },
} as const