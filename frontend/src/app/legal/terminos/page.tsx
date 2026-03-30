import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terminos de Servicio - Kabin-e',
}

export default function TerminosPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Terminos y Condiciones de Uso</h1>
      <p className="text-sm text-gray-500">Ultima actualizacion: 30 de marzo de 2026</p>

      <h2>1. Objeto</h2>
      <p>
        Los presentes Terminos regulan el acceso y uso de la plataforma <strong>Kabin-e</strong>,
        una herramienta SaaS de gestion deportiva profesional para clubes de futbol.
      </p>

      <h2>2. Registro y cuentas</h2>
      <ul>
        <li>Debe ser mayor de 18 anos para crear una organizacion.</li>
        <li>Es responsable de mantener la confidencialidad de sus credenciales.</li>
        <li>Un usuario puede pertenecer a multiples equipos y organizaciones.</li>
        <li>El administrador de la organizacion es responsable de gestionar los accesos de su equipo.</li>
      </ul>

      <h2>3. Planes y suscripciones</h2>
      <ul>
        <li><strong>Periodo de prueba:</strong> 14 dias gratuitos con acceso completo al plan Equipo Basico.</li>
        <li><strong>Facturacion:</strong> mensual o anual, procesada a traves de Stripe.</li>
        <li><strong>Cancelacion:</strong> puede cancelar en cualquier momento. El acceso se mantiene hasta el fin del periodo pagado.</li>
        <li><strong>Cambios de plan:</strong> los upgrades se aplican inmediatamente; los downgrades al finalizar el periodo actual.</li>
      </ul>

      <h2>4. Uso aceptable</h2>
      <p>El usuario se compromete a:</p>
      <ul>
        <li>Usar la plataforma exclusivamente para gestion deportiva legitima.</li>
        <li>No compartir credenciales con terceros.</li>
        <li>Respetar la privacidad de jugadores, especialmente menores.</li>
        <li>No intentar acceder a datos de otras organizaciones.</li>
        <li>No realizar ingenieria inversa ni intentar vulnerar la seguridad.</li>
        <li>No usar la plataforma para almacenar contenido ilegal.</li>
      </ul>

      <h2>5. Propiedad de los datos</h2>
      <p>
        Los datos introducidos por el usuario son propiedad de su organizacion.
        Kabin-e actua como encargado del tratamiento conforme al RGPD.
        El usuario puede exportar sus datos en cualquier momento (Art. 20 RGPD).
      </p>

      <h2>6. Proteccion de datos de menores</h2>
      <p>
        La plataforma gestiona datos de jugadores menores de edad. El administrador de la
        organizacion es responsable de obtener el consentimiento de los tutores legales conforme
        al Art. 8 RGPD y Art. 7 LOPD-GDD. La plataforma facilita el sistema de invitacion y
        gestion de tutores para este fin.
      </p>

      <h2>7. Disponibilidad del servicio</h2>
      <ul>
        <li>Objetivo de disponibilidad: 99.5% mensual (excluyendo mantenimiento programado).</li>
        <li>Mantenimientos programados se notificaran con al menos 24 horas de antelacion.</li>
        <li>No se garantiza disponibilidad ininterrumpida.</li>
      </ul>

      <h2>8. Limitacion de responsabilidad</h2>
      <p>
        Kabin-e no sera responsable de danos indirectos, lucro cesante, ni perdida de datos
        causada por mal uso de la plataforma o factores externos al servicio.
        La responsabilidad maxima se limita al importe pagado en los ultimos 12 meses.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        La plataforma, su codigo, diseno, y marca son propiedad de Kabin-e.
        El usuario retiene todos los derechos sobre los datos y contenido que introduce en la plataforma.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Nos reservamos el derecho de modificar estos terminos. Los cambios sustanciales
        se notificaran por email con al menos 30 dias de antelacion. El uso continuado
        tras la notificacion constituye aceptacion de los nuevos terminos.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estos terminos se rigen por la legislacion espanola.
        Para la resolucion de conflictos seran competentes los juzgados y tribunales de la ciudad
        del domicilio social de Kabin-e.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para consultas sobre estos terminos: <strong>legal@kabine.app</strong>
      </p>
    </article>
  )
}
