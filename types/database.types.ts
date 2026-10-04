export type UnitLevel = 'ESELON_I' | 'ESELON_II' | 'ESELON_III' | 'SEKSI';
export type EmploymentStatus = 'PNS' | 'PPPK' | 'PPNPN' | 'ASN' | 'TNI' | 'POLRI';
export type UserRole = 'SUPER_ADMIN' | 'KEPALA_UNIT' | 'KEPALA_SEKSI' | 'STAF';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskPriority = 'TINGGI' | 'SEDANG' | 'RENDAH';
export type TaskStatus = 'BELUM_DIKERJAKAN' | 'ON_PROGRESS' | 'TERKENDALA' | 'SELESAI';
export type PeriodType = 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';
export type EvidenceLinkType = 'INHERIT' | 'CUSTOM';

export interface Unit {
  id: string;
  name: string;
  code: string;
  level: UnitLevel;
  parent_id: string | null;
  tusi_type: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  nip: string;
  employment_status: EmploymentStatus;
  role: UserRole;
  is_unit_admin?: boolean;
  unit_id: string;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  action_link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface HierarchyTemplateItem {
  name: string;
  code_suffix: string;
  tusi_type: string;
}

export interface HierarchyTemplate {
  id: string;
  name: string;
  target_level: UnitLevel;
  tusi_type: string | null;
  description: string | null;
  structure: HierarchyTemplateItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  tusi_type: string;
  title: string;
  description: string | null;
  legal_basis: string | null;
  period_type: PeriodType;
  created_by_unit: string;
  created_at: string;
}

export interface Task {
  id: string;
  unit_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  legal_basis: string | null;
  period_type: PeriodType;
  period_month: number | null;
  period_year: number;
  deadline: string;
  status: TaskStatus;
  priority: task_priority_type;
  progress_pct: number;
  evidence_link: string | null;
  kendala_note: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  pics?: Profile[];
  subtasks?: Subtask[];
}

type task_priority_type = TaskPriority;

export interface TaskPic {
  id: string;
  task_id: string;
  user_id: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  evidence_link_type: EvidenceLinkType;
  custom_evidence_link: string | null;
  created_at: string;
  updated_at: string;
  pics?: Profile[];
}

export interface SubtaskPic {
  id: string;
  subtask_id: string;
  user_id: string;
}
