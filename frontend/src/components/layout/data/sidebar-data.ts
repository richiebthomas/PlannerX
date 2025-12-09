import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CalendarRange,
  ListTodo,
  Target,
  Repeat,
  BookOpen,
  Bell,
  Settings,
  UserCog,
  Palette,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: 'user@example.com',
    avatar: '',
  },
  navGroups: [
    {
      title: 'Overview',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Calendar',
      items: [
        {
          title: 'Day View',
          url: '/calendar/day',
          icon: Calendar,
        },
        {
          title: 'Week View',
          url: '/calendar/week',
          icon: CalendarDays,
        },
        {
          title: 'Month View',
          url: '/calendar/month',
          icon: CalendarRange,
        },
      ],
    },
    {
      title: 'Planning',
      items: [
        {
          title: 'Tasks',
          url: '/tasks',
          icon: ListTodo,
        },
        {
          title: 'Goals',
          url: '/goals',
          icon: Target,
        },
        {
          title: 'Habits',
          url: '/habits',
          icon: Repeat,
        },
      ],
    },
    {
      title: 'Notes',
      items: [
        {
          title: 'Journal',
          url: '/journal',
          icon: BookOpen,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Notifications',
          url: '/notifications',
          icon: Bell,
        },
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Account',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
          ],
        },
      ],
    },
  ],
}
