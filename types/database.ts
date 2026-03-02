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
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          website: string | null
          founded_year: number | null
          hq_country: string | null
          hq_city: string | null
          subsectors: string[]
          business_model: 'B2B' | 'B2C' | 'B2B2C' | null
          verticals: string[] | null
          employee_count_range: string | null
          is_public: boolean
          crunchbase_id: string | null
          pitchbook_id: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          website?: string | null
          founded_year?: number | null
          hq_country?: string | null
          hq_city?: string | null
          subsectors?: string[]
          business_model?: 'B2B' | 'B2C' | 'B2B2C' | null
          verticals?: string[] | null
          employee_count_range?: string | null
          is_public?: boolean
          crunchbase_id?: string | null
          pitchbook_id?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          website?: string | null
          founded_year?: number | null
          hq_country?: string | null
          hq_city?: string | null
          subsectors?: string[]
          business_model?: 'B2B' | 'B2C' | 'B2B2C' | null
          verticals?: string[] | null
          employee_count_range?: string | null
          is_public?: boolean
          crunchbase_id?: string | null
          pitchbook_id?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      funding_rounds: {
        Row: {
          id: string
          company_id: string
          round_type: string
          amount_usd: number | null
          announced_date: string
          lead_investors: string[]
          all_investors: string[]
          source_url: string | null
          source: 'crunchbase' | 'pitchbook' | 'manual'
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          round_type: string
          amount_usd?: number | null
          announced_date: string
          lead_investors?: string[]
          all_investors?: string[]
          source_url?: string | null
          source: 'crunchbase' | 'pitchbook' | 'manual'
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          round_type?: string
          amount_usd?: number | null
          announced_date?: string
          lead_investors?: string[]
          all_investors?: string[]
          source_url?: string | null
          source?: 'crunchbase' | 'pitchbook' | 'manual'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'funding_rounds_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      news_articles: {
        Row: {
          id: string
          company_id: string
          title: string
          url: string
          source: string
          published_at: string
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          url: string
          source: string
          published_at: string
          summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          url?: string
          source?: string
          published_at?: string
          summary?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'news_articles_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      social_signals: {
        Row: {
          id: string
          company_id: string
          platform: 'x' | 'reddit' | 'bluesky' | 'news'
          mention_count: number
          engagement_score: number
          sampled_at: string
        }
        Insert: {
          id?: string
          company_id: string
          platform: 'x' | 'reddit' | 'bluesky' | 'news'
          mention_count: number
          engagement_score: number
          sampled_at: string
        }
        Update: {
          id?: string
          company_id?: string
          platform?: 'x' | 'reddit' | 'bluesky' | 'news'
          mention_count?: number
          engagement_score?: number
          sampled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_signals_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      buzz_scores: {
        Row: {
          company_id: string
          score_7d: number
          score_24h: number
          score_rank: number
          updated_at: string
        }
        Insert: {
          company_id: string
          score_7d: number
          score_24h: number
          score_rank: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          score_7d?: number
          score_24h?: number
          score_rank?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'buzz_scores_company_id_fkey'
            columns: ['company_id']
            isOneToOne: true
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          subsectors: string[]
          stages: string[]
          min_amount_usd: number | null
          max_amount_usd: number | null
          geographies: string[]
          business_models: string[]
          email_digest_enabled: boolean
          digest_frequency: 'daily' | 'weekly' | null
        }
        Insert: {
          user_id: string
          subsectors?: string[]
          stages?: string[]
          min_amount_usd?: number | null
          max_amount_usd?: number | null
          geographies?: string[]
          business_models?: string[]
          email_digest_enabled?: boolean
          digest_frequency?: 'daily' | 'weekly' | null
        }
        Update: {
          user_id?: string
          subsectors?: string[]
          stages?: string[]
          min_amount_usd?: number | null
          max_amount_usd?: number | null
          geographies?: string[]
          business_models?: string[]
          email_digest_enabled?: boolean
          digest_frequency?: 'daily' | 'weekly' | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'watchlist_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
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

// Convenience type aliases
export type Company = Database['public']['Tables']['companies']['Row']
export type FundingRound = Database['public']['Tables']['funding_rounds']['Row']
export type NewsArticle = Database['public']['Tables']['news_articles']['Row']
export type SocialSignal = Database['public']['Tables']['social_signals']['Row']
export type BuzzScore = Database['public']['Tables']['buzz_scores']['Row']
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type WatchlistItem = Database['public']['Tables']['watchlist']['Row']

// Extended types with joins
export interface CompanyWithBuzz extends Company {
  buzz_scores?: BuzzScore | null
  funding_rounds?: FundingRound[]
}

export interface FundingRoundWithCompany extends FundingRound {
  companies: CompanyWithBuzz
}
