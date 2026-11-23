import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { sections } from '../sections.ts'
import Sidebar from './Sidebar.tsx'

describe('Sidebar', () => {
  it('renders one link per registry entry', () => {
    render(
      <MemoryRouter>
        <Sidebar id="main-nav" open={false} onNavigate={() => {}} />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(sections.length)
    sections.forEach(({ label, path }, i) => {
      expect(links[i]).toHaveTextContent(label)
      expect(links[i]).toHaveAttribute('href', path)
    })
  })
})
