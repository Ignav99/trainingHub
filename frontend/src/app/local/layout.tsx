export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-2 right-2 z-50 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-mono">
        DEV LOCAL
      </div>
      {children}
    </div>
  )
}
