import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { LandingPage } from '@/features/landing'
import { useEffect } from 'react'

function RootIndex() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' })
    }
  }, [isAuthenticated, navigate])

  if (isAuthenticated) {
    return null
  }

  return <LandingPage />
}

export const Route = createFileRoute('/')({
  component: RootIndex,
})
