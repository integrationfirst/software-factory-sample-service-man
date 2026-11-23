import Header from './components/Header.tsx'
import ServicesPage from './pages/ServicesPage.tsx'

export default function App() {
  return (
    <div className="min-h-screen bg-surface font-sans text-text">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <ServicesPage />
      </main>
    </div>
  )
}
