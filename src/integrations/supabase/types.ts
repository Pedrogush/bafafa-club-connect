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
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          entity: string | null;
          entity_id: string | null;
          id: string;
          ip_address: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          ip_address?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          ip_address?: string | null;
        };
        Relationships: [];
      };
      badge_definitions: {
        Row: {
          auto_rule: string | null;
          created_at: string;
          description: string;
          icon: string;
          id: string;
          is_active: boolean;
          name: string;
          rule: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          auto_rule?: string | null;
          created_at?: string;
          description: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          rule?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          auto_rule?: string | null;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          rule?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          benefit_type: string;
          campaign_kind: string;
          created_at: string;
          description: string | null;
          discount_max_cents: number | null;
          discount_percent: number | null;
          ends_at: string | null;
          event_id: string | null;
          feed_priority: number;
          feed_visible: boolean;
          fixed_off_cents: number | null;
          id: string;
          instructions: string | null;
          is_pinned: boolean;
          internal_rules: string | null;
          name: string;
          per_user_limit: number;
          product_name: string | null;
          public_rules: string | null;
          required_badge_id: string | null;
          requires_checkin: boolean;
          requires_min_profile: boolean;
          requires_staff_validation: boolean;
          reward_valid_hours: number;
          starts_at: string;
          status: string;
          total_available: number | null;
          trigger_category: string | null;
          trigger_target: number;
          trigger_type: string;
          updated_at: string;
        };
        Insert: {
          benefit_type: string;
          campaign_kind?: string;
          created_at?: string;
          description?: string | null;
          discount_max_cents?: number | null;
          discount_percent?: number | null;
          ends_at?: string | null;
          event_id?: string | null;
          feed_priority?: number;
          feed_visible?: boolean;
          fixed_off_cents?: number | null;
          id?: string;
          instructions?: string | null;
          is_pinned?: boolean;
          internal_rules?: string | null;
          name: string;
          per_user_limit?: number;
          product_name?: string | null;
          public_rules?: string | null;
          required_badge_id?: string | null;
          requires_checkin?: boolean;
          requires_min_profile?: boolean;
          requires_staff_validation?: boolean;
          reward_valid_hours?: number;
          starts_at?: string;
          status?: string;
          total_available?: number | null;
          trigger_category?: string | null;
          trigger_target?: number;
          trigger_type?: string;
          updated_at?: string;
        };
        Update: {
          benefit_type?: string;
          campaign_kind?: string;
          created_at?: string;
          description?: string | null;
          discount_max_cents?: number | null;
          discount_percent?: number | null;
          ends_at?: string | null;
          event_id?: string | null;
          feed_priority?: number;
          feed_visible?: boolean;
          fixed_off_cents?: number | null;
          id?: string;
          instructions?: string | null;
          is_pinned?: boolean;
          internal_rules?: string | null;
          name?: string;
          per_user_limit?: number;
          product_name?: string | null;
          public_rules?: string | null;
          required_badge_id?: string | null;
          requires_checkin?: boolean;
          requires_min_profile?: boolean;
          requires_staff_validation?: boolean;
          reward_valid_hours?: number;
          starts_at?: string;
          status?: string;
          total_available?: number | null;
          trigger_category?: string | null;
          trigger_target?: number;
          trigger_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      checkins: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          method: string;
          notes: string | null;
          staff_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          method?: string;
          notes?: string | null;
          staff_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          method?: string;
          notes?: string | null;
          staff_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkins_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_chat_blocks: {
        Row: {
          blocked_user_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          blocked_user_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          blocked_user_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      event_chat_messages: {
        Row: {
          body: string;
          created_at: string;
          deleted_at: string | null;
          event_id: string;
          id: string;
          moderated_by: string | null;
          moderation_reason: string | null;
          reply_to: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          event_id: string;
          id?: string;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          reply_to?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string;
          id?: string;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          reply_to?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_chat_messages_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_chat_reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          message_id: string;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id: string;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_chat_reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "event_chat_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          attraction: string | null;
          category: string;
          chat_closes_at: string | null;
          chat_enabled: boolean;
          chat_opens_at: string | null;
          checkin_closes_at: string | null;
          checkin_enabled: boolean;
          geofence_radius_m: number;
          geolocation_checkin_enabled: boolean;
          checkin_opens_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          max_location_accuracy_m: number;
          instructions: string | null;
          name: string;
          slug: string;
          starts_at: string;
          status: string;
          updated_at: string;
          venue_address: string | null;
          venue_google_place_id: string | null;
          venue_id: string | null;
          venue_latitude: number | null;
          venue_longitude: number | null;
          venue_name: string | null;
        };
        Insert: {
          attraction?: string | null;
          category: string;
          chat_closes_at?: string | null;
          chat_enabled?: boolean;
          chat_opens_at?: string | null;
          checkin_closes_at?: string | null;
          checkin_enabled?: boolean;
          geofence_radius_m?: number;
          geolocation_checkin_enabled?: boolean;
          checkin_opens_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          max_location_accuracy_m?: number;
          instructions?: string | null;
          name: string;
          slug: string;
          starts_at: string;
          status?: string;
          updated_at?: string;
          venue_address?: string | null;
          venue_google_place_id?: string | null;
          venue_id?: string | null;
          venue_latitude?: number | null;
          venue_longitude?: number | null;
          venue_name?: string | null;
        };
        Update: {
          attraction?: string | null;
          category?: string;
          chat_closes_at?: string | null;
          chat_enabled?: boolean;
          chat_opens_at?: string | null;
          checkin_closes_at?: string | null;
          checkin_enabled?: boolean;
          geofence_radius_m?: number;
          geolocation_checkin_enabled?: boolean;
          checkin_opens_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          max_location_accuracy_m?: number;
          instructions?: string | null;
          name?: string;
          slug?: string;
          starts_at?: string;
          status?: string;
          updated_at?: string;
          venue_address?: string | null;
          venue_google_place_id?: string | null;
          venue_id?: string | null;
          venue_latitude?: number | null;
          venue_longitude?: number | null;
          venue_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_posts: {
        Row: {
          body: string | null;
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          is_pinned: boolean;
          post_type: string;
          priority: number;
          published_at: string | null;
          starts_at: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          is_pinned?: boolean;
          post_type?: string;
          priority?: number;
          published_at?: string | null;
          starts_at?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          is_pinned?: boolean;
          post_type?: string;
          priority?: number;
          published_at?: string | null;
          starts_at?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      otp_attempts: {
        Row: {
          created_at: string;
          id: string;
          ip_address: string | null;
          kind: string;
          phone: string;
          succeeded: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          kind: string;
          phone: string;
          succeeded?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          kind?: string;
          phone?: string;
          succeeded?: boolean;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          benefits: Json;
          billing_period: string;
          code: Database["public"]["Enums"]["plan_code"];
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          name: string;
          price_cents: number;
          sort_order: number;
          tagline: string | null;
          updated_at: string;
        };
        Insert: {
          benefits?: Json;
          billing_period?: string;
          code: Database["public"]["Enums"]["plan_code"];
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name: string;
          price_cents?: number;
          sort_order?: number;
          tagline?: string | null;
          updated_at?: string;
        };
        Update: {
          benefits?: Json;
          billing_period?: string;
          code?: Database["public"]["Enums"]["plan_code"];
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name?: string;
          price_cents?: number;
          sort_order?: number;
          tagline?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      pilot_runs: {
        Row: {
          campaign_id: string | null;
          created_at: string;
          created_by: string | null;
          customer_instructions: string | null;
          ended_at: string | null;
          event_id: string;
          expected_attendance: number;
          id: string;
          internal_notes: string | null;
          minimum_profile_percent: number;
          name: string;
          staff_ids: string[];
          started_at: string | null;
          status: string;
          target_checkins: number;
          target_redemptions: number;
          target_registrations: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          campaign_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_instructions?: string | null;
          ended_at?: string | null;
          event_id: string;
          expected_attendance?: number;
          id?: string;
          internal_notes?: string | null;
          minimum_profile_percent?: number;
          name: string;
          staff_ids?: string[];
          started_at?: string | null;
          status?: string;
          target_checkins?: number;
          target_redemptions?: number;
          target_registrations?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          campaign_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_instructions?: string | null;
          ended_at?: string | null;
          event_id?: string;
          expected_attendance?: number;
          id?: string;
          internal_notes?: string | null;
          minimum_profile_percent?: number;
          name?: string;
          staff_ids?: string[];
          started_at?: string | null;
          status?: string;
          target_checkins?: number;
          target_redemptions?: number;
          target_registrations?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pilot_runs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pilot_runs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active_title_id: string | null;
          avatar_url: string | null;
          bio: string | null;
          birth_date: string | null;
          city: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          gender_custom: string | null;
          gender_identity: string | null;
          how_found_us: string | null;
          id: string;
          is_over_18: boolean;
          is_public: boolean;
          last_seen_at: string | null;
          member_since: string;
          neighborhood: string | null;
          phone_verified_at: string | null;
          pronouns: string | null;
          show_birth_month: boolean;
          show_city: boolean;
          show_checkin_count: boolean;
          show_event_preferences: boolean;
          show_gender: boolean;
          updated_at: string;
          username: string | null;
          whatsapp: string | null;
        };
        Insert: {
          active_title_id?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          city?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          gender_custom?: string | null;
          gender_identity?: string | null;
          how_found_us?: string | null;
          id: string;
          is_over_18?: boolean;
          is_public?: boolean;
          last_seen_at?: string | null;
          member_since?: string;
          neighborhood?: string | null;
          phone_verified_at?: string | null;
          pronouns?: string | null;
          show_birth_month?: boolean;
          show_city?: boolean;
          show_checkin_count?: boolean;
          show_event_preferences?: boolean;
          show_gender?: boolean;
          updated_at?: string;
          username?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          active_title_id?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          city?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          gender_custom?: string | null;
          gender_identity?: string | null;
          how_found_us?: string | null;
          id?: string;
          is_over_18?: boolean;
          is_public?: boolean;
          last_seen_at?: string | null;
          member_since?: string;
          neighborhood?: string | null;
          phone_verified_at?: string | null;
          pronouns?: string | null;
          show_birth_month?: boolean;
          show_city?: boolean;
          show_checkin_count?: boolean;
          show_event_preferences?: boolean;
          show_gender?: boolean;
          updated_at?: string;
          username?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_active_title_fk";
            columns: ["active_title_id"];
            isOneToOne: false;
            referencedRelation: "title_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          purpose: string;
          ref_id: string | null;
          short_code: string;
          token: string;
          used_at: string | null;
          used_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          purpose: string;
          ref_id?: string | null;
          short_code: string;
          token?: string;
          used_at?: string | null;
          used_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          purpose?: string;
          ref_id?: string | null;
          short_code?: string;
          token?: string;
          used_at?: string | null;
          used_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      reward_redemptions: {
        Row: {
          id: string;
          notes: string | null;
          redeemed_at: string;
          reward_id: string;
          staff_id: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          notes?: string | null;
          redeemed_at?: string;
          reward_id: string;
          staff_id?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          notes?: string | null;
          redeemed_at?: string;
          reward_id?: string;
          staff_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: true;
            referencedRelation: "user_rewards";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          external_reference: string | null;
          id: string;
          metadata: Json;
          plan_id: string;
          source: Database["public"]["Enums"]["payment_source"];
          started_at: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          external_reference?: string | null;
          id?: string;
          metadata?: Json;
          plan_id: string;
          source?: Database["public"]["Enums"]["payment_source"];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          external_reference?: string | null;
          id?: string;
          metadata?: Json;
          plan_id?: string;
          source?: Database["public"]["Enums"]["payment_source"];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      title_definitions: {
        Row: {
          auto_rule: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          linked_badge_id: string | null;
          name: string;
          rule: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          auto_rule?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          linked_badge_id?: string | null;
          name: string;
          rule?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          auto_rule?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          linked_badge_id?: string | null;
          name?: string;
          rule?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "title_definitions_linked_badge_id_fkey";
            columns: ["linked_badge_id"];
            isOneToOne: false;
            referencedRelation: "badge_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_badges: {
        Row: {
          awarded_at: string;
          awarded_by: string | null;
          badge_id: string;
          id: string;
          is_featured: boolean;
          is_hidden: boolean;
          user_id: string;
        };
        Insert: {
          awarded_at?: string;
          awarded_by?: string | null;
          badge_id: string;
          id?: string;
          is_featured?: boolean;
          is_hidden?: boolean;
          user_id: string;
        };
        Update: {
          awarded_at?: string;
          awarded_by?: string | null;
          badge_id?: string;
          id?: string;
          is_featured?: boolean;
          is_hidden?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badge_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_consents: {
        Row: {
          accepted: boolean;
          created_at: string;
          id: string;
          ip_address: string | null;
          kind: string;
          user_agent: string | null;
          user_id: string;
          version: string;
        };
        Insert: {
          accepted: boolean;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          kind: string;
          user_agent?: string | null;
          user_id: string;
          version?: string;
        };
        Update: {
          accepted?: boolean;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          kind?: string;
          user_agent?: string | null;
          user_id?: string;
          version?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string;
          drink_preferences: string[];
          event_categories: string[];
          food_preferences: string[];
          marketing_opt_in: boolean;
          notify_email: boolean;
          notify_in_app: boolean;
          notify_push: boolean;
          notify_whatsapp: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drink_preferences?: string[];
          event_categories?: string[];
          food_preferences?: string[];
          marketing_opt_in?: boolean;
          notify_email?: boolean;
          notify_in_app?: boolean;
          notify_push?: boolean;
          notify_whatsapp?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          drink_preferences?: string[];
          event_categories?: string[];
          food_preferences?: string[];
          marketing_opt_in?: boolean;
          notify_email?: boolean;
          notify_in_app?: boolean;
          notify_push?: boolean;
          notify_whatsapp?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_rewards: {
        Row: {
          campaign_id: string;
          checkin_id: string | null;
          created_at: string;
          event_id: string | null;
          expires_at: string | null;
          granted_at: string;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          campaign_id: string;
          checkin_id?: string | null;
          created_at?: string;
          event_id?: string | null;
          expires_at?: string | null;
          granted_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          campaign_id?: string;
          checkin_id?: string | null;
          created_at?: string;
          event_id?: string | null;
          expires_at?: string | null;
          granted_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_rewards_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_rewards_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_rewards_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_titles: {
        Row: {
          awarded_at: string;
          id: string;
          title_id: string;
          user_id: string;
        };
        Insert: {
          awarded_at?: string;
          id?: string;
          title_id: string;
          user_id: string;
        };
        Update: {
          awarded_at?: string;
          id?: string;
          title_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_titles_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "title_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    security_controls: {
      Row: {
        category: string;
        completed: boolean;
        control_key: string;
        created_at: string;
        description: string;
        evidence: string | null;
        label: string;
        notes: string | null;
        required: boolean;
        reviewed_at: string | null;
        reviewed_by: string | null;
        updated_at: string;
      };
      Insert: {
        category: string;
        completed?: boolean;
        control_key: string;
        created_at?: string;
        description: string;
        evidence?: string | null;
        label: string;
        notes?: string | null;
        required?: boolean;
        reviewed_at?: string | null;
        reviewed_by?: string | null;
        updated_at?: string;
      };
      Update: {
        category?: string;
        completed?: boolean;
        control_key?: string;
        created_at?: string;
        description?: string;
        evidence?: string | null;
        label?: string;
        notes?: string | null;
        required?: boolean;
        reviewed_at?: string | null;
        reviewed_by?: string | null;
        updated_at?: string;
      };
      Relationships: [];
    };
    security_events: {
      Row: {
        actor_id: string | null;
        category: string;
        created_at: string;
        details: Json;
        entity: string | null;
        entity_id: string | null;
        event_key: string;
        id: string;
        occurred_at: string;
        resolution_note: string | null;
        resolved_at: string | null;
        resolved_by: string | null;
        severity: string;
        target_user_id: string | null;
        title: string;
      };
      Insert: {
        actor_id?: string | null;
        category: string;
        created_at?: string;
        details?: Json;
        entity?: string | null;
        entity_id?: string | null;
        event_key: string;
        id?: string;
        occurred_at?: string;
        resolution_note?: string | null;
        resolved_at?: string | null;
        resolved_by?: string | null;
        severity: string;
        target_user_id?: string | null;
        title: string;
      };
      Update: {
        actor_id?: string | null;
        category?: string;
        created_at?: string;
        details?: Json;
        entity?: string | null;
        entity_id?: string | null;
        event_key?: string;
        id?: string;
        occurred_at?: string;
        resolution_note?: string | null;
        resolved_at?: string | null;
        resolved_by?: string | null;
        severity?: string;
        target_user_id?: string | null;
        title?: string;
      };
      Relationships: [];
    };
    venues: {
      Row: {
        address: string;
        created_at: string;
        created_by: string | null;
        default_geofence_radius_m: number;
        default_max_accuracy_m: number;
        google_place_id: string | null;
        id: string;
        is_active: boolean;
        latitude: number;
        longitude: number;
        name: string;
        updated_at: string;
      };
      Insert: {
        address: string;
        created_at?: string;
        created_by?: string | null;
        default_geofence_radius_m?: number;
        default_max_accuracy_m?: number;
        google_place_id?: string | null;
        id?: string;
        is_active?: boolean;
        latitude: number;
        longitude: number;
        name: string;
        updated_at?: string;
      };
      Update: {
        address?: string;
        created_at?: string;
        created_by?: string | null;
        default_geofence_radius_m?: number;
        default_max_accuracy_m?: number;
        google_place_id?: string | null;
        id?: string;
        is_active?: boolean;
        latitude?: number;
        longitude?: number;
        name?: string;
        updated_at?: string;
      };
      Relationships: [];
    };
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          birth_month: number | null;
          city: string | null;
          display_name: string | null;
          id: string | null;
          is_public: boolean | null;
          member_since: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_month?: never;
          city?: never;
          display_name?: string | null;
          id?: string | null;
          is_public?: boolean | null;
          member_since?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_month?: never;
          city?: never;
          display_name?: string | null;
          id?: string | null;
          is_public?: boolean | null;
          member_since?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      checkin_with_geolocation: {
        Args: {
          _accuracy_m: number;
          _event_id: string;
          _latitude: number;
          _longitude: number;
        };
        Returns: Json;
      };
      my_fofoquinhas: {
        Args: never;
        Returns: {
          campaign_id: string;
          name: string;
          description: string | null;
          benefit_type: string;
          discount_percent: number | null;
          fixed_off_cents: number | null;
          product_name: string | null;
          public_rules: string | null;
          campaign_kind: string;
          trigger_type: string;
          trigger_target: number;
          progress_value: number;
          completed: boolean;
          reward_id: string | null;
          reward_status: string | null;
          reward_expires_at: string | null;
          starts_at: string;
          ends_at: string | null;
          is_pinned: boolean;
          feed_priority: number;
        }[];
      };
      admin_prune_security_events: { Args: { _days?: number }; Returns: number };
      admin_resolve_security_event: {
        Args: { _event_id: string; _resolution_note?: string | null };
        Returns: undefined;
      };
      admin_security_snapshot: { Args: never; Returns: Json };
      admin_set_security_control: {
        Args: {
          _completed: boolean;
          _control_key: string;
          _evidence?: string | null;
          _notes?: string | null;
        };
        Returns: undefined;
      };
      admin_profile_completion_overview: {
        Args: never;
        Returns: {
          details: Json;
          percentage: number;
          user_id: string;
        }[];
      };
      admin_set_manual_badge: {
        Args: { _badge_slug: string; _enabled: boolean; _user_id: string };
        Returns: undefined;
      };
      admin_export_data: {
        Args: {
          _event_id?: string | null;
          _from?: string | null;
          _kind: string;
          _to?: string | null;
        };
        Returns: Json;
      };
      calculate_profile_completeness: {
        Args: { _user_id: string };
        Returns: number;
      };
      can_access_event_chat: {
        Args: { _event_id: string; _user_id: string };
        Returns: boolean;
      };
      create_my_qr_token: {
        Args: { _purpose: string; _ref_id?: string | null };
        Returns: {
          expires_at: string;
          short_code: string;
          token: string;
        }[];
      };
      current_user_roles: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"][];
      };
      close_event_checkin: { Args: { _event_id: string }; Returns: undefined };
      duplicate_event_with_campaigns: { Args: { _event_id: string }; Returns: string };
      delete_event_chat_message: { Args: { _message_id: string }; Returns: undefined };
      get_event_chat_feed: {
        Args: { _event_id: string; _limit?: number };
        Returns: {
          author_avatar_url: string | null;
          author_badges: Json;
          author_id: string;
          author_name: string;
          author_title: string | null;
          author_username: string | null;
          body: string;
          created_at: string;
          event_id: string;
          is_mine: boolean;
          message_id: string;
          reply_to: string | null;
        }[];
      };
      get_public_profile: { Args: { _username: string }; Returns: Json };
      grant_badge_by_slug: {
        Args: { _slug: string; _user_id: string };
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_event_chat_blocked: {
        Args: { _author: string; _viewer: string };
        Returns: boolean;
      };
      moderate_event_chat_message: {
        Args: { _message_id: string; _reason?: string | null; _restore?: boolean };
        Returns: undefined;
      };
      my_event_chat_rooms: {
        Args: never;
        Returns: {
          category: string;
          chat_closes_at: string;
          ends_at: string | null;
          event_id: string;
          event_name: string;
          image_url: string | null;
          last_message_at: string | null;
          message_count: number;
          starts_at: string;
        }[];
      };
      my_event_chat_blocks: {
        Args: never;
        Returns: {
          avatar_url: string | null;
          blocked_at: string;
          blocked_user_id: string;
          display_name: string;
          is_public: boolean;
          username: string | null;
        }[];
      };
      my_profile_completion_details: { Args: never; Returns: Json };
      my_profile_completeness: { Args: never; Returns: number };
      profile_completion_details: { Args: { _user_id: string }; Returns: Json };
      refresh_my_reward_statuses: { Args: never; Returns: number };
      sync_event_statuses: { Args: never; Returns: number };
      report_event_chat_message: {
        Args: { _details?: string | null; _message_id: string; _reason: string };
        Returns: undefined;
      };
      send_event_chat_message: {
        Args: { _body: string; _event_id: string; _reply_to?: string | null };
        Returns: string;
      };
      set_my_preferences: {
        Args: {
          _event_categories?: string[];
          _drink_preferences?: string[];
          _food_preferences?: string[];
          _notify_in_app?: boolean;
          _notify_email?: boolean;
          _notify_whatsapp?: boolean;
          _notify_push?: boolean;
          _marketing_opt_in?: boolean;
          _consent_version?: string;
        };
        Returns: undefined;
      };
      my_auth_security_status: { Args: never; Returns: Json };
      set_event_chat_block: {
        Args: { _blocked: boolean; _blocked_user_id: string };
        Returns: undefined;
      };
      redeem_reward_qr: { Args: { _token: string }; Returns: Json };
      validate_checkin_qr: {
        Args: { _event_id: string; _token: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "visitante" | "gratuito" | "premium" | "equipe" | "moderador" | "admin";
      payment_source: "demo" | "stripe" | "manual" | "pix";
      plan_code: "gratuito" | "carteirinha_mensal" | "carteirinha_anual";
      subscription_status:
        | "teste"
        | "ativa"
        | "pendente"
        | "vencida"
        | "cancelada"
        | "inadimplente"
        | "em_carencia";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["visitante", "gratuito", "premium", "equipe", "moderador", "admin"],
      payment_source: ["demo", "stripe", "manual", "pix"],
      plan_code: ["gratuito", "carteirinha_mensal", "carteirinha_anual"],
      subscription_status: [
        "teste",
        "ativa",
        "pendente",
        "vencida",
        "cancelada",
        "inadimplente",
        "em_carencia",
      ],
    },
  },
} as const;
