import { redirect } from 'next/navigation'

export default function Home() {
  // Redirigir a login (o dashboard si está autenticado)
  redirect('/login')
}
