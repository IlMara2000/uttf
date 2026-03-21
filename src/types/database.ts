export type ActivityStatus = 'draft' | 'in_progress' | 'done';

export interface Profile {
  id: number; 
  created_at?: string;
  full_name: string;
  role: string;
  skills?: string[];
  avatar_url?: string;
}

export interface Activity {
  id: number;
  created_at: string;
  title: string;
  description: string;
  status: ActivityStatus;
  deadline: string | null;
  assigned_to: number | null; 
  is_public: boolean; // Gestisce la visibilità sulla Landing
  profiles?: {
    full_name: string;
  };
}

export interface MediaStorage {
  id: number;
  created_at: string;
  file_name: string;
  file_url: string;
  file_type: string;
  activity_id: number | null;
  is_social_ready: boolean;
}