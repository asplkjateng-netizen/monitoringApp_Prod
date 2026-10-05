export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UnitLevel = 'ESELON_I' | 'ESELON_II' | 'ESELON_III' | 'SEKSI';
export type EmploymentStatus = 'PNS' | 'PPPK' | 'PPNPN' | 'ASN' | 'TNI' | 'POLRI';
export type UserRole = 'SUPER_ADMIN' | 'KEPALA_UNIT' | 'KEPALA_SEKSI' | 'STAF';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskPriority = 'TINGGI' | 'SEDANG' | 'RENDAH';
export type TaskStatus = 'BELUM_DIKERJAKAN' | 'ON_PROGRESS' | 'TERKENDALA' | 'SELESAI';
export type PeriodType = 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';
export type EvidenceLinkType = 'INHERIT' | 'CUSTOM';
export type TaskCategory = 'TUSI' | 'TAMBAHAN' | 'IMPROVISASI';

export interface Database {
  public: {
    Tables: {
      units: {
        Row: {
          id: string
          name: string
          code: string
          level: UnitLevel
          parent_id: string | null
          tusi_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          level: UnitLevel
          parent_id?: string | null
          tusi_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          level?: UnitLevel
          parent_id?: string | null
          tusi_type?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          nip: string
          employment_status: EmploymentStatus
          role: UserRole
          is_unit_admin: boolean
          unit_id: string
          phone_number: string | null
          wa_notify_critical: boolean
          approval_status: ApprovalStatus
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          nip: string
          employment_status: EmploymentStatus
          role?: UserRole
          is_unit_admin?: boolean
          unit_id: string
          phone_number?: string | null
          wa_notify_critical?: boolean
          approval_status?: ApprovalStatus
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          nip?: string
          employment_status?: EmploymentStatus
          role?: UserRole
          is_unit_admin?: boolean
          unit_id?: string
          phone_number?: string | null
          wa_notify_critical?: boolean
          approval_status?: ApprovalStatus
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          unit_id: string
          template_id: string | null
          title: string
          description: string | null
          category: TaskCategory
          legal_basis: string | null
          legal_basis_link: string | null
          period_type: PeriodType
          period_month: number | null
          period_year: number
          deadline: string
          critical_days_threshold: number
          status: TaskStatus
          priority: TaskPriority
          progress_pct: number
          evidence_link: string | null
          kendala_note: string | null
          completed_at: string | null
          created_by: string | null
          share_token: string
          is_public_shared: boolean
          wa_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          template_id?: string | null
          title: string
          description?: string | null
          category?: TaskCategory
          legal_basis?: string | null
          legal_basis_link?: string | null
          period_type: PeriodType
          period_month?: number | null
          period_year: number
          deadline: string
          critical_days_threshold?: number
          status?: TaskStatus
          priority?: TaskPriority
          progress_pct?: number
          evidence_link?: string | null
          kendala_note?: string | null
          completed_at?: string | null
          created_by?: string | null
          share_token?: string
          is_public_shared?: boolean
          wa_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          template_id?: string | null
          title?: string
          description?: string | null
          category?: TaskCategory
          legal_basis?: string | null
          legal_basis_link?: string | null
          period_type?: PeriodType
          period_month?: number | null
          period_year?: number
          deadline?: string
          critical_days_threshold?: number
          status?: TaskStatus
          priority?: TaskPriority
          progress_pct?: number
          evidence_link?: string | null
          kendala_note?: string | null
          completed_at?: string | null
          created_by?: string | null
          share_token?: string
          is_public_shared?: boolean
          wa_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          is_completed: boolean
          deadline: string | null
          evidence_link_type: EvidenceLinkType
          custom_evidence_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          is_completed?: boolean
          deadline?: string | null
          evidence_link_type?: EvidenceLinkType
          custom_evidence_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          is_completed?: boolean
          deadline?: string | null
          evidence_link_type?: EvidenceLinkType
          custom_evidence_link?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_pics: {
        Row: {
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
        }
      }
      task_templates: {
        Row: {
          id: string
          tusi_type: string
          title: string
          category: TaskCategory
          description: string | null
          legal_basis: string | null
          legal_basis_link: string | null
          period_type: PeriodType
          deadline_rule: string
          exact_day: number
          critical_days_threshold: number
          is_recurring: boolean
          created_by_unit: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tusi_type: string
          title: string
          category?: TaskCategory
          description?: string | null
          legal_basis?: string | null
          legal_basis_link?: string | null
          period_type: PeriodType
          deadline_rule?: string
          exact_day?: number
          critical_days_threshold?: number
          is_recurring?: boolean
          created_by_unit?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tusi_type?: string
          title?: string
          category?: TaskCategory
          description?: string | null
          legal_basis?: string | null
          legal_basis_link?: string | null
          period_type?: PeriodType
          deadline_rule?: string
          exact_day?: number
          critical_days_threshold?: number
          is_recurring?: boolean
          created_by_unit?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          action_link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          action_link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          action_link?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      task_archives: {
        Row: {
          id: string
          unit_id: string
          template_id: string | null
          title: string
          category: TaskCategory
          legal_basis: string | null
          legal_basis_link: string | null
          period_type: PeriodType
          period_month: number | null
          period_year: number
          deadline: string
          completed_at: string | null
          evidence_link: string | null
          kendala_note: string | null
          created_by_name: string | null
          pics_summary: Json
          subtasks_summary: Json
          archived_at: string
        }
        Insert: {
          id: string
          unit_id: string
          template_id?: string | null
          title: string
          category?: TaskCategory
          legal_basis?: string | null
          legal_basis_link?: string | null
          period_type: PeriodType
          period_month?: number | null
          period_year: number
          deadline: string
          completed_at?: string | null
          evidence_link?: string | null
          kendala_note?: string | null
          created_by_name?: string | null
          pics_summary?: Json
          subtasks_summary?: Json
          archived_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          template_id?: string | null
          title?: string
          category?: TaskCategory
          legal_basis?: string | null
          legal_basis_link?: string | null
          period_type?: PeriodType
          period_month?: number | null
          period_year?: number
          deadline?: string
          completed_at?: string | null
          evidence_link?: string | null
          kendala_note?: string | null
          created_by_name?: string | null
          pics_summary?: Json
          subtasks_summary?: Json
          archived_at?: string
        }
      }
    }
  }
}
