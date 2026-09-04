export type UserRole = 'patient' | 'doctor';
export type VideoStatus = 'pending' | 'under_review' | 'reviewed';
export type MessageRole = 'patient' | 'assistant';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  specialty: string | null;
}

export interface PatientRecord {
  profile_id: string;
  doctor_id: string;
  date_of_birth: string | null;
  diagnosis: string;
  discharge_date: string | null;
  activity_plan: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  status: 'active' | 'summarized';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Summary {
  id: string;
  conversation_id: string;
  patient_id: string;
  activity_status: string;
  difficulty: string;
  main_concern: string;
  patient_question: string;
  summary: string;
}

export interface ActivityVideo {
  id: string;
  patient_id: string;
  activity_name: string;
  activity_date: string;
  message_to_doctor: string | null;
  storage_path: string;
  status: VideoStatus;
  conversation_id: string | null;
  summary_id: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  video_id: string;
  doctor_id: string;
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  video_id: string | null;
  is_read: boolean;
  created_at: string;
}
