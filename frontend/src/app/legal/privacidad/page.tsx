import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politica de Privacidad - Kabin-e',
}

export default function PrivacidadPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Politica de Privacidad</h1>
      <p className="text-sm text-gray-500">Ultima actualizacion: 30 de marzo de 2026</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de sus datos personales es <strong>Kabin-e</strong> (en adelante, &quot;la Plataforma&quot;),
        accesible desde <strong>kabine.app</strong>.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <p>Recopilamos las siguientes categorias de datos:</p>
      <ul>
        <li><strong>Datos de registro:</strong> nombre, apellidos, email, contrasena (cifrada).</li>
        <li><strong>Datos de organizacion:</strong> nombre del club, equipos, roles de usuarios.</li>
        <li><strong>Datos deportivos:</strong> jugadores, sesiones de entrenamiento, partidos, estadisticas, RPE, carga de trabajo.</li>
        <li><strong>Datos medicos (Art. 9 RGPD):</strong> registros medicos de jugadores, cifrados con AES-256-GCM. Solo accesibles por personal medico autorizado.</li>
        <li><strong>Datos de menores:</strong> gestionados conforme al Art. 8 RGPD y Art. 7 LOPD-GDD. Requieren consentimiento del tutor legal.</li>
        <li><strong>Datos de uso:</strong> IP, navegador, paginas visitadas, para seguridad y mejora del servicio.</li>
      </ul>

      <h2>3. Base legal del tratamiento</h2>
      <ul>
        <li><strong>Ejecucion del contrato</strong> (Art. 6.1.b RGPD): para prestar el servicio contratado.</li>
        <li><strong>Consentimiento</strong> (Art. 6.1.a RGPD): para datos medicos y comunicaciones opcionales.</li>
        <li><strong>Interes legitimo</strong> (Art. 6.1.f RGPD): para seguridad y prevencion de fraude.</li>
        <li><strong>Obligacion legal</strong> (Art. 6.1.c RGPD): para cumplir normativas aplicables.</li>
      </ul>

      <h2>4. Tratamiento de datos de menores</h2>
      <p>
        Conforme al Art. 8 del RGPD y Art. 7 de la LOPD-GDD, los datos de menores de 14 anos requieren
        el consentimiento de su padre, madre o tutor legal. La Plataforma permite a los tutores:
      </p>
      <ul>
        <li>Visualizar los datos compartidos de sus menores.</li>
        <li>Revocar el consentimiento y solicitar la eliminacion de datos.</li>
        <li>Exportar los datos de sus menores (derecho de portabilidad).</li>
      </ul>

      <h2>5. Encargados del tratamiento</h2>
      <table>
        <thead>
          <tr><th>Proveedor</th><th>Servicio</th><th>Ubicacion</th></tr>
        </thead>
        <tbody>
          <tr><td>Supabase Inc.</td><td>Base de datos y autenticacion</td><td>UE (Frankfurt)</td></tr>
          <tr><td>Render Inc.</td><td>Hosting de la API</td><td>UE (Frankfurt)</td></tr>
          <tr><td>Vercel Inc.</td><td>Hosting del frontend</td><td>UE</td></tr>
          <tr><td>Stripe Inc.</td><td>Procesamiento de pagos</td><td>UE/EEUU (con clausulas contractuales tipo)</td></tr>
          <tr><td>Google (Gemini)</td><td>Inteligencia artificial</td><td>EEUU (con clausulas contractuales tipo)</td></tr>
          <tr><td>Resend Inc.</td><td>Envio de emails transaccionales</td><td>EEUU (con clausulas contractuales tipo)</td></tr>
        </tbody>
      </table>

      <h2>6. Conservacion de datos</h2>
      <ul>
        <li><strong>Datos de cuenta:</strong> mientras la cuenta este activa + 30 dias tras cancelacion.</li>
        <li><strong>Datos deportivos:</strong> mientras la suscripcion este activa.</li>
        <li><strong>Datos medicos:</strong> segun normativa sanitaria aplicable (minimo 5 anos).</li>
        <li><strong>Logs de auditoria:</strong> 2 anos para cumplimiento legal.</li>
        <li><strong>Datos de facturacion:</strong> 5 anos (obligacion fiscal).</li>
      </ul>

      <h2>7. Derechos del interesado</h2>
      <p>Puede ejercer los siguientes derechos en cualquier momento desde <strong>Configuracion &gt; GDPR</strong>:</p>
      <ul>
        <li><strong>Acceso</strong> (Art. 15): obtener copia de sus datos.</li>
        <li><strong>Rectificacion</strong> (Art. 16): corregir datos inexactos.</li>
        <li><strong>Supresion</strong> (Art. 17): solicitar eliminacion de datos.</li>
        <li><strong>Portabilidad</strong> (Art. 20): exportar datos en formato JSON.</li>
        <li><strong>Oposicion</strong> (Art. 21): oponerse a determinados tratamientos.</li>
        <li><strong>Limitacion</strong> (Art. 18): solicitar limitacion del tratamiento.</li>
      </ul>
      <p>
        Plazo de respuesta: 30 dias naturales. Puede presentar reclamacion ante la
        <strong> Agencia Espanola de Proteccion de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.
      </p>

      <h2>8. Seguridad</h2>
      <ul>
        <li>Cifrado en transito (HTTPS/TLS 1.3) y en reposo (AES-256-GCM para datos medicos).</li>
        <li>Autenticacion con JWT y soporte para MFA.</li>
        <li>Control de acceso basado en roles (RBAC) con permisos granulares.</li>
        <li>Registro de auditoria de todas las acciones sensibles.</li>
        <li>Row Level Security (RLS) en base de datos.</li>
      </ul>

      <h2>9. Contacto</h2>
      <p>
        Para cualquier consulta sobre privacidad, puede contactarnos en: <strong>privacidad@kabine.app</strong>
      </p>
    </article>
  )
}
