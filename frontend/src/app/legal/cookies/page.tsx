import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politica de Cookies - Kabin-e',
}

export default function CookiesPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Politica de Cookies</h1>
      <p className="text-sm text-gray-500">Ultima actualizacion: 30 de marzo de 2026</p>

      <h2>1. Que son las cookies</h2>
      <p>
        Las cookies son pequenos archivos de texto que los sitios web almacenan en su navegador.
        Se utilizan para recordar preferencias, mantener sesiones activas, y analizar el uso del sitio.
      </p>

      <h2>2. Cookies que utilizamos</h2>

      <h3>2.1. Cookies estrictamente necesarias</h3>
      <p>Estas cookies son esenciales para el funcionamiento de la plataforma y no requieren consentimiento.</p>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Proposito</th><th>Duracion</th></tr>
        </thead>
        <tbody>
          <tr><td>sb-*-auth-token</td><td>Sesion de autenticacion (Supabase)</td><td>24 horas</td></tr>
          <tr><td>cookie-consent</td><td>Recordar preferencia de cookies</td><td>1 ano</td></tr>
        </tbody>
      </table>

      <h3>2.2. Cookies de rendimiento</h3>
      <p>Nos ayudan a entender como se utiliza la plataforma para mejorarla.</p>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Proposito</th><th>Duracion</th></tr>
        </thead>
        <tbody>
          <tr><td>sentry-*</td><td>Monitorizacion de errores (Sentry)</td><td>Sesion</td></tr>
        </tbody>
      </table>

      <h3>2.3. Cookies de terceros</h3>
      <p>Utilizadas por servicios externos integrados en la plataforma.</p>
      <table>
        <thead>
          <tr><th>Proveedor</th><th>Proposito</th><th>Mas informacion</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Stripe</td>
            <td>Procesamiento de pagos</td>
            <td><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Politica de Stripe</a></td>
          </tr>
        </tbody>
      </table>

      <h2>3. Gestion de cookies</h2>
      <p>
        Puede gestionar sus preferencias de cookies en cualquier momento a traves del banner
        de cookies o desde la configuracion de su navegador. Tenga en cuenta que deshabilitar
        las cookies esenciales puede afectar al funcionamiento de la plataforma.
      </p>

      <h2>4. Como deshabilitar cookies en su navegador</h2>
      <ul>
        <li><strong>Chrome:</strong> Configuracion &gt; Privacidad y seguridad &gt; Cookies</li>
        <li><strong>Firefox:</strong> Ajustes &gt; Privacidad y seguridad &gt; Cookies</li>
        <li><strong>Safari:</strong> Preferencias &gt; Privacidad &gt; Cookies</li>
        <li><strong>Edge:</strong> Configuracion &gt; Cookies y permisos del sitio</li>
      </ul>

      <h2>5. Contacto</h2>
      <p>
        Para consultas sobre cookies: <strong>privacidad@kabine.app</strong>
      </p>
    </article>
  )
}
