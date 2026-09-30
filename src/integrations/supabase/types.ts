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
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          is_enabled: boolean
          requires_ad: boolean
          reward_bc: number
          sort_order: number
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          requires_ad?: boolean
          reward_bc?: number
          sort_order?: number
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          requires_ad?: boolean
          reward_bc?: number
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      activity_participation: {
        Row: {
          activity_id: string | null
          activity_type: string
          created_at: string
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          activity_type: string
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          activity_type?: string
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participation_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_rewards: {
        Row: {
          activity_number: number
          created_at: string
          id: string
          is_enabled: boolean
          requires_playable_ad: boolean
          reward_bc: number
        }
        Insert: {
          activity_number: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          requires_playable_ad?: boolean
          reward_bc?: number
        }
        Update: {
          activity_number?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          requires_playable_ad?: boolean
          reward_bc?: number
        }
        Relationships: []
      }
      activity_settings: {
        Row: {
          id: number
          reset_day: string
          updated_at: string
        }
        Insert: {
          id?: number
          reset_day?: string
          updated_at?: string
        }
        Update: {
          id?: number
          reset_day?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          advertiser_name: string
          budget: number | null
          campaign_code: string
          campaign_name: string
          created_at: string
          currency: string
          end_at: string | null
          id: string
          partner_id: string | null
          partner_name: string | null
          pricing_model: string
          start_at: string | null
          status: string
          target_countries: string[]
          updated_at: string
        }
        Insert: {
          advertiser_name: string
          budget?: number | null
          campaign_code: string
          campaign_name: string
          created_at?: string
          currency?: string
          end_at?: string | null
          id?: string
          partner_id?: string | null
          partner_name?: string | null
          pricing_model?: string
          start_at?: string | null
          status?: string
          target_countries?: string[]
          updated_at?: string
        }
        Update: {
          advertiser_name?: string
          budget?: number | null
          campaign_code?: string
          campaign_name?: string
          created_at?: string
          currency?: string
          end_at?: string | null
          id?: string
          partner_id?: string | null
          partner_name?: string | null
          pricing_model?: string
          start_at?: string | null
          status?: string
          target_countries?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "circle_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          call_to_action: string
          campaign_id: string | null
          category: string
          created_at: string
          description: string
          destination_url: string | null
          duration_seconds: number
          format: string
          headline: string
          id: string
          image_url: string | null
          placement: string
          poster_url: string | null
          skip_after_seconds: number
          sponsor: string
          status: string
          tagline: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          call_to_action?: string
          campaign_id?: string | null
          category?: string
          created_at?: string
          description?: string
          destination_url?: string | null
          duration_seconds?: number
          format: string
          headline: string
          id?: string
          image_url?: string | null
          placement: string
          poster_url?: string | null
          skip_after_seconds?: number
          sponsor: string
          status?: string
          tagline?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          call_to_action?: string
          campaign_id?: string | null
          category?: string
          created_at?: string
          description?: string
          destination_url?: string | null
          duration_seconds?: number
          format?: string
          headline?: string
          id?: string
          image_url?: string | null
          placement?: string
          poster_url?: string | null
          skip_after_seconds?: number
          sponsor?: string
          status?: string
          tagline?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_report"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          ad_id: string
          campaign_id: string | null
          country_code: string | null
          created_at: string
          event_type: string
          format: string
          id: string
          placement: string | null
          user_id: string
          value: number
        }
        Insert: {
          ad_id: string
          campaign_id?: string | null
          country_code?: string | null
          created_at?: string
          event_type: string
          format: string
          id?: string
          placement?: string | null
          user_id: string
          value?: number
        }
        Update: {
          ad_id?: string
          campaign_id?: string | null
          country_code?: string | null
          created_at?: string
          event_type?: string
          format?: string
          id?: string
          placement?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_report"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placement_config: {
        Row: {
          android_native_bridge_enabled: boolean
          crush_video_frequency: number
          daily_login_popup_banner: boolean
          engagement_popup_banner: boolean
          feed_banner_interval: number
          hot_seat_comments_ads_enabled: boolean
          hot_seat_questions_ads_enabled: boolean
          hot_seat_water_break_ads_enabled: boolean
          id: boolean
          main_feed_banner: boolean
          seven_day_banner_enabled: boolean
          seven_day_playable_enabled: boolean
          updated_at: string
        }
        Insert: {
          android_native_bridge_enabled?: boolean
          crush_video_frequency?: number
          daily_login_popup_banner?: boolean
          engagement_popup_banner?: boolean
          feed_banner_interval?: number
          hot_seat_comments_ads_enabled?: boolean
          hot_seat_questions_ads_enabled?: boolean
          hot_seat_water_break_ads_enabled?: boolean
          id?: boolean
          main_feed_banner?: boolean
          seven_day_banner_enabled?: boolean
          seven_day_playable_enabled?: boolean
          updated_at?: string
        }
        Update: {
          android_native_bridge_enabled?: boolean
          crush_video_frequency?: number
          daily_login_popup_banner?: boolean
          engagement_popup_banner?: boolean
          feed_banner_interval?: number
          hot_seat_comments_ads_enabled?: boolean
          hot_seat_questions_ads_enabled?: boolean
          hot_seat_water_break_ads_enabled?: boolean
          id?: boolean
          main_feed_banner?: boolean
          seven_day_banner_enabled?: boolean
          seven_day_playable_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_email_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      admin_permission_catalog: {
        Row: {
          category: string
          description: string
          label: string
          permission_key: string
          sensitive: boolean
          sort_order: number
        }
        Insert: {
          category: string
          description?: string
          label: string
          permission_key: string
          sensitive?: boolean
          sort_order?: number
        }
        Update: {
          category?: string
          description?: string
          label?: string
          permission_key?: string
          sensitive?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "admin_permission_catalog"
            referencedColumns: ["permission_key"]
          },
        ]
      }
      admin_roles: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          role_kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          role_kind: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          role_kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_rpc_permission_map: {
        Row: {
          function_name: string
          permission_key: string
        }
        Insert: {
          function_name: string
          permission_key: string
        }
        Update: {
          function_name?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_rpc_permission_map_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "admin_permission_catalog"
            referencedColumns: ["permission_key"]
          },
        ]
      }
      app_admins: {
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
      app_settings: {
        Row: {
          apk_url: string
          daily_drops: number
          dating_enabled: boolean
          download_popup_cooldown_hours: number
          download_popup_cta: string
          download_popup_enabled: boolean
          download_popup_message: string
          download_popup_mobile_only: boolean
          download_popup_reward: string
          download_popup_title: string
          download_popup_version: string
          feed_ads_enabled: boolean
          hot_seat_mode: string
          id: number
          live_stream_enabled: boolean
          rewarded_ads_enabled: boolean
          show_download_button: boolean
          spin_wheel_enabled: boolean
          updated_at: string
          waiting_cta_label: string
          waiting_cta_url: string
          waiting_media_mode: string
          waiting_media_url: string
          waiting_sponsor_name: string
        }
        Insert: {
          apk_url?: string
          daily_drops?: number
          dating_enabled?: boolean
          download_popup_cooldown_hours?: number
          download_popup_cta?: string
          download_popup_enabled?: boolean
          download_popup_message?: string
          download_popup_mobile_only?: boolean
          download_popup_reward?: string
          download_popup_title?: string
          download_popup_version?: string
          feed_ads_enabled?: boolean
          hot_seat_mode?: string
          id?: number
          live_stream_enabled?: boolean
          rewarded_ads_enabled?: boolean
          show_download_button?: boolean
          spin_wheel_enabled?: boolean
          updated_at?: string
          waiting_cta_label?: string
          waiting_cta_url?: string
          waiting_media_mode?: string
          waiting_media_url?: string
          waiting_sponsor_name?: string
        }
        Update: {
          apk_url?: string
          daily_drops?: number
          dating_enabled?: boolean
          download_popup_cooldown_hours?: number
          download_popup_cta?: string
          download_popup_enabled?: boolean
          download_popup_message?: string
          download_popup_mobile_only?: boolean
          download_popup_reward?: string
          download_popup_title?: string
          download_popup_version?: string
          feed_ads_enabled?: boolean
          hot_seat_mode?: string
          id?: number
          live_stream_enabled?: boolean
          rewarded_ads_enabled?: boolean
          show_download_button?: boolean
          spin_wheel_enabled?: boolean
          updated_at?: string
          waiting_cta_label?: string
          waiting_cta_url?: string
          waiting_media_mode?: string
          waiting_media_url?: string
          waiting_sponsor_name?: string
        }
        Relationships: []
      }
      bc_accounts: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bc_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      circle_partners: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          notes: string | null
          partner_code: string
          partner_name: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_code: string
          partner_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_code?: string
          partner_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      confession_reactions: {
        Row: {
          confession_id: string
          created_at: string
          reaction: string
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string
          reaction: string
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confession_reactions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confessions: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          is_published: boolean
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cp_activity_engine_attempts: {
        Row: {
          attempt_no: number
          completed: boolean
          created_at: string
          cycle_id: string
          id: string
          metadata: Json
          score: number
          user_id: string
        }
        Insert: {
          attempt_no: number
          completed?: boolean
          created_at?: string
          cycle_id: string
          id?: string
          metadata?: Json
          score?: number
          user_id: string
        }
        Update: {
          attempt_no?: number
          completed?: boolean
          created_at?: string
          cycle_id?: string
          id?: string
          metadata?: Json
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_activity_engine_attempts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cp_activity_winner_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_activity_winner_announcements: {
        Row: {
          activity_title: string
          created_at: string
          cycle_id: string
          id: string
          message: string
          prize: string
          score: number | null
          visible_until: string
          winner_avatar: string | null
          winner_name: string
        }
        Insert: {
          activity_title: string
          created_at?: string
          cycle_id: string
          id?: string
          message?: string
          prize: string
          score?: number | null
          visible_until: string
          winner_avatar?: string | null
          winner_name: string
        }
        Update: {
          activity_title?: string
          created_at?: string
          cycle_id?: string
          id?: string
          message?: string
          prize?: string
          score?: number | null
          visible_until?: string
          winner_avatar?: string | null
          winner_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_activity_winner_announcements_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "cp_activity_winner_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_activity_winner_cycles: {
        Row: {
          activity_id: string | null
          activity_key: string | null
          activity_weight: number
          announced_at: string | null
          announcement_until: string | null
          completion_reward_bc: number
          completion_reward_xp: number
          created_at: string
          created_by: string | null
          eligibility: Json
          ends_at: string
          entry_limit: number | null
          id: string
          manual_winner_id: string | null
          max_attempts: number
          previous_winner_avatar: string | null
          previous_winner_id: string | null
          previous_winner_name: string | null
          previous_winner_prize: string | null
          previous_winner_score: number | null
          prize: string
          reward_status: string
          scope: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          winner_avatar: string | null
          winner_badge: string | null
          winner_id: string | null
          winner_mode: string
          winner_name: string | null
          winner_reason: string | null
          winner_reward_bc: number
          winner_reward_xp: number
          winner_rewarded_at: string | null
          winner_score: number | null
          xp_weight: number
        }
        Insert: {
          activity_id?: string | null
          activity_key?: string | null
          activity_weight?: number
          announced_at?: string | null
          announcement_until?: string | null
          completion_reward_bc?: number
          completion_reward_xp?: number
          created_at?: string
          created_by?: string | null
          eligibility?: Json
          ends_at: string
          entry_limit?: number | null
          id?: string
          manual_winner_id?: string | null
          max_attempts?: number
          previous_winner_avatar?: string | null
          previous_winner_id?: string | null
          previous_winner_name?: string | null
          previous_winner_prize?: string | null
          previous_winner_score?: number | null
          prize?: string
          reward_status?: string
          scope?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          winner_avatar?: string | null
          winner_badge?: string | null
          winner_id?: string | null
          winner_mode?: string
          winner_name?: string | null
          winner_reason?: string | null
          winner_reward_bc?: number
          winner_reward_xp?: number
          winner_rewarded_at?: string | null
          winner_score?: number | null
          xp_weight?: number
        }
        Update: {
          activity_id?: string | null
          activity_key?: string | null
          activity_weight?: number
          announced_at?: string | null
          announcement_until?: string | null
          completion_reward_bc?: number
          completion_reward_xp?: number
          created_at?: string
          created_by?: string | null
          eligibility?: Json
          ends_at?: string
          entry_limit?: number | null
          id?: string
          manual_winner_id?: string | null
          max_attempts?: number
          previous_winner_avatar?: string | null
          previous_winner_id?: string | null
          previous_winner_name?: string | null
          previous_winner_prize?: string | null
          previous_winner_score?: number | null
          prize?: string
          reward_status?: string
          scope?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          winner_avatar?: string | null
          winner_badge?: string | null
          winner_id?: string | null
          winner_mode?: string
          winner_name?: string | null
          winner_reason?: string | null
          winner_reward_bc?: number
          winner_reward_xp?: number
          winner_rewarded_at?: string | null
          winner_score?: number | null
          xp_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "cp_activity_winner_cycles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_activity_winner_entries: {
        Row: {
          activity_points: number
          completed_at: string | null
          created_at: string
          cycle_id: string
          eligible: boolean
          id: string
          metadata: Json
          score: number
          updated_at: string
          user_id: string
          xp_snapshot: number
        }
        Insert: {
          activity_points?: number
          completed_at?: string | null
          created_at?: string
          cycle_id: string
          eligible?: boolean
          id?: string
          metadata?: Json
          score?: number
          updated_at?: string
          user_id: string
          xp_snapshot?: number
        }
        Update: {
          activity_points?: number
          completed_at?: string | null
          created_at?: string
          cycle_id?: string
          eligible?: boolean
          id?: string
          metadata?: Json
          score?: number
          updated_at?: string
          user_id?: string
          xp_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "cp_activity_winner_entries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cp_activity_winner_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_admin_integrations: {
        Row: {
          enabled: boolean
          key: string
          label: string
          public_config: Json
          secret_names: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          label: string
          public_config?: Json
          secret_names?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          label?: string
          public_config?: Json
          secret_names?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cp_floating_campaign_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: number
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: never
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cp_floating_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cp_floating_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_floating_campaigns: {
        Row: {
          action_body: string | null
          action_target: string | null
          action_title: string | null
          action_type: string
          created_at: string
          created_by: string
          creative_type: string
          creative_url: string | null
          enabled: boolean
          ends_at: string | null
          fallback_icon: string
          frequency_cap_seconds: number
          id: string
          label: string
          max_clicks: number | null
          max_impressions: number | null
          max_unique_users: number | null
          name: string
          page_keys: string[]
          priority: number
          sponsor_name: string | null
          starts_at: string | null
          targeting: Json
          updated_at: string
          updated_by: string
        }
        Insert: {
          action_body?: string | null
          action_target?: string | null
          action_title?: string | null
          action_type?: string
          created_at?: string
          created_by: string
          creative_type?: string
          creative_url?: string | null
          enabled?: boolean
          ends_at?: string | null
          fallback_icon?: string
          frequency_cap_seconds?: number
          id?: string
          label?: string
          max_clicks?: number | null
          max_impressions?: number | null
          max_unique_users?: number | null
          name: string
          page_keys?: string[]
          priority?: number
          sponsor_name?: string | null
          starts_at?: string | null
          targeting?: Json
          updated_at?: string
          updated_by: string
        }
        Update: {
          action_body?: string | null
          action_target?: string | null
          action_title?: string | null
          action_type?: string
          created_at?: string
          created_by?: string
          creative_type?: string
          creative_url?: string | null
          enabled?: boolean
          ends_at?: string | null
          fallback_icon?: string
          frequency_cap_seconds?: number
          id?: string
          label?: string
          max_clicks?: number | null
          max_impressions?: number | null
          max_unique_users?: number | null
          name?: string
          page_keys?: string[]
          priority?: number
          sponsor_name?: string | null
          starts_at?: string | null
          targeting?: Json
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      cp_floating_page_catalog: {
        Row: {
          enabled: boolean
          label: string
          page_key: string
          route_path: string
          sort_order: number
        }
        Insert: {
          enabled?: boolean
          label: string
          page_key: string
          route_path: string
          sort_order?: number
        }
        Update: {
          enabled?: boolean
          label?: string
          page_key?: string
          route_path?: string
          sort_order?: number
        }
        Relationships: []
      }
      cp_group_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      cp_post_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cp_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      cp_reward_campaigns: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          max_qualifiers_per_user: number
          name: string
          qualification_message: string
          updated_at: string
          window_size: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          max_qualifiers_per_user?: number
          name: string
          qualification_message?: string
          updated_at?: string
          window_size?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          max_qualifiers_per_user?: number
          name?: string
          qualification_message?: string
          updated_at?: string
          window_size?: number
        }
        Relationships: []
      }
      cp_reward_fulfilments: {
        Row: {
          created_at: string
          id: string
          method: string
          payload: Json
          qualification_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          method: string
          payload?: Json
          qualification_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          method?: string
          payload?: Json
          qualification_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_fulfilments_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_prizes: {
        Row: {
          allocation_count: number
          allocation_window: number
          campaign_id: string
          created_at: string
          description: string | null
          emoji: string
          enabled: boolean
          fulfilment_config: Json
          fulfilment_type: string
          id: string
          image_url: string | null
          name: string
          prize_type: string
          qualification_label: string
          sort_order: number
          updated_at: string
          value: number
        }
        Insert: {
          allocation_count?: number
          allocation_window?: number
          campaign_id: string
          created_at?: string
          description?: string | null
          emoji?: string
          enabled?: boolean
          fulfilment_config?: Json
          fulfilment_type?: string
          id?: string
          image_url?: string | null
          name: string
          prize_type?: string
          qualification_label?: string
          sort_order?: number
          updated_at?: string
          value?: number
        }
        Update: {
          allocation_count?: number
          allocation_window?: number
          campaign_id?: string
          created_at?: string
          description?: string | null
          emoji?: string
          enabled?: boolean
          fulfilment_config?: Json
          fulfilment_type?: string
          id?: string
          image_url?: string | null
          name?: string
          prize_type?: string
          qualification_label?: string
          sort_order?: number
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_qualifications: {
        Row: {
          campaign_id: string
          created_at: string
          current_stage: number
          id: string
          prize_id: string
          spin_attempt_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          current_stage?: number
          id?: string
          prize_id: string
          spin_attempt_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          current_stage?: number
          id?: string
          prize_id?: string
          spin_attempt_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_qualifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reward_qualifications_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reward_qualifications_spin_attempt_id_fkey"
            columns: ["spin_attempt_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_spin_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_spin_attempts: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          prize_id: string
          spin_number: number
          user_id: string
          window_no: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          prize_id: string
          spin_number: number
          user_id: string
          window_no: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          prize_id?: string
          spin_number?: number
          user_id?: string
          window_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_spin_attempts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reward_spin_attempts_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_stage_submissions: {
        Row: {
          answers: Json
          created_at: string
          id: string
          qualification_id: string
          stage_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          qualification_id: string
          stage_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          qualification_id?: string
          stage_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_stage_submissions_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_qualifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reward_stage_submissions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_stages: {
        Row: {
          action_url: string | null
          ad_enabled: boolean
          campaign_id: string
          created_at: string
          enabled: boolean
          form_config: Json
          id: string
          instructions: string | null
          notification_body: string | null
          notification_title: string | null
          released_at: string | null
          sponsor_name: string | null
          stage_number: number
          stage_type: string
          title: string
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          ad_enabled?: boolean
          campaign_id: string
          created_at?: string
          enabled?: boolean
          form_config?: Json
          id?: string
          instructions?: string | null
          notification_body?: string | null
          notification_title?: string | null
          released_at?: string | null
          sponsor_name?: string | null
          stage_number: number
          stage_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          ad_enabled?: boolean
          campaign_id?: string
          created_at?: string
          enabled?: boolean
          form_config?: Json
          id?: string
          instructions?: string | null
          notification_body?: string | null
          notification_title?: string | null
          released_at?: string | null
          sponsor_name?: string | null
          stage_number?: number
          stage_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_stages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_wheel_slots: {
        Row: {
          campaign_id: string
          prize_id: string
          spin_number: number
          window_no: number
        }
        Insert: {
          campaign_id: string
          prize_id: string
          spin_number: number
          window_no: number
        }
        Update: {
          campaign_id?: string
          prize_id?: string
          spin_number?: number
          window_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_wheel_slots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reward_wheel_slots_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "cp_reward_prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_reward_wheel_state: {
        Row: {
          campaign_id: string
          spins_in_window: number
          total_spins: number
          updated_at: string
          window_no: number
        }
        Insert: {
          campaign_id: string
          spins_in_window?: number
          total_spins?: number
          updated_at?: string
          window_no?: number
        }
        Update: {
          campaign_id?: string
          spins_in_window?: number
          total_spins?: number
          updated_at?: string
          window_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "cp_reward_wheel_state_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "cp_reward_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_thread_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          media_path: string | null
          message_type: string
          thread_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          media_path?: string | null
          message_type?: string
          thread_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          media_path?: string | null
          message_type?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "cp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_threads: {
        Row: {
          blurb: string
          created_at: string
          id: string
          kind: string
          other_alias: string
          owner_id: string
          participant_id: string | null
        }
        Insert: {
          blurb?: string
          created_at?: string
          id?: string
          kind: string
          other_alias: string
          owner_id: string
          participant_id?: string | null
        }
        Update: {
          blurb?: string
          created_at?: string
          id?: string
          kind?: string
          other_alias?: string
          owner_id?: string
          participant_id?: string | null
        }
        Relationships: []
      }
      cp_user_badges: {
        Row: {
          awarded_at: string
          badge_key: string
          badge_label: string
          id: string
          source_cycle_id: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_key: string
          badge_label: string
          id?: string
          source_cycle_id?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_key?: string
          badge_label?: string
          id?: string
          source_cycle_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_user_badges_source_cycle_id_fkey"
            columns: ["source_cycle_id"]
            isOneToOne: false
            referencedRelation: "cp_activity_winner_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      crush_admin_config: {
        Row: {
          ad_every_swipes: number
          ad_same_frame: boolean
          enabled: boolean
          id: boolean
          mcm_release_hour: number
          updated_at: string
          wcw_release_hour: number
        }
        Insert: {
          ad_every_swipes?: number
          ad_same_frame?: boolean
          enabled?: boolean
          id?: boolean
          mcm_release_hour?: number
          updated_at?: string
          wcw_release_hour?: number
        }
        Update: {
          ad_every_swipes?: number
          ad_same_frame?: boolean
          enabled?: boolean
          id?: boolean
          mcm_release_hour?: number
          updated_at?: string
          wcw_release_hour?: number
        }
        Relationships: []
      }
      crush_badges: {
        Row: {
          award_count: number
          created_at: string
          id: string
          kind: string
          latest_week: string
          updated_at: string
          user_id: string
        }
        Insert: {
          award_count?: number
          created_at?: string
          id?: string
          kind: string
          latest_week: string
          updated_at?: string
          user_id: string
        }
        Update: {
          award_count?: number
          created_at?: string
          id?: string
          kind?: string
          latest_week?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crush_comments: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          nominee_id: string
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          nominee_id: string
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          nominee_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crush_comments_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "crush_nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      crush_nominees: {
        Row: {
          blurb: string
          created_at: string
          display_name: string
          emoji: string
          id: string
          kind: string
          media_type: string
          media_url: string | null
          user_id: string | null
          week_start: string
        }
        Insert: {
          blurb?: string
          created_at?: string
          display_name: string
          emoji?: string
          id?: string
          kind: string
          media_type?: string
          media_url?: string | null
          user_id?: string | null
          week_start?: string
        }
        Update: {
          blurb?: string
          created_at?: string
          display_name?: string
          emoji?: string
          id?: string
          kind?: string
          media_type?: string
          media_url?: string | null
          user_id?: string | null
          week_start?: string
        }
        Relationships: []
      }
      crush_reactions: {
        Row: {
          created_at: string
          nominee_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nominee_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          nominee_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crush_reactions_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "crush_nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      crush_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          nominee_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          nominee_id: string
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          nominee_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crush_reports_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "crush_nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      crush_shares: {
        Row: {
          created_at: string
          nominee_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nominee_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          nominee_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crush_shares_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "crush_nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      crush_votes: {
        Row: {
          created_at: string
          nominee_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nominee_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          nominee_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crush_votes_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "crush_nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      crush_winners: {
        Row: {
          created_at: string
          display_name: string
          id: string
          kind: string
          nominee_id: string | null
          reward_bc: number
          user_id: string | null
          vip_claimed_at: string | null
          vote_count: number
          week_start: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          kind: string
          nominee_id?: string | null
          reward_bc?: number
          user_id?: string | null
          vip_claimed_at?: string | null
          vote_count?: number
          week_start: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          kind?: string
          nominee_id?: string | null
          reward_bc?: number
          user_id?: string | null
          vip_claimed_at?: string | null
          vote_count?: number
          week_start?: string
        }
        Relationships: []
      }
      daily_activity_progress: {
        Row: {
          activity_date: string
          completed_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          completed_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          completed_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          day_number: number
          enabled: boolean
          id: string
          reward_bc: number
          reward_label: string
        }
        Insert: {
          day_number: number
          enabled?: boolean
          id?: string
          reward_bc?: number
          reward_label: string
        }
        Update: {
          day_number?: number
          enabled?: boolean
          id?: string
          reward_bc?: number
          reward_label?: string
        }
        Relationships: []
      }
      dating_connections: {
        Row: {
          id: string
          matched_at: string | null
          recipient_confirmed: boolean
          recipient_decision: string | null
          recipient_id: string
          requested_at: string
          requester_confirmed: boolean
          requester_decision: string | null
          requester_id: string
          reveal_at: string | null
          status: string
        }
        Insert: {
          id?: string
          matched_at?: string | null
          recipient_confirmed?: boolean
          recipient_decision?: string | null
          recipient_id: string
          requested_at?: string
          requester_confirmed?: boolean
          requester_decision?: string | null
          requester_id: string
          reveal_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          matched_at?: string | null
          recipient_confirmed?: boolean
          recipient_decision?: string | null
          recipient_id?: string
          requested_at?: string
          requester_confirmed?: boolean
          requester_decision?: string | null
          requester_id?: string
          reveal_at?: string | null
          status?: string
        }
        Relationships: []
      }
      dating_profiles: {
        Row: {
          age: number
          bio: string
          blurred_photo_path: string | null
          children: string
          country: string
          created_at: string
          drinking: string
          education: string
          emoji: string
          enabled: boolean
          favorite_date: string
          gender: string
          height_cm: number | null
          interests: string[]
          intimacy_preference: string
          lifestyle: string[]
          location: string
          location_snapshot: string
          looking_for: string[]
          love_language: string
          name: string
          occupation: string
          panda_name_snapshot: string
          personality: string[]
          photo_path: string | null
          relationship_goal: string
          relationship_status: string
          sexual_experience: string
          smoking: string
          updated_at: string
          user_id: string
          vibe: string
          zodiac: string
        }
        Insert: {
          age: number
          bio?: string
          blurred_photo_path?: string | null
          children?: string
          country?: string
          created_at?: string
          drinking?: string
          education?: string
          emoji?: string
          enabled?: boolean
          favorite_date?: string
          gender?: string
          height_cm?: number | null
          interests?: string[]
          intimacy_preference?: string
          lifestyle?: string[]
          location?: string
          location_snapshot?: string
          looking_for?: string[]
          love_language?: string
          name: string
          occupation?: string
          panda_name_snapshot?: string
          personality?: string[]
          photo_path?: string | null
          relationship_goal?: string
          relationship_status?: string
          sexual_experience?: string
          smoking?: string
          updated_at?: string
          user_id: string
          vibe?: string
          zodiac?: string
        }
        Update: {
          age?: number
          bio?: string
          blurred_photo_path?: string | null
          children?: string
          country?: string
          created_at?: string
          drinking?: string
          education?: string
          emoji?: string
          enabled?: boolean
          favorite_date?: string
          gender?: string
          height_cm?: number | null
          interests?: string[]
          intimacy_preference?: string
          lifestyle?: string[]
          location?: string
          location_snapshot?: string
          looking_for?: string[]
          love_language?: string
          name?: string
          occupation?: string
          panda_name_snapshot?: string
          personality?: string[]
          photo_path?: string | null
          relationship_goal?: string
          relationship_status?: string
          sexual_experience?: string
          smoking?: string
          updated_at?: string
          user_id?: string
          vibe?: string
          zodiac?: string
        }
        Relationships: []
      }
      direct_message_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: string
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "cp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_blast_deliveries: {
        Row: {
          blast_id: string
          delivered_at: string
          id: string
          notification_id: string | null
          user_id: string
        }
        Insert: {
          blast_id: string
          delivered_at?: string
          id?: string
          notification_id?: string | null
          user_id: string
        }
        Update: {
          blast_id?: string
          delivered_at?: string
          id?: string
          notification_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_blast_deliveries_blast_id_fkey"
            columns: ["blast_id"]
            isOneToOne: false
            referencedRelation: "event_blasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_blast_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "cp_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      event_blast_impressions: {
        Row: {
          blast_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          blast_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          blast_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_blast_impressions_blast_id_fkey"
            columns: ["blast_id"]
            isOneToOne: false
            referencedRelation: "event_blasts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_blast_plans: {
        Row: {
          bc_price: number | null
          duration_minutes: number
          enabled: boolean
          id: string
          name: string
          price_ngn: number
          price_usd: number
          sort_order: number
          unique_reach: number
        }
        Insert: {
          bc_price?: number | null
          duration_minutes?: number
          enabled?: boolean
          id: string
          name: string
          price_ngn: number
          price_usd: number
          sort_order?: number
          unique_reach: number
        }
        Update: {
          bc_price?: number | null
          duration_minutes?: number
          enabled?: boolean
          id?: string
          name?: string
          price_ngn?: number
          price_usd?: number
          sort_order?: number
          unique_reach?: number
        }
        Relationships: []
      }
      event_blasts: {
        Row: {
          bc_cost: number
          bonus_percent: number
          created_at: string
          ends_at: string | null
          event_id: string
          id: string
          notification_capacity: number
          notification_sent: number
          notification_target: number
          payment_method: string
          plan_id: string | null
          price_usd: number
          purchaser_id: string
          reach_target: number | null
          started_at: string
          status: string
          target_area: string | null
          target_city: string | null
          target_country: string | null
          target_scope: string
          target_state: string | null
          unique_reach: number
        }
        Insert: {
          bc_cost?: number
          bonus_percent?: number
          created_at?: string
          ends_at?: string | null
          event_id: string
          id?: string
          notification_capacity?: number
          notification_sent?: number
          notification_target?: number
          payment_method?: string
          plan_id?: string | null
          price_usd?: number
          purchaser_id: string
          reach_target?: number | null
          started_at?: string
          status?: string
          target_area?: string | null
          target_city?: string | null
          target_country?: string | null
          target_scope?: string
          target_state?: string | null
          unique_reach?: number
        }
        Update: {
          bc_cost?: number
          bonus_percent?: number
          created_at?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          notification_capacity?: number
          notification_sent?: number
          notification_target?: number
          payment_method?: string
          plan_id?: string | null
          price_usd?: number
          purchaser_id?: string
          reach_target?: number | null
          started_at?: string
          status?: string
          target_area?: string | null
          target_city?: string | null
          target_country?: string | null
          target_scope?: string
          target_state?: string | null
          unique_reach?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_blasts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_blasts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "event_blast_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address_line: string | null
          area: string | null
          category: string
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string
          duration_minutes: number
          ends_at: string | null
          entry_fee_amount: number
          entry_fee_bc: number
          entry_fee_currency: string
          id: string
          is_published: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          owner_id: string
          reach_area: string | null
          reach_city: string | null
          reach_country: string | null
          reach_scope: string
          reach_state: string | null
          starts_at: string | null
          state_province: string | null
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address_line?: string | null
          area?: string | null
          category?: string
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          ends_at?: string | null
          entry_fee_amount?: number
          entry_fee_bc?: number
          entry_fee_currency?: string
          id?: string
          is_published?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          owner_id: string
          reach_area?: string | null
          reach_city?: string | null
          reach_country?: string | null
          reach_scope?: string
          reach_state?: string | null
          starts_at?: string | null
          state_province?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address_line?: string | null
          area?: string | null
          category?: string
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          ends_at?: string | null
          entry_fee_amount?: number
          entry_fee_bc?: number
          entry_fee_currency?: string
          id?: string
          is_published?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          owner_id?: string
          reach_area?: string | null
          reach_city?: string | null
          reach_country?: string | null
          reach_scope?: string
          reach_state?: string | null
          starts_at?: string | null
          state_province?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      giveaway_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          entry_id: string
          id: string
          slot: number
          started_at: string | null
          status: string
          verification_ref: string | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          entry_id: string
          id?: string
          slot: number
          started_at?: string | null
          status?: string
          verification_ref?: string | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          slot?: number
          started_at?: string | null
          status?: string
          verification_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "giveaway_challenge_progress_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "giveaway_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaway_entries: {
        Row: {
          answers: Json
          contact_method: string
          contact_value: string
          created_at: string
          draw: string
          giveaway_id: string | null
          id: string
          qualified: boolean
          qualified_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          contact_method: string
          contact_value: string
          created_at?: string
          draw: string
          giveaway_id?: string | null
          id?: string
          qualified?: boolean
          qualified_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          contact_method?: string
          contact_value?: string
          created_at?: string
          draw?: string
          giveaway_id?: string | null
          id?: string
          qualified?: boolean
          qualified_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_play_rtdn_events: {
        Row: {
          event_time: string | null
          message_id: string
          received_at: string
        }
        Insert: {
          event_time?: string | null
          message_id: string
          received_at?: string
        }
        Update: {
          event_time?: string | null
          message_id?: string
          received_at?: string
        }
        Relationships: []
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_kick_votes: {
        Row: {
          created_at: string
          group_id: string
          target_user_id: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          target_user_id: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          target_user_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_kick_votes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          left_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_settings: {
        Row: {
          approve_new_members: boolean
          created_at: string
          edit_group_info: string
          group_id: string
          send_messages: boolean
          updated_at: string
        }
        Insert: {
          approve_new_members?: boolean
          created_at?: string
          edit_group_info?: string
          group_id: string
          send_messages?: boolean
          updated_at?: string
        }
        Update: {
          approve_new_members?: boolean
          created_at?: string
          edit_group_info?: string
          group_id?: string
          send_messages?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          activated_at: string | null
          area: string | null
          city: string | null
          country: string | null
          created_at: string
          expires_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          state_province: string | null
          status: string
          topic: string
        }
        Insert: {
          activated_at?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          state_province?: string | null
          status?: string
          topic?: string
        }
        Update: {
          activated_at?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          state_province?: string | null
          status?: string
          topic?: string
        }
        Relationships: []
      }
      hot_seat_answers: {
        Row: {
          body: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          media_url: string | null
          question_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          media_url?: string | null
          question_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          media_url?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_break_content: {
        Row: {
          action_url: string | null
          activity_slug: string | null
          allocation_mode: string
          config: Json
          content_type: string
          created_at: string
          description: string | null
          duration_minutes: number
          enabled: boolean
          id: string
          media_url: string | null
          sort_order: number
          title: string
          updated_at: string
          water_break_number: number | null
        }
        Insert: {
          action_url?: string | null
          activity_slug?: string | null
          allocation_mode?: string
          config?: Json
          content_type: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          enabled?: boolean
          id?: string
          media_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          water_break_number?: number | null
        }
        Update: {
          action_url?: string | null
          activity_slug?: string | null
          allocation_mode?: string
          config?: Json
          content_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          enabled?: boolean
          id?: string
          media_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          water_break_number?: number | null
        }
        Relationships: []
      }
      hot_seat_break_investments: {
        Row: {
          completed_in_background: boolean
          completion_at: string | null
          content_id: string
          created_at: string
          id: string
          resolved_at: string | null
          result_bc: number | null
          return_rate: number
          risk: string
          stake_bc: number
          status: string
          user_id: string
        }
        Insert: {
          completed_in_background?: boolean
          completion_at?: string | null
          content_id: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          result_bc?: number | null
          return_rate: number
          risk: string
          stake_bc: number
          status?: string
          user_id: string
        }
        Update: {
          completed_in_background?: boolean
          completion_at?: string | null
          content_id?: string
          created_at?: string
          id?: string
          resolved_at?: string | null
          result_bc?: number | null
          return_rate?: number
          risk?: string
          stake_bc?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_break_investments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_break_content"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_break_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_break_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_break_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_break_polls: {
        Row: {
          created_at: string
          created_by: string
          enabled: boolean
          ends_at: string | null
          id: string
          options: Json
          question: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          options?: Json
          question: string
          starts_at?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          options?: Json
          question?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      hot_seat_chat: {
        Row: {
          alias: string
          body: string
          created_at: string
          host_id: string
          id: string
          is_gift: boolean
          user_id: string | null
        }
        Insert: {
          alias?: string
          body: string
          created_at?: string
          host_id: string
          id?: string
          is_gift?: boolean
          user_id?: string | null
        }
        Update: {
          alias?: string
          body?: string
          created_at?: string
          host_id?: string
          id?: string
          is_gift?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_chat_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_follows: {
        Row: {
          created_at: string
          host_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          host_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          host_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_follows_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_gift_catalog: {
        Row: {
          cost_bc: number
          effect: string
          emoji: string
          enabled: boolean
          gift_id: string
          name: string
          updated_at: string
        }
        Insert: {
          cost_bc: number
          effect: string
          emoji: string
          enabled?: boolean
          gift_id: string
          name: string
          updated_at?: string
        }
        Update: {
          cost_bc?: number
          effect?: string
          emoji?: string
          enabled?: boolean
          gift_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hot_seat_gifts: {
        Row: {
          cost_bc: number
          created_at: string
          gift_emoji: string
          gift_id: string
          gift_name: string
          host_id: string
          id: string
          user_id: string
        }
        Insert: {
          cost_bc: number
          created_at?: string
          gift_emoji: string
          gift_id: string
          gift_name: string
          host_id: string
          id?: string
          user_id: string
        }
        Update: {
          cost_bc?: number
          created_at?: string
          gift_emoji?: string
          gift_id?: string
          gift_name?: string
          host_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_gifts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_host_earnings: {
        Row: {
          created_at: string
          gross_bc: number
          host_id: string
          host_share_bc: number
          id: string
          paid_at: string | null
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          created_at?: string
          gross_bc: number
          host_id: string
          host_share_bc: number
          id?: string
          paid_at?: string | null
          source_id?: string | null
          source_type: string
          status?: string
        }
        Update: {
          created_at?: string
          gross_bc?: number
          host_id?: string
          host_share_bc?: number
          id?: string
          paid_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_host_earnings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_hosts: {
        Row: {
          alias: string
          answered_count: number
          avatar: string
          created_at: string
          cycle_enabled: boolean
          ends_at: string
          id: string
          is_active: boolean
          location: string | null
          max_hosts: number
          media_kind: string
          media_url: string | null
          pause_until: string | null
          reputation: number
          session_duration_hours: number
          started_at: string
          stream_provider: string
          topic: string | null
          viewer_count: number
        }
        Insert: {
          alias: string
          answered_count?: number
          avatar?: string
          created_at?: string
          cycle_enabled?: boolean
          ends_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          max_hosts?: number
          media_kind?: string
          media_url?: string | null
          pause_until?: string | null
          reputation?: number
          session_duration_hours?: number
          started_at?: string
          stream_provider?: string
          topic?: string | null
          viewer_count?: number
        }
        Update: {
          alias?: string
          answered_count?: number
          avatar?: string
          created_at?: string
          cycle_enabled?: boolean
          ends_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          max_hosts?: number
          media_kind?: string
          media_url?: string | null
          pause_until?: string | null
          reputation?: number
          session_duration_hours?: number
          started_at?: string
          stream_provider?: string
          topic?: string | null
          viewer_count?: number
        }
        Relationships: []
      }
      hot_seat_likes: {
        Row: {
          created_at: string
          host_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          host_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          host_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_likes_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_moderation: {
        Row: {
          action: string
          created_at: string
          created_by: string
          expires_at: string | null
          host_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          host_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          host_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_moderation_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_presence_settings: {
        Row: {
          enabled: boolean
          id: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hot_seat_provider_settings: {
        Row: {
          aws_access_key_id: string
          aws_channel_arn: string
          aws_enabled: boolean
          aws_playback_url: string
          aws_region: string
          id: boolean
          push_client_email: string
          push_enabled: boolean
          push_project_id: string
          updated_at: string
          updated_by: string | null
          youtube_api_key: string
          youtube_enabled: boolean
          zegocloud_app_id: string
          zegocloud_enabled: boolean
          zegocloud_server_url: string
        }
        Insert: {
          aws_access_key_id?: string
          aws_channel_arn?: string
          aws_enabled?: boolean
          aws_playback_url?: string
          aws_region?: string
          id?: boolean
          push_client_email?: string
          push_enabled?: boolean
          push_project_id?: string
          updated_at?: string
          updated_by?: string | null
          youtube_api_key?: string
          youtube_enabled?: boolean
          zegocloud_app_id?: string
          zegocloud_enabled?: boolean
          zegocloud_server_url?: string
        }
        Update: {
          aws_access_key_id?: string
          aws_channel_arn?: string
          aws_enabled?: boolean
          aws_playback_url?: string
          aws_region?: string
          id?: boolean
          push_client_email?: string
          push_enabled?: boolean
          push_project_id?: string
          updated_at?: string
          updated_by?: string | null
          youtube_api_key?: string
          youtube_enabled?: boolean
          zegocloud_app_id?: string
          zegocloud_enabled?: boolean
          zegocloud_server_url?: string
        }
        Relationships: []
      }
      hot_seat_question_votes: {
        Row: {
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_question_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_questions: {
        Row: {
          asker_alias: string
          body: string
          created_at: string
          host_id: string | null
          id: string
          is_priority: boolean
        }
        Insert: {
          asker_alias?: string
          body: string
          created_at?: string
          host_id?: string | null
          id?: string
          is_priority?: boolean
        }
        Update: {
          asker_alias?: string
          body?: string
          created_at?: string
          host_id?: string | null
          id?: string
          is_priority?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_questions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_queue: {
        Row: {
          bid_bc: number
          joined_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_bc?: number
          joined_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_bc?: number
          joined_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hot_seat_session_hosts: {
        Row: {
          alias: string
          avatar: string | null
          created_at: string
          host_order: number
          id: string
          is_active: boolean
          media_url: string | null
          session_id: string
        }
        Insert: {
          alias: string
          avatar?: string | null
          created_at?: string
          host_order: number
          id?: string
          is_active?: boolean
          media_url?: string | null
          session_id: string
        }
        Update: {
          alias?: string
          avatar?: string | null
          created_at?: string
          host_order?: number
          id?: string
          is_active?: boolean
          media_url?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_session_hosts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_water_break_items: {
        Row: {
          content_id: string
          duration_seconds: number
          ends_at: string
          id: string
          session_id: string
          sort_order: number
          starts_at: string
        }
        Insert: {
          content_id: string
          duration_seconds: number
          ends_at: string
          id?: string
          session_id: string
          sort_order: number
          starts_at: string
        }
        Update: {
          content_id?: string
          duration_seconds?: number
          ends_at?: string
          id?: string
          session_id?: string
          sort_order?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hot_seat_water_break_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_break_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hot_seat_water_break_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hot_seat_water_break_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hot_seat_water_break_sessions: {
        Row: {
          break_number: number
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          starts_at: string
          status: string
        }
        Insert: {
          break_number: number
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          starts_at: string
          status?: string
        }
        Update: {
          break_number?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      live_stream_viewers: {
        Row: {
          joined_at: string
          left_at: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          left_at?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          left_at?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_viewers_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          description: string
          ended_at: string | null
          host_id: string
          id: string
          started_at: string | null
          status: string
          stream_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          ended_at?: string | null
          host_id: string
          id?: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          title?: string
        }
        Relationships: []
      }
      music_time_sessions: {
        Row: {
          artist: string | null
          artwork_url: string | null
          ended_at: string | null
          external_id: string | null
          id: string
          provider: string
          started_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          artist?: string | null
          artwork_url?: string | null
          ended_at?: string | null
          external_id?: string | null
          id?: string
          provider: string
          started_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          artist?: string | null
          artwork_url?: string | null
          ended_at?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          started_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      native_store_account_bindings: {
        Row: {
          apple_app_account_token: string | null
          created_at: string
          google_obfuscated_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_app_account_token?: string | null
          created_at?: string
          google_obfuscated_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_app_account_token?: string | null
          created_at?: string
          google_obfuscated_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      native_store_transactions: {
        Row: {
          created_at: string
          environment: string | null
          expires_at: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json
          provider: string
          provider_amount_minor: number | null
          provider_currency: string | null
          provider_transaction_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: string
          item_id: string
          item_type: string
          metadata?: Json
          provider: string
          provider_amount_minor?: number | null
          provider_currency?: string | null
          provider_transaction_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json
          provider?: string
          provider_amount_minor?: number | null
          provider_currency?: string | null
          provider_transaction_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "native_store_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_settings: {
        Row: {
          apple_bundle_id: string
          apple_enabled: boolean
          apple_issuer_id: string
          apple_key_id: string
          apple_team_id: string
          google_enabled: boolean
          google_package_name: string
          google_rtdn_topic: string
          google_service_account_email: string
          id: number
          paystack_enabled: boolean
          paystack_public_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          apple_bundle_id?: string
          apple_enabled?: boolean
          apple_issuer_id?: string
          apple_key_id?: string
          apple_team_id?: string
          google_enabled?: boolean
          google_package_name?: string
          google_rtdn_topic?: string
          google_service_account_email?: string
          id?: number
          paystack_enabled?: boolean
          paystack_public_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          apple_bundle_id?: string
          apple_enabled?: boolean
          apple_issuer_id?: string
          apple_key_id?: string
          apple_team_id?: string
          google_enabled?: boolean
          google_package_name?: string
          google_rtdn_topic?: string
          google_service_account_email?: string
          id?: number
          paystack_enabled?: boolean
          paystack_public_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          item_id: string
          item_type: string
          metadata: Json
          provider: string | null
          provider_amount_minor: number | null
          provider_currency: string | null
          provider_metadata: Json
          provider_transaction_id: string | null
          reference: string
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json
          provider?: string | null
          provider_amount_minor?: number | null
          provider_currency?: string | null
          provider_metadata?: Json
          provider_transaction_id?: string | null
          reference: string
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json
          provider?: string | null
          provider_amount_minor?: number | null
          provider_currency?: string | null
          provider_metadata?: Json
          provider_transaction_id?: string | null
          reference?: string
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string
          gender: string | null
          id: string
          is_vip: boolean
          state_province: string | null
          updated_at: string
          vip_expires_at: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id: string
          is_vip?: boolean
          state_province?: string | null
          updated_at?: string
          vip_expires_at?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id?: string
          is_vip?: boolean
          state_province?: string | null
          updated_at?: string
          vip_expires_at?: string | null
        }
        Relationships: []
      }
      rewarded_ad_claims: {
        Row: {
          created_at: string
          id: string
          reward_bc: number
          surface: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_bc: number
          surface: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_bc?: number
          surface?: string
          user_id?: string
        }
        Relationships: []
      }
      rewarded_ad_sessions: {
        Row: {
          ad_id: string
          completed_at: string | null
          created_at: string
          id: string
          reward_bc: number
          started_at: string
          surface: string
          user_id: string
        }
        Insert: {
          ad_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          reward_bc?: number
          started_at?: string
          surface: string
          user_id: string
        }
        Update: {
          ad_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          reward_bc?: number
          started_at?: string
          surface?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewarded_ad_sessions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      seven_day_activity_attempts: {
        Row: {
          activity_date: string
          activity_slug: string
          attempts_used: number
          created_at: string
          extra_attempts: number
          id: string
          last_result: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_slug: string
          attempts_used?: number
          created_at?: string
          extra_attempts?: number
          id?: string
          last_result?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_slug?: string
          attempts_used?: number
          created_at?: string
          extra_attempts?: number
          id?: string
          last_result?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seven_day_activity_attempts_activity_slug_fkey"
            columns: ["activity_slug"]
            isOneToOne: false
            referencedRelation: "seven_day_activity_configs"
            referencedColumns: ["slug"]
          },
        ]
      }
      seven_day_activity_configs: {
        Row: {
          description: string
          free_attempts: number
          id: string
          is_enabled: boolean
          puzzle_bank: Json
          reward_pool: Json
          slug: string
          sort_order: number
          timer_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          description: string
          free_attempts?: number
          id?: string
          is_enabled?: boolean
          puzzle_bank?: Json
          reward_pool?: Json
          slug: string
          sort_order: number
          timer_seconds?: number
          title: string
          updated_at?: string
        }
        Update: {
          description?: string
          free_attempts?: number
          id?: string
          is_enabled?: boolean
          puzzle_bank?: Json
          reward_pool?: Json
          slug?: string
          sort_order?: number
          timer_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seven_day_activity_schedule: {
        Row: {
          activity_slug: string | null
          day_number: number
          enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_slug?: string | null
          day_number: number
          enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_slug?: string | null
          day_number?: number
          enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seven_day_activity_schedule_activity_slug_fkey"
            columns: ["activity_slug"]
            isOneToOne: false
            referencedRelation: "seven_day_activity_configs"
            referencedColumns: ["slug"]
          },
        ]
      }
      spin_claims: {
        Row: {
          created_at: string
          id: string
          prize_id: string
          prize_kind: string
          prize_title: string
          prize_value: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prize_id: string
          prize_kind: string
          prize_title: string
          prize_value?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prize_id?: string
          prize_kind?: string
          prize_title?: string
          prize_value?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      store_catalog: {
        Row: {
          android_product_id: string | null
          badge: string | null
          billing_period: string | null
          bonus_tag: string | null
          coins: number
          description: string
          enabled: boolean
          icon: string | null
          id: string
          interval: string | null
          ios_product_id: string | null
          is_best_value: boolean
          is_highlighted: boolean
          is_popular: boolean
          item_type: string
          name: string
          paystack_product_code: string | null
          perks: Json
          price_ngn: number
          price_usd: number
          updated_at: string
          vip_days: number
        }
        Insert: {
          android_product_id?: string | null
          badge?: string | null
          billing_period?: string | null
          bonus_tag?: string | null
          coins?: number
          description?: string
          enabled?: boolean
          icon?: string | null
          id: string
          interval?: string | null
          ios_product_id?: string | null
          is_best_value?: boolean
          is_highlighted?: boolean
          is_popular?: boolean
          item_type: string
          name: string
          paystack_product_code?: string | null
          perks?: Json
          price_ngn: number
          price_usd: number
          updated_at?: string
          vip_days?: number
        }
        Update: {
          android_product_id?: string | null
          badge?: string | null
          billing_period?: string | null
          bonus_tag?: string | null
          coins?: number
          description?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          interval?: string | null
          ios_product_id?: string | null
          is_best_value?: boolean
          is_highlighted?: boolean
          is_popular?: boolean
          item_type?: string
          name?: string
          paystack_product_code?: string | null
          perks?: Json
          price_ngn?: number
          price_usd?: number
          updated_at?: string
          vip_days?: number
        }
        Relationships: []
      }
      sweep_tickets: {
        Row: {
          created_at: string
          draw: string
          id: string
          prize_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          draw: string
          id?: string
          prize_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          draw?: string
          id?: string
          prize_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sweep_winners: {
        Row: {
          draw: string
          id: string
          name: string
          prize: string
          won_at: string
        }
        Insert: {
          draw: string
          id?: string
          name: string
          prize: string
          won_at?: string
        }
        Update: {
          draw?: string
          id?: string
          name?: string
          prize?: string
          won_at?: string
        }
        Relationships: []
      }
      sweepstake_prizes: {
        Row: {
          consolation_price: number
          emoji: string
          enabled: boolean
          id: string
          image_url: string
          jackpot: boolean
          label: string
          name: string
          ticket_price_bc: number
          updated_at: string
        }
        Insert: {
          consolation_price?: number
          emoji?: string
          enabled?: boolean
          id: string
          image_url?: string
          jackpot?: boolean
          label: string
          name: string
          ticket_price_bc: number
          updated_at?: string
        }
        Update: {
          consolation_price?: number
          emoji?: string
          enabled?: boolean
          id?: string
          image_url?: string
          jackpot?: boolean
          label?: string
          name?: string
          ticket_price_bc?: number
          updated_at?: string
        }
        Relationships: []
      }
      sweepstakes_config: {
        Row: {
          activity_id: string | null
          closes_at: string | null
          draw: string
          id: string
          is_active: boolean
          prize_description: string | null
          prize_name: string
          qualification_config: Json
          qualification_enabled: boolean
          selected_winner_id: string | null
          selected_winner_name: string | null
          ticket_price_bc: number
          updated_at: string
          water_break_number: number | null
          winner_mode: string
        }
        Insert: {
          activity_id?: string | null
          closes_at?: string | null
          draw: string
          id?: string
          is_active?: boolean
          prize_description?: string | null
          prize_name: string
          qualification_config?: Json
          qualification_enabled?: boolean
          selected_winner_id?: string | null
          selected_winner_name?: string | null
          ticket_price_bc?: number
          updated_at?: string
          water_break_number?: number | null
          winner_mode?: string
        }
        Update: {
          activity_id?: string | null
          closes_at?: string | null
          draw?: string
          id?: string
          is_active?: boolean
          prize_description?: string | null
          prize_name?: string
          qualification_config?: Json
          qualification_enabled?: boolean
          selected_winner_id?: string | null
          selected_winner_name?: string | null
          ticket_price_bc?: number
          updated_at?: string
          water_break_number?: number | null
          winner_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "sweepstakes_config_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_ad_placements: {
        Row: {
          created_at: string
          default_format: string
          enabled: boolean
          frequency_cap_seconds: number
          id: string
          label: string
          placement_key: string
          targeting: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_format?: string
          enabled?: boolean
          frequency_cap_seconds?: number
          id?: string
          label: string
          placement_key: string
          targeting?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_format?: string
          enabled?: boolean
          frequency_cap_seconds?: number
          id?: string
          label?: string
          placement_key?: string
          targeting?: Json
          updated_at?: string
        }
        Relationships: []
      }
      universal_ad_provider_configs: {
        Row: {
          ad_unit_id: string | null
          adapter_key: string | null
          app_id: string | null
          created_at: string
          enabled: boolean
          format: string
          frequency_cap_seconds: number
          id: string
          placement_code: string | null
          placement_id: string
          platform: string
          priority: number
          provider: string
          provider_label: string | null
          schedule_end: string | null
          schedule_start: string | null
          strategy: string
          targeting: Json
          updated_at: string
        }
        Insert: {
          ad_unit_id?: string | null
          adapter_key?: string | null
          app_id?: string | null
          created_at?: string
          enabled?: boolean
          format: string
          frequency_cap_seconds?: number
          id?: string
          placement_code?: string | null
          placement_id: string
          platform: string
          priority?: number
          provider: string
          provider_label?: string | null
          schedule_end?: string | null
          schedule_start?: string | null
          strategy?: string
          targeting?: Json
          updated_at?: string
        }
        Update: {
          ad_unit_id?: string | null
          adapter_key?: string | null
          app_id?: string | null
          created_at?: string
          enabled?: boolean
          format?: string
          frequency_cap_seconds?: number
          id?: string
          placement_code?: string | null
          placement_id?: string
          platform?: string
          priority?: number
          provider?: string
          provider_label?: string | null
          schedule_end?: string | null
          schedule_start?: string | null
          strategy?: string
          targeting?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "universal_ad_provider_configs_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "universal_ad_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_date: string
          activity_id: string
          completed_at: string | null
          reward_claimed: boolean
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_id: string
          completed_at?: string | null
          reward_claimed?: boolean
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_id?: string
          completed_at?: string | null
          reward_claimed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_app_state: {
        Row: {
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_controls: {
        Row: {
          is_banned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          is_banned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          is_banned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_rewards: {
        Row: {
          claimed_day: number | null
          last_claim_date: string | null
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_day?: number | null
          last_claim_date?: string | null
          streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_day?: number | null
          last_claim_date?: string | null
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      winner_campaigns: {
        Row: {
          activity_id: string | null
          activity_weight: number
          created_at: string
          id: string
          is_active: boolean
          mode: string
          prize: string
          scope: string
          selected_user_id: string | null
          selected_username: string | null
          updated_at: string
          xp_weight: number
        }
        Insert: {
          activity_id?: string | null
          activity_weight?: number
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          prize?: string
          scope: string
          selected_user_id?: string | null
          selected_username?: string | null
          updated_at?: string
          xp_weight?: number
        }
        Update: {
          activity_id?: string | null
          activity_weight?: number
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          prize?: string
          scope?: string
          selected_user_id?: string | null
          selected_username?: string | null
          updated_at?: string
          xp_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "winner_campaigns_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ad_campaign_report: {
        Row: {
          advertiser_name: string | null
          budget: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          completions: number | null
          currency: string | null
          end_at: string | null
          impressions: number | null
          partner_name: string | null
          pricing_model: string | null
          skips: number | null
          start_at: string | null
          status: string | null
          target_countries: string[] | null
          tracked_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_event_blast_cash_verified: {
        Args: {
          p_amount_ngn: number
          p_event_id: string
          p_plan_id: string
          p_provider_metadata?: Json
          p_provider_transaction_id?: string
          p_reference: string
          p_target_area?: string
          p_target_city?: string
          p_target_country?: string
          p_target_scope?: string
          p_target_state?: string
          p_user_id: string
        }
        Returns: Json
      }
      activate_event_entry_payment: {
        Args: {
          p_amount_ngn: number
          p_event_id: string
          p_provider_metadata?: Json
          p_provider_transaction_id?: string
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      add_crush_comment_secure: {
        Args: {
          p_attachment_type?: string
          p_attachment_url?: string
          p_body: string
          p_nominee_id: string
        }
        Returns: Json
      }
      admin_adjust_user_bc: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_attach_creative_to_campaign: {
        Args: { p_campaign_id: string; p_creative_id: string }
        Returns: boolean
      }
      admin_create_activity: {
        Args: {
          p_activity_type: string
          p_description: string
          p_reward_bc?: number
          p_title: string
        }
        Returns: string
      }
      admin_create_admin: {
        Args: { p_permissions: Json; p_user_id: string }
        Returns: Json
      }
      admin_delete_ad_creative: { Args: { p_id: string }; Returns: boolean }
      admin_delete_floating_campaign: {
        Args: { p_id: string }
        Returns: boolean
      }
      admin_delete_universal_ad_provider: {
        Args: { p_id: string }
        Returns: boolean
      }
      admin_draw_sweepstake: { Args: { p_draw: string }; Returns: Json }
      admin_end_live_stream: { Args: { p_stream_id: string }; Returns: boolean }
      admin_get_admin_permissions: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_get_admin_users: { Args: never; Returns: Json }
      admin_get_app_control_center: { Args: never; Returns: Json }
      admin_get_campaign_country_report: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      admin_get_campaign_reporting: { Args: never; Returns: Json }
      admin_get_daily_games: { Args: never; Returns: Json }
      admin_get_dashboard_overview: { Args: never; Returns: Json }
      admin_get_floating_campaign_config: { Args: never; Returns: Json }
      admin_get_hot_seat_provider_settings: { Args: never; Returns: Json }
      admin_get_hot_seat_session_hosts: {
        Args: { p_session_id: string }
        Returns: Json
      }
      admin_get_integrations: { Args: never; Returns: Json }
      admin_get_my_permissions: { Args: never; Returns: Json }
      admin_get_operations_dashboard: { Args: never; Returns: Json }
      admin_get_payment_provider_settings: { Args: never; Returns: Json }
      admin_get_permission_catalog: { Args: never; Returns: Json }
      admin_get_recent_audit: { Args: { p_limit?: number }; Returns: Json }
      admin_get_seven_day_activity_catalog: {
        Args: never
        Returns: {
          description: string
          free_attempts: number
          is_enabled: boolean
          slug: string
          sort_order: number
          timer_seconds: number
          title: string
        }[]
      }
      admin_get_seven_day_activity_schedule: {
        Args: never
        Returns: {
          activity_slug: string
          activity_title: string
          day_number: number
          enabled: boolean
          updated_at: string
        }[]
      }
      admin_get_store_catalog: {
        Args: never
        Returns: {
          android_product_id: string | null
          badge: string | null
          billing_period: string | null
          bonus_tag: string | null
          coins: number
          description: string
          enabled: boolean
          icon: string | null
          id: string
          interval: string | null
          ios_product_id: string | null
          is_best_value: boolean
          is_highlighted: boolean
          is_popular: boolean
          item_type: string
          name: string
          paystack_product_code: string | null
          perks: Json
          price_ngn: number
          price_usd: number
          updated_at: string
          vip_days: number
        }[]
        SetofOptions: {
          from: "*"
          to: "store_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_winner_config: { Args: { p_scope: string }; Returns: Json }
      admin_hot_seat_add_host: {
        Args: {
          p_alias: string
          p_avatar?: string
          p_host_order?: number
          p_media_url?: string
          p_session_id: string
        }
        Returns: Json
      }
      admin_hot_seat_break_activity_upsert: {
        Args: {
          p_activity_slug?: string
          p_break_number?: number
          p_description?: string
          p_enabled?: boolean
          p_id?: string
          p_sort_order?: number
          p_title?: string
        }
        Returns: {
          action_url: string | null
          activity_slug: string | null
          allocation_mode: string
          config: Json
          content_type: string
          created_at: string
          description: string | null
          duration_minutes: number
          enabled: boolean
          id: string
          media_url: string | null
          sort_order: number
          title: string
          updated_at: string
          water_break_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "hot_seat_break_content"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_hot_seat_break_content_delete: {
        Args: { p_id: string }
        Returns: boolean
      }
      admin_hot_seat_break_content_upsert: {
        Args: {
          p_action_url?: string
          p_content_type?: string
          p_description?: string
          p_enabled?: boolean
          p_id?: string
          p_media_url?: string
          p_sort_order?: number
          p_title?: string
        }
        Returns: {
          action_url: string | null
          activity_slug: string | null
          allocation_mode: string
          config: Json
          content_type: string
          created_at: string
          description: string | null
          duration_minutes: number
          enabled: boolean
          id: string
          media_url: string | null
          sort_order: number
          title: string
          updated_at: string
          water_break_number: number | null
        }
        SetofOptions: {
          from: "*"
          to: "hot_seat_break_content"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_hot_seat_end: { Args: { p_host_id: string }; Returns: Json }
      admin_hot_seat_moderate: {
        Args: {
          p_action: string
          p_host_id: string
          p_minutes?: number
          p_reason?: string
          p_user_id: string
        }
        Returns: {
          action: string
          created_at: string
          created_by: string
          expires_at: string | null
          host_id: string
          id: string
          reason: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "hot_seat_moderation"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_hot_seat_pause: {
        Args: { p_host_id: string; p_minutes: number }
        Returns: Json
      }
      admin_hot_seat_poll_upsert: {
        Args: {
          p_enabled?: boolean
          p_ends_at?: string
          p_options: Json
          p_question: string
          p_title: string
        }
        Returns: {
          created_at: string
          created_by: string
          enabled: boolean
          ends_at: string | null
          id: string
          options: Json
          question: string
          starts_at: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "hot_seat_break_polls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_hot_seat_remove_host: {
        Args: { p_session_host_id: string }
        Returns: Json
      }
      admin_hot_seat_resume: { Args: { p_host_id: string }; Returns: Json }
      admin_hot_seat_start: {
        Args: {
          p_alias: string
          p_duration_hours?: number
          p_location?: string
          p_max_hosts?: number
          p_media_kind?: string
          p_media_url: string
          p_provider?: string
          p_start_at?: string
          p_topic?: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar: string
          coins: number
          email: string
          id: string
          joined_date: string
          last_active: string
          platform: string
          reputation: number
          status: string
          streak: number
          username: string
        }[]
      }
      admin_moderate_confession: {
        Args: { p_id: string; p_published: boolean }
        Returns: boolean
      }
      admin_open_sweepstake: {
        Args: {
          p_draw: string
          p_duration_hours?: number
          p_prize_description: string
          p_prize_name: string
          p_ticket_price_bc: number
        }
        Returns: Json
      }
      admin_remove_admin: { Args: { p_user_id: string }; Returns: boolean }
      admin_reset_user_streak: { Args: { p_user_id: string }; Returns: Json }
      admin_save_ad_campaign: {
        Args: {
          p_advertiser_name: string
          p_budget?: number
          p_campaign_code: string
          p_campaign_name: string
          p_currency?: string
          p_end_at?: string
          p_id: string
          p_partner_id?: string
          p_pricing_model?: string
          p_start_at?: string
          p_status?: string
          p_target_countries?: string[]
        }
        Returns: {
          advertiser_name: string
          budget: number | null
          campaign_code: string
          campaign_name: string
          created_at: string
          currency: string
          end_at: string | null
          id: string
          partner_id: string | null
          partner_name: string | null
          pricing_model: string
          start_at: string | null
          status: string
          target_countries: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ad_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_save_app_control_center: {
        Args: { p_ads: Json; p_app: Json; p_crush: Json }
        Returns: Json
      }
      admin_save_circle_partner: {
        Args: {
          p_contact_email?: string
          p_contact_name?: string
          p_id: string
          p_notes?: string
          p_partner_code: string
          p_partner_name: string
          p_status?: string
        }
        Returns: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          notes: string | null
          partner_code: string
          partner_name: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "circle_partners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_save_hot_seat_provider_settings: {
        Args: {
          p_aws_access_key_id?: string
          p_aws_channel_arn?: string
          p_aws_enabled?: boolean
          p_aws_playback_url?: string
          p_aws_region?: string
          p_aws_secret_access_key?: string
          p_push_client_email?: string
          p_push_credentials_json?: string
          p_push_enabled?: boolean
          p_push_project_id?: string
          p_youtube_api_key?: string
          p_youtube_enabled?: boolean
          p_zegocloud_app_id?: string
          p_zegocloud_enabled?: boolean
          p_zegocloud_server_secret?: string
          p_zegocloud_server_url?: string
        }
        Returns: Json
      }
      admin_save_payment_provider_settings: {
        Args: {
          p_apple_bundle_id?: string
          p_apple_enabled?: boolean
          p_apple_iap_private_key?: string
          p_apple_issuer_id?: string
          p_apple_key_id?: string
          p_apple_team_id?: string
          p_google_enabled: boolean
          p_google_package_name: string
          p_google_rtdn_secret?: string
          p_google_rtdn_topic: string
          p_google_service_account_email: string
          p_google_service_account_json?: string
          p_paystack_enabled?: boolean
          p_paystack_public_key?: string
          p_paystack_secret_key?: string
        }
        Returns: Json
      }
      admin_search_winner_users: {
        Args: { p_query: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      admin_select_manual_winner: {
        Args: { p_prize: string; p_scope: string; p_user_id: string }
        Returns: Json
      }
      admin_set_ad_placement_config: {
        Args: {
          p_android_native_bridge_enabled: boolean
          p_crush_video_frequency: number
          p_daily_login_popup_banner: boolean
          p_engagement_popup_banner: boolean
          p_feed_banner_interval: number
          p_main_feed_banner: boolean
          p_seven_day_banner_enabled: boolean
          p_seven_day_playable_enabled: boolean
        }
        Returns: Json
      }
      admin_set_admin_permissions: {
        Args: { p_permissions: Json; p_user_id: string }
        Returns: Json
      }
      admin_set_daily_game: {
        Args: { p_day: number; p_enabled?: boolean; p_slug: string }
        Returns: Json
      }
      admin_set_hot_seat_ad_settings: {
        Args: {
          p_comments: boolean
          p_questions: boolean
          p_water_break: boolean
        }
        Returns: Json
      }
      admin_set_hot_seat_presence: {
        Args: { p_enabled: boolean }
        Returns: {
          enabled: boolean
          id: boolean
          message: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "hot_seat_presence_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_hotseat_presence: {
        Args: { p_enabled: boolean; p_message: string; p_title: string }
        Returns: Json
      }
      admin_set_seven_day_activity: {
        Args: {
          p_activity_slug: string
          p_day_number: number
          p_enabled?: boolean
        }
        Returns: Json
      }
      admin_set_sweep_activity: {
        Args: { p_activity_id: string; p_draw: string }
        Returns: undefined
      }
      admin_set_winner_mode:
        | {
            Args: {
              p_activity_id?: string
              p_activity_weight?: number
              p_mode: string
              p_scope: string
              p_xp_weight?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_activity_weight?: number
              p_mode: string
              p_scope: string
              p_xp_weight?: number
            }
            Returns: undefined
          }
      admin_start_live_stream: {
        Args: { p_description: string; p_stream_url: string; p_title: string }
        Returns: string
      }
      admin_toggle_user_ban: { Args: { p_user_id: string }; Returns: Json }
      admin_update_daily_game: {
        Args: {
          p_enabled: boolean
          p_free_attempts: number
          p_puzzle_bank?: Json
          p_reward_pool: Json
          p_slug: string
          p_timer_seconds: number
        }
        Returns: Json
      }
      admin_update_seven_day_activity_config: {
        Args: {
          p_enabled: boolean
          p_free_attempts: number
          p_reward_pool: Json
          p_slug: string
          p_timer_seconds: number
        }
        Returns: Json
      }
      admin_update_store_product: {
        Args: {
          p_coins: number
          p_enabled: boolean
          p_id: string
          p_is_best_value: boolean
          p_is_highlighted: boolean
          p_is_popular: boolean
          p_price_ngn: number
          p_price_usd: number
          p_vip_days: number
        }
        Returns: Json
      }
      admin_update_store_product_ids: {
        Args: {
          p_android_product_id: string
          p_id: string
          p_ios_product_id: string
        }
        Returns: {
          android_product_id: string | null
          badge: string | null
          billing_period: string | null
          bonus_tag: string | null
          coins: number
          description: string
          enabled: boolean
          icon: string | null
          id: string
          interval: string | null
          ios_product_id: string | null
          is_best_value: boolean
          is_highlighted: boolean
          is_popular: boolean
          item_type: string
          name: string
          paystack_product_code: string | null
          perks: Json
          price_ngn: number
          price_usd: number
          updated_at: string
          vip_days: number
        }
        SetofOptions: {
          from: "*"
          to: "store_catalog"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_sweepstakes_config: {
        Args: {
          p_closes_at: string
          p_id: string
          p_is_active: boolean
          p_prize_description: string
          p_prize_name: string
          p_qualification_config: Json
          p_qualification_enabled: boolean
          p_ticket_price_bc: number
          p_winner_mode: string
        }
        Returns: Json
      }
      admin_upsert_ad_creative: {
        Args: {
          p_call_to_action: string
          p_category: string
          p_description: string
          p_destination_url: string
          p_duration_seconds: number
          p_format: string
          p_headline: string
          p_id: string
          p_image_url: string
          p_placement: string
          p_poster_url: string
          p_skip_after_seconds: number
          p_sponsor: string
          p_status: string
          p_tagline: string
          p_video_url: string
        }
        Returns: string
      }
      admin_upsert_floating_campaign: {
        Args: {
          p_action_body: string
          p_action_target: string
          p_action_title: string
          p_action_type: string
          p_creative_type: string
          p_creative_url: string
          p_enabled: boolean
          p_ends_at: string
          p_fallback_icon: string
          p_frequency_cap_seconds: number
          p_id: string
          p_label: string
          p_max_clicks: number
          p_max_impressions: number
          p_max_unique_users: number
          p_name: string
          p_page_keys: string[]
          p_priority: number
          p_sponsor_name: string
          p_starts_at: string
          p_targeting: Json
        }
        Returns: {
          action_body: string | null
          action_target: string | null
          action_title: string | null
          action_type: string
          created_at: string
          created_by: string
          creative_type: string
          creative_url: string | null
          enabled: boolean
          ends_at: string | null
          fallback_icon: string
          frequency_cap_seconds: number
          id: string
          label: string
          max_clicks: number | null
          max_impressions: number | null
          max_unique_users: number | null
          name: string
          page_keys: string[]
          priority: number
          sponsor_name: string | null
          starts_at: string | null
          targeting: Json
          updated_at: string
          updated_by: string
        }
        SetofOptions: {
          from: "*"
          to: "cp_floating_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_integration: {
        Args: {
          p_enabled: boolean
          p_key: string
          p_label: string
          p_public_config?: Json
          p_secrets?: Json
        }
        Returns: Json
      }
      admin_upsert_universal_ad_placement: {
        Args: {
          p_default_format: string
          p_enabled: boolean
          p_frequency_cap_seconds: number
          p_id: string
          p_label: string
          p_placement_key: string
          p_targeting: Json
        }
        Returns: {
          created_at: string
          default_format: string
          enabled: boolean
          frequency_cap_seconds: number
          id: string
          label: string
          placement_key: string
          targeting: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "universal_ad_placements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_universal_ad_provider: {
        Args: {
          p_ad_unit_id: string
          p_adapter_key: string
          p_app_id: string
          p_enabled: boolean
          p_format: string
          p_frequency_cap_seconds: number
          p_id: string
          p_placement_code: string
          p_placement_id: string
          p_platform: string
          p_priority: number
          p_provider: string
          p_provider_label: string
          p_schedule_end: string
          p_schedule_start: string
          p_strategy: string
          p_targeting: Json
        }
        Returns: {
          ad_unit_id: string | null
          adapter_key: string | null
          app_id: string | null
          created_at: string
          enabled: boolean
          format: string
          frequency_cap_seconds: number
          id: string
          placement_code: string | null
          placement_id: string
          platform: string
          priority: number
          provider: string
          provider_label: string | null
          schedule_end: string | null
          schedule_start: string | null
          strategy: string
          targeting: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "universal_ad_provider_configs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      answer_hot_seat_question_secure: {
        Args: { p_body: string; p_question_id: string }
        Returns: string
      }
      apply_bc_delta: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: number
      }
      ask_hot_seat_question_secure: {
        Args: { p_body: string; p_host_id: string; p_priority?: boolean }
        Returns: Json
      }
      auto_close_crush_week: { Args: never; Returns: Json }
      block_user_secure: { Args: { p_user_id: string }; Returns: Json }
      buy_sweepstake_ticket_secure: { Args: { p_draw: string }; Returns: Json }
      cast_crush_vote_secure: { Args: { p_nominee_id: string }; Returns: Json }
      check_admin_request: { Args: never; Returns: undefined }
      claim_activity: {
        Args: { p_activity_id: string; p_reference_id?: string }
        Returns: Json
      }
      claim_activity_reward: {
        Args: { p_activity_id: string }
        Returns: number
      }
      claim_crush_vip_secure: { Args: { p_kind: string }; Returns: Json }
      claim_daily_reward_secure: { Args: never; Returns: Json }
      claim_rewarded_ad_secure: { Args: { p_surface: string }; Returns: Json }
      claim_spin_secure: { Args: never; Returns: Json }
      cleanup_old_activity_progress: { Args: never; Returns: undefined }
      close_crush_week_secure: { Args: never; Returns: Json }
      complete_giveaway_video_challenge: {
        Args: {
          p_challenge_id: string
          p_entry_id: string
          p_min_seconds?: number
        }
        Returns: Json
      }
      complete_rewarded_ad_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      confirm_dating_match_secure: {
        Args: { p_connection_id: string }
        Returns: Json
      }
      cp_admin_is_admin: { Args: never; Returns: boolean }
      cp_admin_list_reward_qualifications: {
        Args: { p_campaign_id: string }
        Returns: {
          created_at: string
          current_stage: number
          display_name: string
          prize_name: string
          qualification_id: string
          status: string
          user_id: string
        }[]
      }
      cp_admin_release_reward_stage: {
        Args: { p_stage_id: string }
        Returns: Json
      }
      cp_admin_reward_campaign_upsert: {
        Args: {
          p_description?: string
          p_enabled?: boolean
          p_id?: string
          p_name?: string
          p_qualification_message?: string
          p_window_size?: number
        }
        Returns: string
      }
      cp_admin_reward_prize_delete: {
        Args: { p_id: string }
        Returns: undefined
      }
      cp_admin_reward_prize_upsert: {
        Args: {
          p_allocation_count?: number
          p_allocation_window?: number
          p_campaign_id?: string
          p_description?: string
          p_emoji?: string
          p_enabled?: boolean
          p_fulfilment_config?: Json
          p_fulfilment_type?: string
          p_id?: string
          p_image_url?: string
          p_name?: string
          p_prize_type?: string
          p_qualification_label?: string
          p_sort_order?: number
          p_value?: number
        }
        Returns: string
      }
      cp_admin_reward_stage_delete: {
        Args: { p_id: string }
        Returns: undefined
      }
      cp_admin_reward_stage_upsert:
        | {
            Args: {
              p_action_url?: string
              p_ad_enabled?: boolean
              p_campaign_id?: string
              p_enabled?: boolean
              p_form_config?: Json
              p_id?: string
              p_instructions?: string
              p_sponsor_name?: string
              p_stage_number?: number
              p_stage_type?: string
              p_title?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action_url?: string
              p_ad_enabled?: boolean
              p_campaign_id?: string
              p_enabled?: boolean
              p_form_config?: Json
              p_id?: string
              p_instructions?: string
              p_notification_body?: string
              p_notification_title?: string
              p_released_at?: string
              p_sponsor_name?: string
              p_stage_number?: number
              p_stage_type?: string
              p_title?: string
            }
            Returns: string
          }
      cp_admin_select_reward_winner: {
        Args: { p_qualification_id: string }
        Returns: Json
      }
      cp_finalize_expired_winner_cycles: { Args: never; Returns: number }
      cp_finalize_winner_cycle: { Args: { p_cycle_id: string }; Returns: Json }
      cp_generate_reward_slots: {
        Args: { p_campaign_id: string; p_window_no?: number }
        Returns: undefined
      }
      cp_get_reward_status: { Args: { p_campaign_id: string }; Returns: Json }
      cp_is_admin: { Args: never; Returns: boolean }
      cp_spin_reward: { Args: { p_campaign_id: string }; Returns: Json }
      cp_start_winner_cycle: {
        Args: {
          p_activity_id: string
          p_activity_key: string
          p_activity_weight?: number
          p_completion_reward_bc?: number
          p_completion_reward_xp?: number
          p_eligibility?: Json
          p_ends_at: string
          p_entry_limit?: number
          p_manual_winner_id?: string
          p_max_attempts?: number
          p_prize: string
          p_scope: string
          p_starts_at: string
          p_title: string
          p_winner_badge?: string
          p_winner_mode?: string
          p_winner_reward_bc?: number
          p_winner_reward_xp?: number
          p_xp_weight?: number
        }
        Returns: string
      }
      cp_submit_reward_stage: {
        Args: {
          p_answers: Json
          p_qualification_id: string
          p_stage_id: string
        }
        Returns: Json
      }
      cp_submit_winner_activity: {
        Args: { p_cycle_id: string; p_metadata?: Json; p_score?: number }
        Returns: Json
      }
      create_direct_thread: {
        Args: { p_blurb?: string; p_kind?: string; p_other_user_id: string }
        Returns: Json
      }
      create_event_secure: {
        Args: {
          p_address_line?: string
          p_area?: string
          p_category?: string
          p_city?: string
          p_country?: string
          p_cover_url?: string
          p_description: string
          p_duration_minutes?: number
          p_ends_at?: string
          p_entry_fee_amount?: number
          p_entry_fee_bc?: number
          p_entry_fee_currency?: string
          p_latitude?: number
          p_location: string
          p_longitude?: number
          p_reach_area?: string
          p_reach_city?: string
          p_reach_country?: string
          p_reach_scope?: string
          p_reach_state?: string
          p_starts_at: string
          p_state_province?: string
          p_title: string
          p_venue_name?: string
        }
        Returns: Json
      }
      create_group_secure: {
        Args: {
          p_area?: string
          p_city?: string
          p_country?: string
          p_name: string
          p_state_province?: string
          p_topic: string
        }
        Returns: Json
      }
      create_post_reply_secure: {
        Args: { p_body: string; p_post_id: string }
        Returns: Json
      }
      create_post_secure: { Args: { p_body: string }; Returns: Json }
      crush_period_start:
        | { Args: never; Returns: string }
        | { Args: { p_kind: string; p_ref_date?: string }; Returns: string }
      decide_dating_match_secure: {
        Args: { p_connection_id: string; p_decision: string }
        Returns: Json
      }
      dispatch_event_blast_notifications: {
        Args: { p_blast_id: string }
        Returns: Json
      }
      fulfill_native_store_purchase_verified: {
        Args: {
          p_environment?: string
          p_expires_at?: string
          p_item_id: string
          p_item_type: string
          p_metadata?: Json
          p_provider: string
          p_provider_amount_minor?: number
          p_provider_currency?: string
          p_provider_transaction_id: string
          p_quantity?: number
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      fulfill_store_purchase_verified: {
        Args: {
          p_amount_ngn: number
          p_item_id: string
          p_item_type: string
          p_metadata?: Json
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      get_active_giveaway_config: { Args: never; Returns: Json }
      get_active_water_break: { Args: never; Returns: Json }
      get_activity_hub: { Args: never; Returns: Json }
      get_ad_runtime_config: { Args: never; Returns: Json }
      get_crush_comments: {
        Args: { p_nominee_id: string }
        Returns: {
          attachment_type: string
          attachment_url: string
          body: string
          created_at: string
          id: string
          mine: boolean
        }[]
      }
      get_crush_reactions: {
        Args: { p_nominee_id: string }
        Returns: {
          mine: boolean
          reaction: string
          reaction_count: number
        }[]
      }
      get_crush_results: {
        Args: { p_week_start?: string }
        Returns: {
          blurb: string
          display_name: string
          emoji: string
          kind: string
          media_type: string
          media_url: string
          mine: boolean
          nominee_id: string
          vote_count: number
        }[]
      }
      get_daily_reward_status: { Args: never; Returns: Json }
      get_dating_discovery_secure: {
        Args: {
          p_age_max?: number
          p_age_min?: number
          p_children?: string
          p_country?: string
          p_drinking?: string
          p_education?: string
          p_gender?: string
          p_height_max?: number
          p_height_min?: number
          p_lifestyle?: string
          p_location?: string
          p_looking_for?: string
          p_relationship_goal?: string
          p_same_country_only?: boolean
          p_smoking?: string
          p_zodiac?: string
        }
        Returns: Json
      }
      get_floating_campaign_runtime: {
        Args: { p_page_key: string }
        Returns: Json
      }
      get_giveaway_entry_state: { Args: { p_entry_id: string }; Returns: Json }
      get_group_summaries: {
        Args: {
          p_area?: string
          p_city?: string
          p_country?: string
          p_state_province?: string
        }
        Returns: {
          activated_at: string
          area: string
          city: string
          country: string
          created_at: string
          expires_at: string
          id: string
          join_pending: boolean
          member_count: number
          member_role: string
          name: string
          owner_id: string
          state_province: string
          status: string
          topic: string
        }[]
      }
      get_group_summaries_nearby: {
        Args: { p_latitude?: number; p_longitude?: number }
        Returns: {
          activated_at: string
          created_at: string
          distance_km: number
          expires_at: string
          id: string
          join_pending: boolean
          latitude: number
          longitude: number
          member_count: number
          member_role: string
          name: string
          owner_id: string
          status: string
          topic: string
        }[]
      }
      get_hot_seat_current_break: { Args: { p_host_id: string }; Returns: Json }
      get_hot_seat_question_vote_counts: {
        Args: { p_host_id: string }
        Returns: {
          question_id: string
          vote_count: number
        }[]
      }
      get_hot_seat_stats: { Args: { p_host_id: string }; Returns: Json }
      get_my_admin_status: { Args: never; Returns: boolean }
      get_my_crush_message_requests: {
        Args: never
        Returns: {
          attachment_type: string
          attachment_url: string
          body: string
          created_at: string
          id: string
          nominee_id: string
        }[]
      }
      get_my_group_memberships: {
        Args: never
        Returns: {
          group_id: string
          member_count: number
          role: string
        }[]
      }
      get_my_investment_notifications: { Args: never; Returns: Json }
      get_my_notification_count: { Args: never; Returns: number }
      get_my_notifications: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string
          title: string
        }[]
      }
      get_my_profile_gender: { Args: never; Returns: string }
      get_paystack_public_config: { Args: never; Returns: Json }
      get_pending_dating_decisions_secure: { Args: never; Returns: Json }
      get_seven_day_activities: { Args: never; Returns: Json[] }
      get_today_puzzle: { Args: never; Returns: Json }
      get_today_seven_day_activity: { Args: never; Returns: Json }
      get_universal_ad_runtime_config: { Args: never; Returns: Json }
      get_unread_notifications: { Args: never; Returns: Json }
      get_water_break_admin_config: { Args: never; Returns: Json }
      get_wcw_mcm_current_week: {
        Args: never
        Returns: {
          blurb: string
          display_name: string
          emoji: string
          id: string
          kind: string
          media_type: string
          media_url: string
          my_reaction: string
          my_vote: boolean
          reaction_count: number
          user_id: string
          vote_count: number
          week_start: string
        }[]
      }
      grant_seven_day_extra_attempt: {
        Args: { p_session_id: string; p_slug: string }
        Returns: Json
      }
      heartbeat_live_stream_secure: {
        Args: { p_stream_id: string }
        Returns: Json
      }
      hot_seat_is_live_phase: { Args: { p_host_id: string }; Returns: boolean }
      hot_seat_user_moderated: {
        Args: { p_action?: string; p_host_id: string; p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id?: string }; Returns: boolean }
      join_group: { Args: { p_group_id: string }; Returns: Json }
      join_group_secure: { Args: { p_group_id: string }; Returns: Json }
      join_hot_seat_queue_secure: { Args: { p_bid_bc: number }; Returns: Json }
      join_live_stream_secure: { Args: { p_stream_id: string }; Returns: Json }
      leave_group_secure: { Args: { p_group_id: string }; Returns: undefined }
      leave_live_stream_secure: { Args: { p_stream_id: string }; Returns: Json }
      list_live_streams_secure: {
        Args: never
        Returns: {
          description: string
          id: string
          started_at: string
          stream_url: string
          title: string
          viewer_count: number
        }[]
      }
      mark_notification_read: { Args: { p_id: string }; Returns: boolean }
      mark_notifications_read: { Args: never; Returns: undefined }
      nominate_crush_secure: {
        Args: {
          p_blurb: string
          p_cost_bc?: number
          p_emoji: string
          p_kind: string
          p_name: string
        }
        Returns: Json
      }
      open_group_secure: { Args: { p_group_id: string }; Returns: Json }
      play_daily_choice_game: {
        Args: {
          p_action?: string
          p_choice?: number
          p_hits?: number
          p_slug: string
        }
        Returns: Json
      }
      play_instant_daily_activity: { Args: { p_slug: string }; Returns: Json }
      play_lucky_card: {
        Args: { p_action?: string; p_card?: number }
        Returns: Json
      }
      play_puzzle_activity: { Args: { p_answer: string }; Returns: Json }
      play_secret_reveal: {
        Args: { p_action?: string; p_words?: Json }
        Returns: Json
      }
      play_seven_day_activity: {
        Args: { p_action?: string; p_payload?: Json; p_slug: string }
        Returns: Json
      }
      play_timed_daily_activity: {
        Args: { p_action?: string; p_slug: string }
        Returns: Json
      }
      purchase_event_blast: {
        Args: { p_bc_cost: number; p_ends_at?: string; p_event_id: string }
        Returns: string
      }
      react_to_confession_secure: {
        Args: { p_confession_id: string; p_reaction: string }
        Returns: Json
      }
      react_to_crush_secure: {
        Args: { p_nominee_id: string; p_reaction: string }
        Returns: Json
      }
      record_activity_participation: {
        Args: {
          p_activity_id: string
          p_activity_type: string
          p_points?: number
          p_reference_id?: string
        }
        Returns: Json
      }
      record_ad_event_secure:
        | {
            Args: {
              p_ad_id: string
              p_event_type: string
              p_format: string
              p_placement?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_ad_id: string
              p_country_code: string
              p_event_type: string
              p_format: string
              p_placement: string
              p_value?: number
            }
            Returns: boolean
          }
      record_floating_campaign_event: {
        Args: { p_campaign_id: string; p_event_type: string }
        Returns: boolean
      }
      refresh_user_vip_entitlement: {
        Args: { p_user_id: string }
        Returns: Json
      }
      register_dating_profile_secure: {
        Args: {
          p_age: number
          p_bio: string
          p_blurred_photo_path?: string
          p_children: string
          p_country: string
          p_drinking: string
          p_education: string
          p_emoji: string
          p_favorite_date: string
          p_gender: string
          p_height_cm: number
          p_interests: string[]
          p_intimacy_preference: string
          p_lifestyle: string[]
          p_looking_for: string[]
          p_love_language: string
          p_occupation: string
          p_personality: string[]
          p_photo_path?: string
          p_relationship_goal: string
          p_relationship_status: string
          p_sexual_experience: string
          p_smoking: string
          p_vibe: string
          p_zodiac: string
        }
        Returns: Json
      }
      report_crush_secure: {
        Args: { p_details?: string; p_nominee_id: string; p_reason: string }
        Returns: Json
      }
      request_dating_match_secure: {
        Args: { p_recipient_id: string }
        Returns: Json
      }
      request_direct_message_secure: {
        Args: { p_message?: string; p_recipient_id: string }
        Returns: Json
      }
      resolve_break_investment: {
        Args: { p_investment_id: string }
        Returns: Json
      }
      resolve_due_break_investments: { Args: never; Returns: number }
      respond_dating_match_secure: {
        Args: { p_accept: boolean; p_connection_id: string }
        Returns: Json
      }
      respond_direct_message_request_secure: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: Json
      }
      review_group_join_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: Json
      }
      save_water_break_admin_config: {
        Args: { p_payload: Json }
        Returns: Json
      }
      send_direct_message: {
        Args: { p_body: string; p_thread_id: string }
        Returns: Json
      }
      send_event_one_day_reminders: { Args: never; Returns: number }
      send_group_message_secure: {
        Args: { p_body: string; p_group_id: string }
        Returns: Json
      }
      send_hot_seat_chat_secure: {
        Args: { p_body: string; p_host_id: string }
        Returns: Json
      }
      send_hot_seat_gift: {
        Args: {
          p_cost_bc: number
          p_gift_emoji: string
          p_gift_id: string
          p_gift_name: string
          p_host_id: string
        }
        Returns: Json
      }
      send_hot_seat_gift_secure: {
        Args: { p_gift_id: string; p_host_id: string }
        Returns: Json
      }
      service_get_payment_secret: { Args: { p_name: string }; Returns: string }
      set_panda_avatar_secure: { Args: { p_avatar: string }; Returns: string }
      set_profile_gender_secure: { Args: { p_gender: string }; Returns: string }
      start_break_investment:
        | {
            Args: { p_content_id: string; p_risk: string; p_stake_bc: number }
            Returns: Json
          }
        | {
            Args: {
              p_content_id: string
              p_duration_minutes?: number
              p_risk: string
              p_stake_bc: number
            }
            Returns: Json
          }
      start_event_blast_secure: {
        Args: {
          p_event_id: string
          p_payment_method?: string
          p_plan_id: string
          p_target_area?: string
          p_target_city?: string
          p_target_country?: string
          p_target_scope?: string
          p_target_state?: string
        }
        Returns: Json
      }
      start_giveaway_challenge: {
        Args: { p_challenge_id: string; p_entry_id: string; p_slot: number }
        Returns: Json
      }
      start_giveaway_entry: {
        Args: {
          p_answers: Json
          p_contact_method: string
          p_contact_value: string
          p_draw: string
        }
        Returns: Json
      }
      start_hot_seat_water_break_session: {
        Args: { p_break_number: number; p_total_minutes?: number }
        Returns: Json
      }
      start_music_session_secure: {
        Args: {
          p_artist?: string
          p_artwork_url?: string
          p_external_id?: string
          p_provider: string
          p_title?: string
        }
        Returns: Json
      }
      start_rewarded_ad_session: {
        Args: { p_ad_id: string; p_surface: string }
        Returns: Json
      }
      stop_music_session_secure: { Args: never; Returns: Json }
      submit_confession_secure: {
        Args: { p_anonymous?: boolean; p_content: string }
        Returns: Json
      }
      submit_crush_media_secure: {
        Args: {
          p_caption?: string
          p_emoji?: string
          p_media_type: string
          p_media_url: string
        }
        Returns: Json
      }
      sync_hot_seat_cycle: { Args: never; Returns: undefined }
      sync_native_subscription_expiry: {
        Args: { p_expires_at: string; p_user_id: string }
        Returns: Json
      }
      toggle_event_rsvp_secure: { Args: { p_event_id: string }; Returns: Json }
      toggle_hot_seat_follow_secure: {
        Args: { p_host_id: string }
        Returns: Json
      }
      toggle_hot_seat_like: { Args: { p_host_id: string }; Returns: Json }
      unlock_hot_seat_media_secure: {
        Args: { p_answer_id: string }
        Returns: Json
      }
      update_group_info_secure: {
        Args: { p_group_id: string; p_name: string; p_topic: string }
        Returns: Json
      }
      update_group_settings_secure: {
        Args: {
          p_approve_new_members: boolean
          p_edit_group_info: string
          p_group_id: string
          p_send_messages: boolean
        }
        Returns: Json
      }
      vote_hot_seat_break_poll: {
        Args: { p_option_index: number; p_poll_id: string }
        Returns: Json
      }
      vote_to_kick: {
        Args: { p_group_id: string; p_target_user_id: string }
        Returns: Json
      }
      vote_water_break_poll: {
        Args: { p_option_index: number; p_poll_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
