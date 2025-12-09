import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { isAuthenticated, checkAuth } = useAuthStore.getState()
    
    if (!isAuthenticated) {
      await checkAuth()
      const { isAuthenticated: stillNotAuth } = useAuthStore.getState()
      if (!stillNotAuth) {
        throw redirect({ to: '/sign-in' })
      }
    }
  },
  component: AuthenticatedLayout,
})
