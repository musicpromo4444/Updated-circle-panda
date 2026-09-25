export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          handle: string;
          avatar: string;
          role: string;
          coins: number;
          reputation: number;
          level: number;
          xp: number;
          is_vip: boolean;
          vip_expires_at: string | null;
          last_spin_at: string | null;
          last_ad_reward_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          handle: string;
          avatar?: string;
          role?: string;
          coins?: number;
          reputation?: number;
          level?: number;
          xp?: number;
          is_vip?: boolean;
          vip_expires_at?: string | null;
          last_spin_at?: string | null;
          last_ad_reward_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          handle?: string;
          avatar?: string;
          role?: string;
          coins?: number;
          reputation?: number;
          level?: number;
          xp?: number;
          is_vip?: boolean;
          vip_expires_at?: string | null;
          last_spin_at?: string | null;
          last_ad_reward_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          kind: string;
          title: string;
          blurb: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind?: string;
          title?: string;
          blurb?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          title?: string;
          blurb?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_participants: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          user_id?: string;
          joined_at?: string;
          last_read_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      confessions: {
        Row: {
          id: string;
          author_id: string | null;
          author_handle: string;
          body: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          author_handle?: string;
          body: string;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          author_handle?: string;
          body?: string;
          likes_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      confession_replies: {
        Row: {
          id: string;
          confession_id: string;
          author_id: string | null;
          author_handle: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          confession_id: string;
          author_id?: string | null;
          author_handle?: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          confession_id?: string;
          author_id?: string | null;
          author_handle?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          balance_after?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      spin_history: {
        Row: {
          id: string;
          user_id: string;
          prize_id: string;
          prize_title: string;
          prize_kind: string;
          prize_value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prize_id: string;
          prize_title: string;
          prize_kind: string;
          prize_value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prize_id?: string;
          prize_title?: string;
          prize_kind?: string;
          prize_value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      send_chat_message: {
        Args: {
          p_thread_id: string;
          p_body: string;
        };
        Returns: Json;
      };
      spin_daily_wheel: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      claim_rewarded_ad_coins: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      submit_confession: {
        Args: {
          p_body: string;
        };
        Returns: Json;
      };
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
