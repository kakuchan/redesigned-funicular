
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "conversations": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"expires_at": string,"finder_token_hash": string,"id": string,"item_id": string,"last_message_at": string,"status": string,"conversation_is_active": boolean | null
                  }
                  ComputedFields: "conversation_is_active"
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"finder_token_hash": string,"id"?: string,"item_id": string,"last_message_at"?: string,"status"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"finder_token_hash"?: string,"id"?: string,"item_id"?: string,"last_message_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "created_at": string,"id": string,"lost_mode": boolean,"name": string,"owner_id": string,"paused": boolean,"public_message": string,"tag_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lost_mode"?: boolean,"name": string,"owner_id": string,"paused"?: boolean,"public_message"?: string,"tag_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lost_mode"?: boolean,"name"?: string,"owner_id"?: string,"paused"?: boolean,"public_message"?: string,"tag_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: true
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"item_location": string | null,"latitude": number | null,"longitude": number | null,"sender": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"conversation_id": string,"created_at"?: string,"id"?: string,"item_location"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"sender": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"item_location"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"sender"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"id": string,"lot": string,"status": Database["public"]['Enums']["tag_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"lot": string,"status"?: Database["public"]['Enums']["tag_status"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lot"?: string,"status"?: Database["public"]['Enums']["tag_status"]
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "conversation_is_active":
{ Args: { "c": Omit<Database["public"]['Tables']["conversations"]['Row'], Database["public"]['Tables']["conversations"]['ComputedFields']> }; Returns: boolean
                           },
"finder_get_conversation":
{ Args: { "p_token_hash": string }; Returns: Json
                           },
"finder_reply":
{ Args: { "p_body": string,"p_token_hash": string }; Returns: {
              "conversation_id": string,"item_id": string,"item_name": string,"owner_id": string
            }[]
                           },
"finder_start_conversation":
{ Args: { "p_body": string,"p_item_location": string,"p_latitude"?: number,"p_longitude"?: number,"p_tag_id": string,"p_token_hash": string }; Returns: {
              "conversation_id": string,"item_id": string,"item_name": string,"owner_id": string
            }[]
                           },
"get_tag_public":
{ Args: { "p_tag_id": string }; Returns: {
              "item_name": string,"lost_mode": boolean,"public_message": string,"status": Database["public"]['Enums']["tag_status"]
            }[]
                           },
"owner_close_conversation":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"owner_reply":
{ Args: { "p_body": string,"p_conversation_id": string }; Returns: undefined
                           },
"register_tag":
{ Args: { "p_name": string,"p_public_message"?: string,"p_tag_id": string }; Returns: string
                           },
"release_tag":
{ Args: { "p_item_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "tag_status": "unregistered"|"active"|"suspended"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "tag_status": ["unregistered", "active", "suspended"]
          }
        }
} as const
