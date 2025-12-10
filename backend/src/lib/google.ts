import { google } from 'googleapis'
import { env } from '../env.js'

export function getOAuthClient() {
  const client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  )
  return client
}

export function getCalendarClient(accessToken: string, refreshToken?: string) {
  const auth = getOAuthClient()
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  return google.calendar({ version: 'v3', auth })
}

