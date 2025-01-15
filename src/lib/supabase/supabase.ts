export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
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
  public: {
    Tables: {
      activities: {
        Row: {
          average_cadence: number | null
          average_speed: number | null
          average_watts: number | null
          created_at: string | null
          deleted_at: string | null
          distance: number | null
          id: number
          max_heartrate: number | null
          max_speed: number | null
          max_watts: number | null
          name: string | null
          raw_data: Json | null
          start_date: string | null
          total_elevation_gain: number | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          average_cadence?: number | null
          average_speed?: number | null
          average_watts?: number | null
          created_at?: string | null
          deleted_at?: string | null
          distance?: number | null
          id: number
          max_heartrate?: number | null
          max_speed?: number | null
          max_watts?: number | null
          name?: string | null
          raw_data?: Json | null
          start_date?: string | null
          total_elevation_gain?: number | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          average_cadence?: number | null
          average_speed?: number | null
          average_watts?: number | null
          created_at?: string | null
          deleted_at?: string | null
          distance?: number | null
          id?: number
          max_heartrate?: number | null
          max_speed?: number | null
          max_watts?: number | null
          name?: string | null
          raw_data?: Json | null
          start_date?: string | null
          total_elevation_gain?: number | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'activities_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      strava_api_daily_usage: {
        Row: {
          date: string
          non_upload_request_count: number | null
          updated_at: string | null
          upload_request_count: number | null
        }
        Insert: {
          date: string
          non_upload_request_count?: number | null
          updated_at?: string | null
          upload_request_count?: number | null
        }
        Update: {
          date?: string
          non_upload_request_count?: number | null
          updated_at?: string | null
          upload_request_count?: number | null
        }
        Relationships: []
      }
      strava_user_tokens: {
        Row: {
          access_token: string
          expires_at: string
          refresh_token: string
          strava_athlete_id: number
          user_id: string
        }
        Insert: {
          access_token: string
          expires_at: string
          refresh_token: string
          strava_athlete_id: number
          user_id: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          refresh_token?: string
          strava_athlete_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'strava_user_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'admin_users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'strava_user_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      strava_webhook_events: {
        Row: {
          aspect_type: string
          created_at: string | null
          event_time: number
          id: number
          object_id: number
          object_type: string
          owner_id: number
          processed_at: string | null
        }
        Insert: {
          aspect_type: string
          created_at?: string | null
          event_time: number
          id?: never
          object_id: number
          object_type: string
          owner_id: number
          processed_at?: string | null
        }
        Update: {
          aspect_type?: string
          created_at?: string | null
          event_time?: number
          id?: never
          object_id?: number
          object_type?: string
          owner_id?: number
          processed_at?: string | null
        }
        Relationships: []
      }
      user_capacity: {
        Row: {
          id: string
          max_users: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          max_users?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          max_users?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          district: string | null
          id: string
          name: string | null
          profile: string | null
          role: Database['public']['Enums']['user_role'] | null
          strava_connected_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          district?: string | null
          id: string
          name?: string | null
          profile?: string | null
          role?: Database['public']['Enums']['user_role'] | null
          strava_connected_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          district?: string | null
          id?: string
          name?: string | null
          profile?: string | null
          role?: Database['public']['Enums']['user_role'] | null
          strava_connected_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_users: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
      user_count: {
        Row: {
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_activity_rankings: {
        Args: {
          activity_id: string
          user_district: string
        }
        Returns: {
          city_distance_rank: number
          district_distance_rank: number
          city_elevation_rank: number
          district_elevation_rank: number
        }[]
      }
      increment_strava_api_usage: {
        Args: {
          is_upload: boolean
        }
        Returns: undefined
      }
      update_user_info: {
        Args: {
          nickname?: string
          district?: string
          profile_image_url?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: 'user' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never
