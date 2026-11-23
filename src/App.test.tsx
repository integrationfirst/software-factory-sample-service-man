import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders the header and redirects / to the Services page', () => {
    renderAt('/')

    expect(screen.getByText('Service Management')).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Services' }),
    )
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Services' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows Page not found for an unknown path, inside the frame', () => {
    renderAt('/does-not-exist')

    const main = screen.getByRole('main')
    expect(
      within(main).getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(within(main).getByRole('link')).toHaveAttribute('href', '/services')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(
      within(nav).getByRole('link', { name: 'Services' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('shows the Services page when its link is clicked from another route', () => {
    renderAt('/does-not-exist')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    const link = within(nav).getByRole('link', { name: 'Services' })
    fireEvent.click(link)

    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Services' }),
    )
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('toggles the menu button and closes the menu when an item is chosen', () => {
    renderAt('/services')

    const button = screen.getByRole('button', { name: 'Menu' })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(button).toHaveAttribute('aria-controls', nav.id)
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(nav).getByRole('link', { name: 'Services' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})
