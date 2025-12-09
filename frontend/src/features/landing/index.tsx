// path: src/features/landing/index.tsx

import { Link } from '@tanstack/react-router'
import { 
  Calendar, 
  CheckSquare, 
  Target, 
  Repeat, 
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/assets/logo'

export function LandingPage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20'>
      {/* Header */}
      <header className='container mx-auto px-4 py-6'>
        <nav className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Logo className='h-8 w-8' />
            <span className='text-2xl font-bold'>PlannerX</span>
          </div>
          <div className='flex items-center gap-4'>
            <Link to='/sign-in'>
              <Button variant='ghost'>Sign In</Button>
            </Link>
            <Link to='/sign-up'>
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className='container mx-auto px-4 py-20 text-center'>
        <div className='mx-auto max-w-3xl space-y-6'>
          <h1 className='text-5xl font-bold tracking-tight sm:text-6xl'>
            Your Personal
            <span className='text-primary'> Productivity Hub</span>
          </h1>
          <p className='text-muted-foreground text-xl'>
            Plan your day, track your habits, achieve your goals, and reflect on your journey - all in one beautiful, intuitive app.
          </p>
          <div className='flex flex-col items-center gap-4 pt-6 sm:flex-row sm:justify-center'>
            <Link to='/sign-up'>
              <Button size='lg' className='gap-2'>
                Start Planning Free
                <ArrowRight className='h-4 w-4' />
              </Button>
            </Link>
            <Link to='/sign-in'>
              <Button size='lg' variant='outline'>
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className='container mx-auto px-4 py-20'>
        <div className='mb-12 text-center'>
          <h2 className='text-3xl font-bold'>Everything You Need to Stay Organized</h2>
          <p className='text-muted-foreground mt-2'>
            Powerful features designed for personal productivity
          </p>
        </div>
        
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {/* Calendar */}
          <Card className='border-2 transition-all hover:border-primary/50 hover:shadow-lg'>
            <CardHeader>
              <div className='bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-lg'>
                <Calendar className='text-primary h-6 w-6' />
              </div>
              <CardTitle>Smart Calendar</CardTitle>
              <CardDescription>
                Day, week, and month views with drag-and-drop scheduling. Create recurring events and focus time blocks.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Tasks */}
          <Card className='border-2 transition-all hover:border-primary/50 hover:shadow-lg'>
            <CardHeader>
              <div className='bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-lg'>
                <CheckSquare className='text-primary h-6 w-6' />
              </div>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>
                Organize tasks with priorities, due dates, and subtasks. Filter and search to find what matters most.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Habits */}
          <Card className='border-2 transition-all hover:border-primary/50 hover:shadow-lg'>
            <CardHeader>
              <div className='bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-lg'>
                <Repeat className='text-primary h-6 w-6' />
              </div>
              <CardTitle>Habit Tracking</CardTitle>
              <CardDescription>
                Build better habits with daily, weekly, and monthly tracking. Visualize your streaks and progress.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Goals */}
          <Card className='border-2 transition-all hover:border-primary/50 hover:shadow-lg'>
            <CardHeader>
              <div className='bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-lg'>
                <Target className='text-primary h-6 w-6' />
              </div>
              <CardTitle>Goal Setting</CardTitle>
              <CardDescription>
                Set daily, weekly, monthly, or yearly goals. Track tasks linked to each goal and monitor your progress.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Journal */}
          <Card className='border-2 transition-all hover:border-primary/50 hover:shadow-lg'>
            <CardHeader>
              <div className='bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-lg'>
                <BookOpen className='text-primary h-6 w-6' />
              </div>
              <CardTitle>Daily Journal</CardTitle>
              <CardDescription>
                Reflect on your day with a built-in journal. Add notes to events, tasks, and goals.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Productivity */}
          <Card className='border-2 transition-all hover:border-primary/50 hover:shadow-lg'>
            <CardHeader>
              <div className='bg-primary/10 mb-2 flex h-12 w-12 items-center justify-center rounded-lg'>
                <Zap className='text-primary h-6 w-6' />
              </div>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>
                Navigate faster with keyboard shortcuts. Command palette for quick actions and powerful search.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className='bg-muted/50 py-20'>
        <div className='container mx-auto px-4'>
          <div className='mx-auto max-w-2xl space-y-8'>
            <h2 className='text-center text-3xl font-bold'>Why PlannerX?</h2>
            
            <div className='space-y-6'>
              <div className='flex gap-4'>
                <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                  <CheckCircle2 className='text-primary h-5 w-5' />
                </div>
                <div>
                  <h3 className='mb-1 font-semibold'>All-in-One Solution</h3>
                  <p className='text-muted-foreground'>
                    Stop juggling multiple apps. PlannerX combines calendar, tasks, habits, goals, and journaling in one unified experience.
                  </p>
                </div>
              </div>

              <div className='flex gap-4'>
                <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                  <Clock className='text-primary h-5 w-5' />
                </div>
                <div>
                  <h3 className='mb-1 font-semibold'>Time-Aware Planning</h3>
                  <p className='text-muted-foreground'>
                    Schedule events, set task due dates, track habits, and set goal deadlines - all with intelligent reminders.
                  </p>
                </div>
              </div>

              <div className='flex gap-4'>
                <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
                  <Target className='text-primary h-5 w-5' />
                </div>
                <div>
                  <h3 className='mb-1 font-semibold'>Goal-Oriented</h3>
                  <p className='text-muted-foreground'>
                    Link your tasks to goals and see your progress. Every action you take moves you closer to your objectives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='container mx-auto px-4 py-20'>
        <Card className='border-primary/50 bg-primary/5 mx-auto max-w-3xl border-2 text-center'>
          <CardHeader>
            <CardTitle className='text-3xl'>Ready to Get Organized?</CardTitle>
            <CardDescription className='text-base'>
              Start planning your perfect day with PlannerX. No credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to='/sign-up'>
              <Button size='lg' className='gap-2'>
                Create Your Free Account
                <ArrowRight className='h-4 w-4' />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className='border-t py-8'>
        <div className='container mx-auto px-4 text-center'>
          <div className='mb-4 flex items-center justify-center gap-2'>
            <Logo className='h-6 w-6' />
            <span className='font-semibold'>PlannerX</span>
          </div>
          <p className='text-muted-foreground text-sm'>
            Your personal productivity hub. Plan. Track. Achieve.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

