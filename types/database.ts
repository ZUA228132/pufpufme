// Minimal Database type placeholder. You can generate full types from Supabase if needed.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          name: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string | null;
        };
      };
      schools: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          address: string | null;
          description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          school_admin_id: string | null;
          is_premium: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          city_id: string;
          name: string;
          address?: string | null;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          school_admin_id?: string | null;
          is_premium?: boolean;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          telegram_id: string;
          username: string | null;
          first_name: string | null;
          last_name: string | null;
          photo_url: string | null;
          current_school_id: string | null;
          class_name: string | null;
          is_global_admin: boolean;
          premium_until: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          telegram_id: string;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          photo_url?: string | null;
          current_school_id?: string | null;
          class_name?: string | null;
          is_global_admin?: boolean;
          premium_until?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
