import { Link } from 'react-router'
import { sections } from '../sections.ts'

export default function NotFoundPage() {
  const home = sections[0]

  return (
    <section>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-4 text-text-muted">
        The page you are looking for does not exist.
      </p>
      <Link
        to={home.path}
        className="mt-6 inline-block rounded-md font-semibold text-brand-700 underline hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        Go to {home.label}
      </Link>
    </section>
  )
}
