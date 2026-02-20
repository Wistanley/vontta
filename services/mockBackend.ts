import { Task, User, ActivityLog, Status, Priority, Sector, Project } from '../types';

// Mock Data
const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'Desenvolvimento' },
  { id: 's2', name: 'Design' },
  { id: 's3', name: 'Marketing' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Vontta App', sectorId: 's1' },
  { id: 'p2', name: 'Website Institucional', sectorId: 's2' },
  { id: 'p3', name: 'Campanha Q1', sectorId: 's3' },
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Ana Silva', email: 'ana@vontta.com', avatar: 'https://picsum.photos/seed/u1/200', role: 'admin', sector: 'Desenvolvimento' },
  { id: 'u2', name: 'Carlos Dev', email: 'carlos@vontta.com', avatar: 'https://picsum.photos/seed/u2/200', role: 'user', sector: 'Desenvolvimento' },
  { id: 'u3', name: 'Beatriz Design', email: 'bea@vontta.com', avatar: 'https://picsum.photos/seed/u3/200', role: 'user', sector: 'Design' },
];

// Helper for Mock Data Date
const getTodayISO = () => {
    const now = new Date();
    // Use SP Time just to align with the rest of the app, though mockBackend is technically "server"
    const brazil = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const y = brazil.getFullYear();
    const m = String(brazil.getMonth() + 1).padStart(2, '0');
    const d = String(brazil.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1', // References Vontta App
    collaboratorId: 'u2',
    sector: 'Desenvolvimento',
    plannedActivity: 'Implementar Auth',
    deliveredActivity: 'Tela de Login Finalizada',
    priority: Priority.HIGH,
    status: Status.IN_PROGRESS,
    dueDate: getTodayISO(), // Set to today for demo
    hoursDedicated: '12:30',
    notes: 'Aguardando API Key',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't2',
    projectId: 'p2', // References Website Institucional
    collaboratorId: 'u3',
    sector: 'Design',
    plannedActivity: 'Criar wireframes',
    deliveredActivity: 'Home e Sobre',
    priority: Priority.MEDIUM,
    status: Status.COMPLETED,
    dueDate: '2024-02-08',
    hoursDedicated: '08:00',
    notes: 'Aprovado pelo cliente',
    updatedAt: new Date().toISOString(),
  },
];

// In-memory simulation of a database
class MockSupabaseService {
  private tasks: Task[] = [...INITIAL_TASKS];
  private sectors: Sector[] = [...MOCK_SECTORS];
  private projects: Project[] = [...MOCK_PROJECTS];
  private users: User[] = [...MOCK_USERS]; // Initialize with mock users
  private logs: ActivityLog[] = [];
  private listeners: Array<() => void> = [];
  
  // Simulate logged in user
  public currentUser: User | null = null;

  constructor() {
    this.addLog('Sistema', 'CREATE', 'Sistema inicializado');
  }

