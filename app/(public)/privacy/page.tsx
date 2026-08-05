import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection, contactEmail } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Política de privacidad | Opturon",
  description: "Conocé cómo Opturon procesa información para operar su plataforma comercial, CRM, automatizaciones e integraciones de mensajería.",
  alternates: {
    canonical: "https://www.opturon.com/privacy"
  },
  robots: {
    index: true,
    follow: true
  }
};

const updatedAt = "5 de agosto de 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Política de privacidad"
      description="Esta política explica de forma general cómo Opturon trata información vinculada al uso de su plataforma, sus integraciones y sus servicios públicos."
      updatedAt={updatedAt}
    >
      <LegalSection title="1. Identidad y alcance">
        <p>
          Opturon es una plataforma SaaS orientada a la gestión comercial y operativa de negocios. Sus funciones pueden incluir CRM, atención al cliente, automatizaciones, catálogo, pedidos, agenda, métricas e integraciones de mensajería.
        </p>
        <p>
          Esta política aplica al uso del sitio público, de la plataforma y de las funciones técnicas vinculadas a los servicios de Opturon, en la medida en que Opturon intervenga en el tratamiento de información para prestar esas funciones.
        </p>
      </LegalSection>

      <LegalSection title="2. Información que puede procesarse">
        <p>Según el tipo de uso, Opturon puede procesar información como:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>nombre y apellido;</li>
          <li>correo electrónico y teléfono;</li>
          <li>información de cuentas, usuarios y accesos;</li>
          <li>información comercial proporcionada por clientes de Opturon;</li>
          <li>contactos cargados o gestionados dentro de la plataforma;</li>
          <li>mensajes, conversaciones e interacciones comerciales;</li>
          <li>información vinculada con WhatsApp e Instagram cuando el usuario conecta esas integraciones;</li>
          <li>pedidos, agenda, catálogo y operaciones realizadas dentro de Opturon;</li>
          <li>datos técnicos de sesión, navegador, dispositivo, IP, seguridad y auditoría;</li>
          <li>cookies o tecnologías estrictamente necesarias para autenticación y funcionamiento.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades del tratamiento">
        <p>Opturon puede tratar información para:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>prestar, operar y mantener el servicio;</li>
          <li>autenticar usuarios y administrar cuentas;</li>
          <li>gestionar contactos, conversaciones y operaciones comerciales;</li>
          <li>ejecutar configuraciones y automatizaciones solicitadas por el cliente;</li>
          <li>habilitar integraciones con servicios externos;</li>
          <li>brindar soporte técnico y operativo;</li>
          <li>prevenir fraude, abuso y accesos indebidos;</li>
          <li>mantener auditoría, estabilidad y seguridad;</li>
          <li>diagnosticar errores y mejorar el funcionamiento del producto;</li>
          <li>cumplir obligaciones legales aplicables.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Integraciones y encargados técnicos">
        <p>
          Para prestar determinadas funciones, Opturon puede apoyarse en servicios externos de infraestructura y tecnología, incluyendo proveedores vinculados con Meta, WhatsApp, Instagram, alojamiento, base de datos, correo, pagos, analítica o inteligencia artificial, cuando resulten necesarios para la operación.
        </p>
        <p>
          Cada proveedor externo puede tener sus propias políticas, condiciones y mecanismos de tratamiento. Eso no implica que todos los proveedores reciban todos los datos, sino únicamente la información necesaria para la función técnica correspondiente.
        </p>
      </LegalSection>

      <LegalSection title="5. Meta Platform Data">
        <p>
          Cuando Opturon utiliza productos, integraciones o APIs de Meta, los datos obtenidos a través de esas integraciones se usan para prestar las funciones que el usuario o cliente autorizó dentro de la plataforma.
        </p>
        <p>
          El acceso a esos datos depende de los permisos concedidos, de la configuración realizada por el usuario y de las reglas de Meta aplicables en cada caso. Opturon no debe usar esos datos para fines incompatibles con la integración autorizada.
        </p>
        <p>
          Cuando corresponda, el usuario puede revocar permisos desde la configuración de Meta. Si además desea solicitar eliminación de datos vinculados a la integración, puede seguir el procedimiento publicado en{" "}
          <Link href="/data-deletion" className="text-brandBright underline-offset-4 hover:underline">
            /data-deletion
          </Link>.
        </p>
      </LegalSection>

      <LegalSection title="6. Venta de datos">
        <p className="font-medium text-text">Opturon no vende datos personales.</p>
      </LegalSection>

      <LegalSection title="7. Conservación">
        <p>
          Los datos pueden conservarse mientras la cuenta o el servicio permanezcan activos, durante el tiempo necesario para prestar el servicio y por plazos razonables vinculados con seguridad, respaldo, auditoría, facturación o cumplimiento legal.
        </p>
        <p>
          Cuando corresponde y según la naturaleza del dato, la información puede eliminarse, anonimizarse o dejar de estar disponible una vez cumplida la finalidad aplicable.
        </p>
      </LegalSection>

      <LegalSection title="8. Seguridad">
        <p>Opturon aplica medidas técnicas y organizativas razonables para proteger la información, incluyendo controles de acceso, autenticación, aislamiento de cuentas, cifrado en tránsito, registros de seguridad, copias de respaldo y otras salvaguardas operativas apropiadas para el tipo de servicio.</p>
      </LegalSection>

      <LegalSection title="9. Derechos y solicitudes">
        <p>
          Según corresponda y de acuerdo con la normativa aplicable, una persona puede solicitar acceso, actualización, corrección, eliminación, oposición, limitación o información sobre el tratamiento de datos vinculados a Opturon.
        </p>
        <p>
          Para este tipo de solicitudes, escribí a{" "}
          <a href={`mailto:${contactEmail}`} className="text-brandBright underline-offset-4 hover:underline">
            {contactEmail}
          </a>.
        </p>
        <p>
          Si la solicitud se relaciona específicamente con eliminación, también podés consultar las instrucciones publicadas en{" "}
          <Link href="/data-deletion" className="text-brandBright underline-offset-4 hover:underline">
            /data-deletion
          </Link>.
        </p>
      </LegalSection>

      <LegalSection title="10. Menores">
        <p>
          Opturon está orientado a negocios, equipos y usuarios autorizados dentro de organizaciones. No está diseñado específicamente para menores de edad.
        </p>
      </LegalSection>

      <LegalSection title="11. Transferencias y proveedores internacionales">
        <p>
          Algunos proveedores técnicos utilizados por Opturon pueden procesar información desde otras jurisdicciones. En esos casos, se aplican las salvaguardas disponibles según el servicio contratado, su documentación técnica y la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection title="12. Cambios en esta política">
        <p>
          Opturon puede actualizar esta política cuando cambien sus funciones, integraciones, procesos o requisitos legales. La fecha de última actualización publicada en esta página indica la versión vigente.
        </p>
      </LegalSection>

      <LegalSection title="13. Contacto">
        <p>
          Correo público:{" "}
          <a href={`mailto:${contactEmail}`} className="text-brandBright underline-offset-4 hover:underline">
            {contactEmail}
          </a>
        </p>
        <p>
          Solicitudes de eliminación:{" "}
          <Link href="/data-deletion" className="text-brandBright underline-offset-4 hover:underline">
            /data-deletion
          </Link>
        </p>
        <p>
          Volver al inicio:{" "}
          <Link href="/" className="text-brandBright underline-offset-4 hover:underline">
            https://www.opturon.com/
          </Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
