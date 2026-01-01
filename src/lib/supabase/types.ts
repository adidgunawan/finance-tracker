export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      budget_monthly_amounts: {
        Row: {
          amount: number
          budget_id: string
          id: string
          month: number
          year: number
        }
        Insert: {
          amount: number
          budget_id: string
          id?: string
          month: number
          year: number
        }
        Update: {
          amount?: number
          budget_id?: string
          id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_monthly_amounts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string
          budget_type: "fixed_monthly" | "custom_monthly" | "date_range"
          created_at: string
          end_date: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          budget_type: "fixed_monthly" | "custom_monthly" | "date_range"
          created_at?: string
          end_date?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          budget_type?: "fixed_monthly" | "custom_monthly" | "date_range"
          created_at?: string
          end_date?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          type: "asset" | "liability" | "income" | "expense"
          updated_at: string
          user_id: string
          currency: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level: number
          name: string
          parent_id?: string | null
          type: "asset" | "liability" | "income" | "expense"
          updated_at?: string
          user_id: string
          currency?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          type?: "asset" | "liability" | "income" | "expense"
          updated_at?: string
          user_id?: string
          currency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          default_currency: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
            {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["id"]
          }
        ]
      }
      transaction_lines: {
        Row: {
          account_id: string
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tag_relations: {
        Row: {
          tag_id: string
          transaction_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "transaction_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tag_relations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_line_items: {
        Row: {
          id: string
          transaction_id: string
          description: string
          amount: number
          expense_account_id: string | null
          income_account_id: string | null
          quantity: number | null
          unit_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          description: string
          amount: number
          expense_account_id?: string | null
          income_account_id?: string | null
          quantity?: number | null
          unit_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          description?: string
          amount?: number
          expense_account_id?: string | null
          income_account_id?: string | null
          quantity?: number | null
          unit_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_line_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_line_items_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_line_items_income_account_id_fkey"
            columns: ["income_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_attachments: {
        Row: {
          id: string
          transaction_id: string | null
          filename: string
          mime_type: string
          file_size: number
          drive_file_id: string
          drive_web_view_link: string
          drive_download_link: string
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id?: string | null
          filename: string
          mime_type: string
          file_size: number
          drive_file_id: string
          drive_web_view_link: string
          drive_download_link: string
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string | null
          filename?: string
          mime_type?: string
          file_size?: number
          drive_file_id?: string
          drive_web_view_link?: string
          drive_download_link?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          attachment_filename: string | null
          attachment_url: string | null
          created_at: string
          currency: string | null
          description: string
          exchange_rate: number | null
          id: string
          payee_payer: string | null
          transaction_date: string
          transaction_id: string | null
          type: "income" | "expense" | "transfer"
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          attachment_filename?: string | null
          attachment_url?: string | null
          created_at?: string
          currency?: string | null
          description: string
          exchange_rate?: number | null
          id?: string
          payee_payer?: string | null
          transaction_date: string
          transaction_id?: string | null
          type: "income" | "expense" | "transfer"
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          attachment_filename?: string | null
          attachment_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          exchange_rate?: number | null
          id?: string
          payee_payer?: string | null
          transaction_date?: string
          transaction_id?: string | null
          type?: "income" | "expense" | "transfer"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_sessions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          filename: string
          parsed_data: Json
          status: "in_progress" | "completed"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          filename: string
          parsed_data: Json
          status?: "in_progress" | "completed"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          filename?: string
          parsed_data?: Json
          status?: "in_progress" | "completed"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_matches: {
        Row: {
          id: string
          session_id: string
          csv_row_index: number
          transaction_id: string | null
          match_type: "auto" | "manual" | "none"
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          csv_row_index: number
          transaction_id?: string | null
          match_type?: "auto" | "manual" | "none"
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          csv_row_index?: number
          transaction_id?: string | null
          match_type?: "auto" | "manual" | "none"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          email: string
          emailverified: boolean
          id: string
          image: string | null
          name: string
          createdat: string
          updatedat: string
        }
        Insert: {
          email: string
          emailverified: boolean
          id: string
          image?: string | null
          name: string
          createdat: string
          updatedat: string
        }
        Update: {
          email?: string
          emailverified?: boolean
          id?: string
          image?: string | null
          name?: string
          createdat?: string
          updatedat?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