  // Auth Simulation
  async authenticate(email: string, password: string): Promise<{ user: User | null, error: string | null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = this.users.find(u => u.email === email);
        
        if (user && (password === '123456' || password === 'demo')) {
          this.currentUser = user;
          this.notify();
          resolve({ user, error: null });
        } else {
          resolve({ user: null, error: 'Credenciais inválidas. Tente a senha: demo' });
        }
      }, 800); 
    });
  }

  login(userId: string) {
    this.currentUser = this.users.find(u => u.id === userId) || null;
    this.notify();
  }

  getUsers() {
    return [...this.users];
  }

  // Realtime Subscription Simulation
  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  // --- Data Access ---
  getTasks() { return [...this.tasks]; }
  getSectors() { return [...this.sectors]; }
  getProjects() { return [...this.projects]; }

  getLogs() {
    return [...this.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
  }

  // --- CRUD: Tasks ---
  createTask(task: Omit<Task, 'id' | 'updatedAt'>) {
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    
    // Resolve Project Name for nicer log
    const project = this.projects.find(p => p.id === task.projectId);
    this.addLog(this.currentUser?.id || 'sys', 'CREATE', `Nova tarefa criada em: ${project?.name || 'Desconhecido'}`);
    this.notify();
  }

  updateTask(id: string, updates: Partial<Task>) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tasks[index] = { ...this.tasks[index], ...updates, updatedAt: new Date().toISOString() };
      this.addLog(this.currentUser?.id || 'sys', 'UPDATE', `Tarefa atualizada: ${this.tasks[index].plannedActivity}`);
      this.notify();
    }
  }

  // New Method for "Check" functionality
  toggleTaskCompletion(id: string) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const task = this.tasks[index];
      const isCompleted = task.status === Status.COMPLETED;
      
      const newStatus = isCompleted ? Status.PENDING : Status.COMPLETED;
      // If marking as complete and no delivered activity is set, auto-fill with planned activity
      const newDelivered = !isCompleted && !task.deliveredActivity ? task.plannedActivity : task.deliveredActivity;

      this.tasks[index] = {
        ...task,
        status: newStatus,
        deliveredActivity: newDelivered,
        updatedAt: new Date().toISOString()
      };

      this.addLog(this.currentUser?.id || 'sys', 'UPDATE', `Tarefa ${isCompleted ? 'reaberta' : 'concluída'}: ${task.plannedActivity}`);
      this.notify();
    }
  }

  deleteTask(id: string) {
    const task = this.tasks.find(t => t.id === id);
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.addLog(this.currentUser?.id || 'sys', 'DELETE', `Tarefa excluída: ${task?.plannedActivity}`);
    this.notify();
  }

  // --- CRUD: Sectors ---
  createSector(name: string) {
    const newSector: Sector = { id: Math.random().toString(36).substr(2, 9), name };
    this.sectors.push(newSector);
    this.addLog(this.currentUser?.id || 'sys', 'CREATE', `Novo setor: ${name}`);
    this.notify();
  }

  deleteSector(id: string) {
    const sector = this.sectors.find(s => s.id === id);
    this.sectors = this.sectors.filter(s => s.id !== id);
    // Cascade delete projects? For now, keep simple.
    this.addLog(this.currentUser?.id || 'sys', 'DELETE', `Setor excluído: ${sector?.name}`);
    this.notify();
  }

  // --- CRUD: Projects ---
  createProject(name: string, sectorId: string) {
    const newProject: Project = { id: Math.random().toString(36).substr(2, 9), name, sectorId };
    this.projects.push(newProject);
    this.addLog(this.currentUser?.id || 'sys', 'CREATE', `Novo projeto: ${name}`);
    this.notify();
  }

  deleteProject(id: string) {
    const project = this.projects.find(p => p.id === id);
    this.projects = this.projects.filter(p => p.id !== id);
    this.addLog(this.currentUser?.id || 'sys', 'DELETE', `Projeto excluído: ${project?.name}`);
    this.notify();
  }

  // --- CRUD: Users ---
  createUser(name: string, email: string, role: 'admin'|'user', sector: string) {
     const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
        role,
        sector,
        avatar: `https://picsum.photos/seed/${Math.random()}/200`
     };
     this.users.push(newUser);
     this.addLog(this.currentUser?.id || 'sys', 'CREATE', `Novo usuário cadastrado: ${name}`);
     this.notify();
  }

  deleteUser(id: string) {
    const user = this.users.find(u => u.id === id);
    if(user) {
        this.users = this.users.filter(u => u.id !== id);
        this.addLog(this.currentUser?.id || 'sys', 'DELETE', `Usuário removido: ${user.name}`);
        this.notify();
    }
  }

  private addLog(userId: string, action: ActivityLog['action'], description: string) {
    const log: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      action,
      description,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(log);
  }

  // Helper for hours
  calculateTotalHours(collaboratorId?: string): string {
    let totalMinutes = 0;
    const targetTasks = collaboratorId 
      ? this.tasks.filter(t => t.collaboratorId === collaboratorId)
      : this.tasks;

    targetTasks.forEach(task => {
      if (!task.hoursDedicated) return;
      const [h, m] = task.hoursDedicated.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        totalMinutes += (h * 60) + m;
      }
    });

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

export const backend = new MockSupabaseService();