import type { ComponentType } from 'react'
import ServicesPage from './pages/ServicesPage.tsx'

export type Section = {
  label: string
  path: string
  component: ComponentType
  icon?: ComponentType
}

// The app's sections, in sidebar order. `/` redirects to the first one.
export const sections: Section[] = [
  { label: 'Services', path: '/services', component: ServicesPage },
]
