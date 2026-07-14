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
          created_at: string;
          description: string | null;
          discount_max_cents: number | null;
          discount_percent: number | null;
          ends_at: string | null;
          event_id: string | null;
          fixed_off_cents: number | null;
          id: string;
          instructions: string | null;
          internal_rules: string | null;
          name: string;
          per_user_limit: number;
          product_name: string | null;
          public_rules: string | null;
          required_badge_id: string | null;
          requires_checkin: boolean;
          requires_min_profile: boolean;
          reward_valid_hours: number;
          starts_at: string;
          status: string;
          total_available: number | null;
          updated_at: string;
        };
        Insert: {
          benefit_type: string;
          created_at?: string;
          description?: string | null;
          discount_max_cents?: number | null;
          discount_percent?: number | null;
          ends_at?: string | null;
          event_id?: string | null;
          fixed_off_cents?: number | null;
          id?: string;
          instructions?: string | null;
          internal_rules?: string | null;
          name: string;
          per_user_limit?: number;
          product_name?: string | null;
          public_rules?: string | null;
          required_badge_id?: string | null;
          requires_checkin?: boolean;
          requires_min_profile?: boolean;
          reward_valid_hours?: number;
          starts_at?: string;
          status?: string;
          total_available?: number | null;
          updated_at?: string;
        };
        Update: {
          benefit_type?: string;
          created_at?: string;
          description?: string | null;
          discount_max_cents?: number | null;
          discount_percent?: number | null;
          ends_at?: string | null;
          event_id?: string | null;
          fixed_off_cents?: number | null;
          id?: string;
          instructions?: string | null;
          internal_rules?: string | null;
          name?: string;
          per_user_limit?: number;
          product_name?: string | null;
          public_rules?: string | null;
          required_badge_id?: string | null;
          requires_checkin?: boolean;
          requires_min_profile?: boolean;
          reward_valid_hours?: number;
          starts_at?: string;
          status?: string;
          total_available?: number | null;
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
      events: {
        Row: {
          attraction: string | null;
          category: string;
          checkin_closes_at: string | null;
          checkin_enabled: boolean;
          checkin_opens_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          instructions: string | null;
          name: string;
          slug: string;
          starts_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          attraction?: string | null;
          category: string;
          checkin_closes_at?: string | null;
          checkin_enabled?: boolean;
          checkin_opens_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          instructions?: string | null;
          name: string;
          slug: string;
          starts_at: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attraction?: string | null;
          category?: string;
          checkin_closes_at?: string | null;
          checkin_enabled?: boolean;
          checkin_opens_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          instructions?: string | null;
          name?: string;
          slug?: string;
          starts_at?: string;
          status?: string;
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
          how_found_us: string | null;
          id: string;
          is_over_18: boolean;
          is_public: boolean;
          last_seen_at: string | null;
          member_since: string;
          neighborhood: string | null;
          phone_verified_at: string | null;
          show_birth_month: boolean;
          show_city: boolean;
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
          how_found_us?: string | null;
          id: string;
          is_over_18?: boolean;
          is_public?: boolean;
          last_seen_at?: string | null;
          member_since?: string;
          neighborhood?: string | null;
          phone_verified_at?: string | null;
          show_birth_month?: boolean;
          show_city?: boolean;
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
          how_found_us?: string | null;
          id?: string;
          is_over_18?: boolean;
          is_public?: boolean;
          last_seen_at?: string | null;
          member_since?: string;
          neighborhood?: string | null;
          phone_verified_at?: string | null;
          show_birth_month?: boolean;
          show_city?: boolean;
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
      admin_set_manual_badge: {
        Args: { _badge_slug: string; _enabled: boolean; _user_id: string };
        Returns: undefined;
      };
      calculate_profile_completeness: {
        Args: { _user_id: string };
        Returns: number;
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
      my_profile_completeness: { Args: never; Returns: number };
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
        "teste" | "ativa" | "pendente" | "vencida" | "cancelada" | "inadimplente" | "em_carencia";
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
