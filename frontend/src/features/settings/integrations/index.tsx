import { ContentSection } from '../components/content-section'
import { GoogleCalendarConnect } from '../account/google-calendar-connect'

export function SettingsIntegrations() {
  return (
    <ContentSection
      title='App Integrations'
      desc='Connect external services to sync your data.'
    >
      <GoogleCalendarConnect />
    </ContentSection>
  )
}

