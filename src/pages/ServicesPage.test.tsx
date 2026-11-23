import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ServicesPage from './ServicesPage.tsx'

describe('ServicesPage', () => {
  it('shows the heading and the empty state', () => {
    render(<ServicesPage />)

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument()
    expect(screen.getByText('No services yet')).toBeInTheDocument()
  })
})
