export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    __InternalSupabase: {
        PostgrestVersion: "14.5"
    }
    public: {
        Tables: {
            activity: {
                Row: {
                    action: string
                    actor_id: string
                    created_at: string
                    id: string
                    metadata: Json | null
                    target_id: string | null
                    target_type: string | null
                }
                Insert: {
                    action: string
                    actor_id: string
                    created_at?: string
                    id?: string
                    metadata?: Json | null
                    target_id?: string | null
                    target_type?: string | null
                }
                Update: {
                    action?: string
                    actor_id?: string
                    created_at?: string
                    id?: string
                    metadata?: Json | null
                    target_id?: string | null
                    target_type?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string
                    display_name: string | null
                    email: string | null
                    id: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string
                    display_name?: string | null
                    email?: string | null
                    id?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string
                    display_name?: string | null
                    email?: string | null
                    id?: string
                    updated_at?: string
                    user_id?: string
                }
                Relationships: []
            }
            audit_log: {
                Row: {
                    id: number
                    table_name: string
                    operation: string
                    row_id: string | null
                    user_id: string | null
                    old_data: Json | null
                    new_data: Json | null
                    changed_at: string
                }
                Insert: {
                    id?: number
                    table_name: string
                    operation: string
                    row_id?: string | null
                    user_id?: string | null
                    old_data?: Json | null
                    new_data?: Json | null
                    changed_at?: string
                }
                Update: {
                    id?: number
                    table_name?: string
                    operation?: string
                    row_id?: string | null
                    user_id?: string | null
                    old_data?: Json | null
                    new_data?: Json | null
                    changed_at?: string
                }
                Relationships: []
            }
            organizations: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            task_attachments: {
                Row: {
                    id: string
                    task_id: string
                    uploaded_by: string
                    file_name: string
                    file_size: number
                    mime_type: string | null
                    storage_path: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    task_id: string
                    uploaded_by: string
                    file_name: string
                    file_size?: number
                    mime_type?: string | null
                    storage_path: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    task_id?: string
                    uploaded_by?: string
                    file_name?: string
                    file_size?: number
                    mime_type?: string | null
                    storage_path?: string
                    created_at?: string
                }
                Relationships: []
            }
            task_comments: {
                Row: {
                    author_id: string
                    body: string
                    created_at: string
                    id: string
                    parent_comment_id: string | null
                    task_id: string
                    updated_at: string
                }
                Insert: {
                    author_id: string
                    body: string
                    created_at?: string
                    id?: string
                    parent_comment_id?: string | null
                    task_id: string
                    updated_at?: string
                }
                Update: {
                    author_id?: string
                    body?: string
                    created_at?: string
                    id?: string
                    parent_comment_id?: string | null
                    task_id?: string
                    updated_at?: string
                }
                Relationships: []
            }
            team_members: {
                Row: {
                    id: string
                    team_id: string
                    user_id: string
                    role: Database["public"]["Enums"]["app_role"]
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    user_id: string
                    role?: Database["public"]["Enums"]["app_role"]
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    user_id?: string
                    role?: Database["public"]["Enums"]["app_role"]
                    created_at?: string
                }
                Relationships: []
            }
            teams: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    created_at?: string
                }
                Relationships: []
            }
            tasks: {
                Row: {
                    assignee_id: string | null
                    created_at: string
                    created_by: string
                    description: string | null
                    description_html: string | null
                    due_date: string | null
                    id: string
                    organization_id: string | null
                    parent_task_id: string | null
                    position: number
                    priority: Database["public"]["Enums"]["task_priority"]
                    status: Database["public"]["Enums"]["task_status"]
                    title: string
                    updated_at: string
                    version: number
                }
                Insert: {
                    assignee_id?: string | null
                    created_at?: string
                    created_by: string
                    description?: string | null
                    description_html?: string | null
                    due_date?: string | null
                    id?: string
                    organization_id?: string | null
                    parent_task_id?: string | null
                    position?: number
                    priority?: Database["public"]["Enums"]["task_priority"]
                    status?: Database["public"]["Enums"]["task_status"]
                    title: string
                    updated_at?: string
                    version?: number
                }
                Update: {
                    assignee_id?: string | null
                    created_at?: string
                    created_by?: string
                    description?: string | null
                    description_html?: string | null
                    due_date?: string | null
                    id?: string
                    organization_id?: string | null
                    parent_task_id?: string | null
                    position?: number
                    priority?: Database["public"]["Enums"]["task_priority"]
                    status?: Database["public"]["Enums"]["task_status"]
                    title?: string
                    updated_at?: string
                    version?: number
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
                    role?: Database["public"]["Enums"]["app_role"]
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
            workflow_events: {
                Row: {
                    id: string
                    event_type: string
                    payload: Json
                    status: string
                    retry_count: number
                    created_at: string
                    processed_at: string | null
                }
                Insert: {
                    id?: string
                    event_type: string
                    payload?: Json
                    status?: string
                    retry_count?: number
                    created_at?: string
                    processed_at?: string | null
                }
                Update: {
                    id?: string
                    event_type?: string
                    payload?: Json
                    status?: string
                    retry_count?: number
                    created_at?: string
                    processed_at?: string | null
                }
                Relationships: []
            }
            workflow_execution_steps: {
                Row: {
                    id: string
                    execution_id: string
                    node_id: string
                    node_type: string
                    status: string
                    input_data: Json | null
                    output_data: Json | null
                    error: string | null
                    retry_count: number
                    started_at: string | null
                    completed_at: string | null
                }
                Insert: {
                    id?: string
                    execution_id: string
                    node_id: string
                    node_type: string
                    status?: string
                    input_data?: Json | null
                    output_data?: Json | null
                    error?: string | null
                    retry_count?: number
                    started_at?: string | null
                    completed_at?: string | null
                }
                Update: {
                    id?: string
                    execution_id?: string
                    node_id?: string
                    node_type?: string
                    status?: string
                    input_data?: Json | null
                    output_data?: Json | null
                    error?: string | null
                    retry_count?: number
                    started_at?: string | null
                    completed_at?: string | null
                }
                Relationships: []
            }
            workflow_executions: {
                Row: {
                    id: string
                    workflow_id: string
                    event_id: string | null
                    status: string
                    trigger_data: Json | null
                    started_at: string
                    completed_at: string | null
                    error: string | null
                }
                Insert: {
                    id?: string
                    workflow_id: string
                    event_id?: string | null
                    status?: string
                    trigger_data?: Json | null
                    started_at?: string
                    completed_at?: string | null
                    error?: string | null
                }
                Update: {
                    id?: string
                    workflow_id?: string
                    event_id?: string | null
                    status?: string
                    trigger_data?: Json | null
                    started_at?: string
                    completed_at?: string | null
                    error?: string | null
                }
                Relationships: []
            }
            workflows: {
                Row: {
                    created_at: string
                    created_by: string
                    description: string | null
                    edges: Json
                    id: string
                    is_active: boolean
                    name: string
                    nodes: Json
                    organization_id: string | null
                    trigger_event: string | null
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    created_by: string
                    description?: string | null
                    edges?: Json
                    id?: string
                    is_active?: boolean
                    name: string
                    nodes?: Json
                    organization_id?: string | null
                    trigger_event?: string | null
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    created_by?: string
                    description?: string | null
                    edges?: Json
                    id?: string
                    is_active?: boolean
                    name?: string
                    nodes?: Json
                    organization_id?: string | null
                    trigger_event?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            profiles_public: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    display_name: string | null
                    id: string | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    display_name?: string | null
                    id?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    display_name?: string | null
                    id?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
        }
        Functions: {
            has_role: {
                Args: {
                    _role: Database["public"]["Enums"]["app_role"]
                    _user_id: string
                }
                Returns: boolean
            }
            list_profiles_public: {
                Args: never
                Returns: {
                    avatar_url: string
                    display_name: string
                    user_id: string
                }[]
            }
        }
        Enums: {
            app_role: "admin" | "member" | "viewer"
            task_priority: "low" | "medium" | "high"
            task_status: "todo" | "in_progress" | "done"
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
            app_role: ["admin", "member", "viewer"],
            task_priority: ["low", "medium", "high"],
            task_status: ["todo", "in_progress", "done"],
        },
    },
} as const
