type HeaderProps = {
  menuOpen: boolean
  menuControls: string
  onMenuToggle: () => void
}

export default function Header({
  menuOpen,
  menuControls,
  onMenuToggle,
}: HeaderProps) {
  return (
    <header className="bg-brand-700 text-brand-contrast shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4">
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls={menuControls}
          onClick={onMenuToggle}
          className="rounded-md px-2 py-1 hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-contrast md:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <span className="text-lg font-semibold">Service Management</span>
      </div>
    </header>
  )
}
