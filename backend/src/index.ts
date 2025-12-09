// path: backend/src/index.ts

import './env.js'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './env.js'

import authRoutes from './routes/auth.js'
import categoriesRoutes from './routes/categories.js'
import eventsRoutes from './routes/events.js'
import tasksRoutes from './routes/tasks.js'
import habitsRoutes from './routes/habits.js'
import goalsRoutes from './routes/goals.js'
import notesRoutes from './routes/notes.js'
import notificationsRoutes from './routes/notifications.js'

const app = express()
const PORT = env.PORT

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/habits', habitsRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/notifications', notificationsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Only start server if not in Vercel serverless environment
// In Vercel, VERCEL env var is set, so we skip the listen
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  })
}

// Export for Vercel serverless
export default app
