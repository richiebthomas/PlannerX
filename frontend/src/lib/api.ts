// path: src/lib/api.ts

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface User {
  id: string
  email: string
  name: string | null
  timezone: string
  theme: string
  defaultView: string
}

export interface Category {
  id: string
  userId: string
  name: string
  color: string
  icon?: string
}

export interface Event {
  id: string
  userId: string
  categoryId?: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  allDay: boolean
  isFocusBlock: boolean
  color?: string
  isRecurring: boolean
  recurrenceRule?: string
  recurrenceEnd?: string
  category?: Category
  reminders?: Reminder[]
}

export interface Task {
  id: string
  userId: string
  categoryId?: string
  goalId?: string
  parentTaskId?: string
  title: string
  description?: string
  dueDate?: string
  estimatedTime?: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  position: number
  isRecurring?: boolean
  createdAt: string
  completedAt?: string
  category?: Category
  goal?: Goal
  subtasks?: Task[]
  _count?: { subtasks: number }
}

export interface Habit {
  id: string
  userId: string
  name: string
  description?: string
  color: string
  icon?: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  targetDays: number[]
  targetCount: number
  isActive: boolean
  createdAt: string
}

export interface HabitLog {
  id: string
  userId: string
  habitId: string
  date: string
  completed: boolean
  count: number
  note?: string
  habit?: Habit
}

export interface Goal {
  id: string
  userId: string
  title: string
  description?: string
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  color?: string
  isRecurring?: boolean
  progress?: number
  completedTasks?: number
  totalTasks?: number
  tasks?: Task[]
}

export interface Note {
  id: string
  userId: string
  eventId?: string
  taskId?: string
  goalId?: string
  title?: string
  content: string
  date: string
  isJournal: boolean
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  eventId?: string
  taskId?: string
  offset: number
  type: 'NOTIFICATION' | 'EMAIL'
  sent: boolean
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'REMINDER' | 'TASK_DUE' | 'HABIT_REMINDER' | 'GOAL_UPDATE' | 'SYSTEM'
  read: boolean
  actionUrl?: string
  snoozedUntil?: string
  createdAt: string
}

export interface GoogleCalendarListItem {
  id?: string | null
  summary?: string | null
  primary?: boolean | null
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<{ user: User }>('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User }>('/auth/login', data),
  
  logout: () => api.post('/auth/logout'),
  
  me: () => api.get<{ user: User }>('/auth/me'),
  
  updateProfile: (data: Partial<Pick<User, 'name' | 'timezone' | 'theme' | 'defaultView'>>) =>
    api.patch<{ user: User }>('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
}

// Categories API
export const categoriesApi = {
  list: () => api.get<Category[]>('/categories'),
  create: (data: { name: string; color: string; icon?: string }) =>
    api.post<Category>('/categories', data),
  update: (id: string, data: Partial<{ name: string; color: string; icon?: string }>) =>
    api.patch<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
}

// Events API
export const eventsApi = {
  list: (params?: { start?: string; end?: string; categoryId?: string; search?: string }) =>
    api.get<Event[]>('/events', { params }),
  get: (id: string) => api.get<Event>(`/events/${id}`),
  create: (data: Partial<Event>) => api.post<Event>('/events', data),
  update: (id: string, data: Partial<Event>) => api.patch<Event>(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  addReminder: (id: string, offset: number) =>
    api.post<Reminder>(`/events/${id}/reminders`, { offset }),
}

// Tasks API
export const tasksApi = {
  list: (params?: {
    status?: string
    priority?: string
    categoryId?: string
    goalId?: string
    dueStart?: string
    dueEnd?: string
    search?: string
    parentTaskId?: string
  }) => api.get<Task[]>('/tasks', { params }),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) => api.patch<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  reorder: (taskIds: string[]) => api.post('/tasks/reorder', { taskIds }),
}

// Habits API
export const habitsApi = {
  list: (active?: boolean) =>
    api.get<Habit[]>('/habits', { params: active !== undefined ? { active } : undefined }),
  get: (id: string, startDate?: string, endDate?: string) =>
    api.get<Habit & { logs: HabitLog[] }>(`/habits/${id}`, { params: { startDate, endDate } }),
  create: (data: Partial<Habit>) => api.post<Habit>('/habits', data),
  update: (id: string, data: Partial<Habit>) => api.patch<Habit>(`/habits/${id}`, data),
  delete: (id: string) => api.delete(`/habits/${id}`),
  log: (id: string, data: { date: string; completed?: boolean; count?: number; note?: string }) =>
    api.post<HabitLog>(`/habits/${id}/log`, data),
  deleteLog: (id: string, date: string) => api.delete(`/habits/${id}/log/${date}`),
}

// Goals API
export const goalsApi = {
  list: (params?: { type?: string; status?: string }) =>
    api.get<Goal[]>('/goals', { params }),
  get: (id: string) => api.get<Goal>(`/goals/${id}`),
  create: (data: Partial<Goal>) => api.post<Goal>('/goals', data),
  update: (id: string, data: Partial<Goal>) => api.patch<Goal>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
}

// Google Calendar API
export const googleApi = {
  getAuthUrl: () => api.get<{ url: string }>('/google/auth'),
  listCalendars: () => api.get<{ items: GoogleCalendarListItem[] }>('/google/calendars'),
  startWatch: (calendarId: string) => api.post('/google/watch', { calendarId }),
  disconnect: () => api.delete('/google/disconnect'),
  syncNow: () => api.post('/google/sync-now'),
}

// Notes API
export const notesApi = {
  list: (params?: {
    date?: string
    isJournal?: boolean
    eventId?: string
    taskId?: string
    goalId?: string
    search?: string
  }) => api.get<Note[]>('/notes', { params }),
  getJournal: (startDate?: string, endDate?: string) =>
    api.get<Note[]>('/notes/journal', { params: { startDate, endDate } }),
  get: (id: string) => api.get<Note>(`/notes/${id}`),
  create: (data: Partial<Note>) => api.post<Note>('/notes', data),
  update: (id: string, data: Partial<Note>) => api.patch<Note>(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
}

// Notifications API
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get<Notification[]>('/notifications', { params }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  snooze: (id: string, minutes: number) =>
    api.patch(`/notifications/${id}/snooze`, { minutes }),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
}
