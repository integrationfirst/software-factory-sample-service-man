import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('renders the header and the Services page', () => {
    render(<App />)

    expect(screen.getByText('Service Management')).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Services' }),
    )
  })
})
