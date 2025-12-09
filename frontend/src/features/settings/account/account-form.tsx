// path: src/features/settings/account/account-form.tsx

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api'

const usernameFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Please enter your name.')
    .min(2, 'Name must be at least 2 characters.')
    .max(50, 'Name must not be longer than 50 characters.'),
  email: z.string().email('Please enter a valid email.'),
})

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

type UsernameFormValues = z.infer<typeof usernameFormSchema>
type PasswordFormValues = z.infer<typeof passwordFormSchema>

export function AccountForm() {
  const { user, setUser } = useAuthStore()
  const [isEditingUsername, setIsEditingUsername] = useState(false)

  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UsernameFormValues) => {
      const response = await authApi.updateProfile(data)
      return response.data
    },
    onSuccess: (data) => {
      setUser(data.user)
      toast.success('Profile updated successfully')
      setIsEditingUsername(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      passwordForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to change password')
    },
  })

  function onSubmitUsername(data: UsernameFormValues) {
    updateProfileMutation.mutate(data)
  }

  function onSubmitPassword(data: PasswordFormValues) {
    changePasswordMutation.mutate(data)
  }

  return (
    <div className='space-y-8'>
      {/* Username/Email Section */}
      <div>
        <h3 className='text-lg font-medium'>Profile Information</h3>
        <p className='text-muted-foreground text-sm'>
          Update your name and email address.
        </p>
        <Separator className='my-4' />
        
        <Form {...usernameForm}>
          <form
            onSubmit={usernameForm.handleSubmit(onSubmitUsername)}
            className='space-y-4'
          >
            <FormField
              control={usernameForm.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Your name'
                      disabled={!isEditingUsername}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the name that will be displayed in your account.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={usernameForm.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='your@email.com'
                      disabled={!isEditingUsername}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Your email address used for login and notifications.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex gap-2'>
              {isEditingUsername ? (
                <>
                  <Button
                    type='submit'
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setIsEditingUsername(false)
                      usernameForm.reset()
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsEditingUsername(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>

      {/* Password Section */}
      <div>
        <h3 className='text-lg font-medium'>Change Password</h3>
        <p className='text-muted-foreground text-sm'>
          Update your password to keep your account secure.
        </p>
        <Separator className='my-4' />
        
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            className='space-y-4'
          >
            <FormField
              control={passwordForm.control}
              name='currentPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Enter current password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name='newPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Enter new password'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Password must be at least 8 characters long.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder='Confirm new password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type='submit'
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
