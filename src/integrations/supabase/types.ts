export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          apk_url: string;
          daily_drops: number;
          dating_enabled: boolean;
          feed_ads_enabled: boolean;
          hot_seat_mode: string;
          id: number;
          live_stream_enabled: boolean;
          rewarded_ads_enabled: boolean;
          show_download_button: boolean;
          spin_wheel_enabled: boolean;
          updated_at: string;
          waiting_cta_label: string;
          waiting_cta_url: string;
          waiting_media_mode: string;
          waiting_media_url: string;
          waiting_sponsor_name: string;
        };
        Insert: {
          apk_url?: string;
          daily_drops?: number;
          dating_enabled?: boolean;
          feed_ads_enabled?: boolean;
          hot_seat_mode?: string;
          id?: number;
          live_stream_enabled?: boolean;
          rewarded_ads_enabled?: boolean;
          show_download_button?: boolean;
          spin_wheel_enabled?: boolean;
          updated_at?: string;
          waiting_cta_label?: string;
          waiting_cta_url?: string;
          waiting_media_mode?: string;
          waiting_media_url?: string;
          waiting_sponsor_name?: string;
        };
        Update: {
          apk_url?: string;
          daily_drops?: number;
          dating_enabled?: boolean;
          feed_ads_enabled?: boolean;
          hot_seat_mode?: string;
          id?: number;
          live_stream_enabled?: boolean;
          rewarded_ads_enabled?: boolean;
          show_download_button?: boolean;
          spin_wheel_enabled?: boolean;
          updated_at?: string;
          waiting_cta_label?: string;
          waiting_cta_url?: string;
          waiting_media_mode?: string;
          waiting_media_url?: string;
          waiting_sponsor_name?: string;
        };
        Relationships: [];
      };
      hot_seat_answers: {
        Row: {
          body: string | null;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          kind: string;
          media_url: string | null;
          question_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          kind?: string;
          media_url?: string | null;
          question_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          kind?: string;
          media_url?: string | null;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hot_seat_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "hot_seat_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      hot_seat_hosts: {
        Row: {
          alias: string;
          avatar: string;
          created_at: string;
          ends_at: string;
          id: string;
          is_active: boolean;
          media_kind: string;
          media_url: string | null;
          started_at: string;
        };
        Insert: {
          alias: string;
          avatar?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          is_active?: boolean;
          media_kind?: string;
          media_url?: string | null;
          started_at?: string;
        };
        Update: {
          alias?: string;
          avatar?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          is_active?: boolean;
          media_kind?: string;
          media_url?: string | null;
          started_at?: string;
        };
        Relationships: [];
      };
      hot_seat_questions: {
        Row: {
          asker_alias: string;
          body: string;
          created_at: string;
          host_id: string | null;
          id: string;
          is_priority: boolean;
        };
        Insert: {
          asker_alias?: string;
          body: string;
          created_at?: string;
          host_id?: string | null;
          id?: string;
          is_priority?: boolean;
        };
        Update: {
          asker_alias?: string;
          body?: string;
          created_at?: string;
          host_id?: string | null;
          id?: string;
          is_priority?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "hot_seat_questions_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hot_seat_hosts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
