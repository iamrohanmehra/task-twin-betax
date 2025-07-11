export interface AppUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  created_by: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: string;
  user_id: string;
  position: 1 | 2;
  created_at: string;
}

export interface TaskWithUsers extends Task {
  creator: AppUser;
  assignee: AppUser;
}

export interface CollaboratorWithUser extends Collaborator {
  user: AppUser;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  due_date?: string;
  assigned_to: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  due_date?: string;
  completed?: boolean;
}
