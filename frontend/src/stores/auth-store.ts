import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type User } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  updateProfile: (data: Partial<Pick<User, 'name' | 'timezone' | 'theme' | 'defaultView'>>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        const { data } = await authApi.login({ email, password })
        set({ user: data.user, isAuthenticated: true })
      },

      register: async (email, password, name) => {
        const { data } = await authApi.register({ email, password, name })
        set({ user: data.user, isAuthenticated: true })
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // Ignore errors
        }
        set({ user: null, isAuthenticated: false })
      },

      checkAuth: async () => {
        try {
          const { data } = await authApi.me()
          set({ user: data.user, isAuthenticated: true, isLoading: false })
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      updateProfile: async (data) => {
        const { data: response } = await authApi.updateProfile(data)
        set({ user: response.user })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
