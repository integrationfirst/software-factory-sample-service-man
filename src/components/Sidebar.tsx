import { NavLink } from 'react-router'
import { sections } from '../sections.ts'

type SidebarProps = {
  id: string
  open: boolean
  onNavigate: () => void
}

export default function Sidebar({ id, open, onNavigate }: SidebarProps) {
  return (
    <nav
      id={id}
      aria-label="Main"
      className={`${open ? 'block' : 'hidden'} shrink-0 border-b border-border bg-surface-raised md:block md:w-56 md:border-r md:border-b-0`}
    >
      <ul className="flex flex-col gap-1 p-3">
        {sections.map(({ label, path, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                  isActive
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-text hover:bg-brand-50'
                }`
              }
            >
              {Icon && <Icon />}
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
