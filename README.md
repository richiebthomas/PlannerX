# PlannerX

A powerful personal planner and productivity app with calendar, tasks, habits, goals, and journaling. Built with modern web technologies for a beautiful, responsive experience.

> A complete productivity solution for managing your time, tasks, and goals - all in one place.

## Features

### Core Functionality
- **Calendar** - Day, week, and month views with drag-and-drop
- **Tasks** - Kanban board with priorities, due dates, and subtasks
- **Habits** - Daily/weekly/monthly habit tracking with visual progress
- **Goals** - Track progress toward your objectives with linked tasks
- **Journal** - Daily reflections and notes
- **Notifications** - Reminders with snooze functionality
- **Categories** - Color-coded organization for events and tasks

### User Experience
- Light/dark mode with theme switching
- Keyboard shortcuts for quick navigation
- Command palette for fast actions
- Fully responsive design (desktop and mobile)
- Accessible UI components
- RTL support


## Tech Stack

### Frontend
- **UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)
- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Routing:** [TanStack Router](https://tanstack.com/router/latest)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons:** [Lucide Icons](https://lucide.dev/icons/)

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/)
- **Authentication:** Session-based auth with bcrypt
- **Validation:** [Zod](https://zod.dev/)

## Run Locally

### Prerequisites
- Node.js 20.19+ or 22.12+
- PostgreSQL database
- pnpm (or npm)

### Installation

1. Clone the project (or download the folder)

2. Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies
cd backend
pnpm install
```

3. Set up environment variables:

**Frontend** - Rename `env.txt` to `.env` in the root directory:
```bash
# On Windows
ren fronted\eenv.txt .env

# On Mac/Linux
mv frontend\eenv.txt .env
```

**Backend** - Rename `backend/env.txt` to `backend/.env`:
```bash
# On Windows
ren backend\env.txt .env

# On Mac/Linux
mv backend/env.txt backend/.env
```

Then update the values in both `.env` files according to your setup:

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3001/api
```

**Backend `.env`:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/plannerx"
PORT=3001
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your-secure-session-secret-key-change-this-in-production
NODE_ENV=development
```

> **Note:** Generate a secure `SESSION_SECRET` using:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

4. Set up the database:

```bash
cd backend
pnpm run db:generate
pnpm run db:push
```

5. Start the development servers:

```bash
# Terminal 1 - Backend
cd backend
pnpm run dev

# Terminal 2 - Frontend
cd frontend
pnpm run dev
```

The app will be available at:
- Frontend: `http://localhost:5173` (or the port specified in your environment)
- Backend API: `http://localhost:3001` (or the PORT specified in backend/.env)


## Environment Variables

### Frontend (`/frontend/.env`)
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)

### Backend (`/backend/.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `SESSION_SECRET` - Secret key for session encryption
- `NODE_ENV` - Environment mode (development | production)

## Features Roadmap

### Implemented ✅
- Calendar views (day, week, month)
- Task management with subtasks
- Habit tracking
- Goal setting and progress tracking
- Daily journal
- Reminders and notifications
- Recurring events
- Keyboard shortcuts
- Command palette
- Dark/light themes
- Categories with color coding

### Potential Future Enhancements
- Drag-and-drop for calendar events
- Task templates
- File attachments
- Rich text editor for notes
- Calendar conflicts detection
- Time zone support
- Data backup/restore

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
