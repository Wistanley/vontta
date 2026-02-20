
export enum Status {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluído',
  BLOCKED = 'Bloqueado',
}

export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica',
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'user';
  sector: string;
}

export interface Sector {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  sectorId: string;
}

export interface Task {
  id: string;
  projectId: string; // References Project ID now
  collaboratorId: string;
  sector: string; // Read-only in UI, derived from Project -> Sector
  plannedActivity: string;
  deliveredActivity: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  hoursDedicated: string; // Format HH:mm
  notes: string;
  isRecurring?: boolean;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  description: string;
  timestamp: string;
}

export interface DashboardStats {
  totalHours: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
}

export interface SystemSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
}

// --- New Types for Task Board ---

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type BoardStatus = 'TODO' | 'DOING' | 'DONE' | 'CANCELED';

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  memberIds: string[]; // Supports multiple members
  status: BoardStatus;
  subtasks: Subtask[];
  updatedAt: string;
}

// --- New Types for Chat ---

export interface ChatChannel {
  id: string;
  name: string;
  isLocked: boolean;
  lockedByUserId: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string | null; // Null if AI
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  user?: User; // Hydrated user data
}

export interface ChatState {
  // Legacy global state (optional now)
  isLocked: boolean;
  lockedByUserId: string | null;
  updatedAt: string;
}

// --- New Types for Weekly History ---

export interface WeeklyHistory {
  id: string;
  title?: string; // New field for custom name
  startDate: string;
  endDate: string;
  totalHours: string;
  tasksCompleted: number;
  tasksPending: number;
  tasks: Task[]; // Snapshot of tasks
  boardTasks: BoardTask[]; // Snapshot of board tasks
  createdAt: string;
}
