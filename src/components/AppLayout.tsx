import { useState } from 'react'
import { Outlet } from 'react-router'
import Header from './Header.tsx'
import Sidebar from './Sidebar.tsx'

const sidebarId = 'main-nav'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-text">
      <Header
        menuOpen={menuOpen}
        menuControls={sidebarId}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar
          id={sidebarId}
          open={menuOpen}
          onNavigate={() => setMenuOpen(false)}
        />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
