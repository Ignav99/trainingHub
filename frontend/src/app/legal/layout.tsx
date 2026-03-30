import Link from 'next/link'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700">
            <img src="/logo-icon.png" alt="Kabin-e" className="w-8 h-8" />
            <span className="font-semibold">Kabin-e</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/legal/privacidad" className="text-gray-600 hover:text-gray-900">
              Privacidad
            </Link>
            <Link href="/legal/terminos" className="text-gray-600 hover:text-gray-900">
              Terminos
            </Link>
            <Link href="/legal/cookies" className="text-gray-600 hover:text-gray-900">
              Cookies
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Kabin-e. Todos los derechos reservados.
      </footer>
    </div>
  )
}
