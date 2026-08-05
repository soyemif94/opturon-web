import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection, contactEmail } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Eliminación de datos | Opturon",
  description: "Instrucciones para solicitar la eliminación de información vinculada a Opturon y a sus integraciones habilitadas.",
  alternates: {
    canonical: "https://www.opturon.com/data-deletion"
  },
  robots: {
    index: true,
    follow: true
  }
};

const updatedAt = "5 de agosto de 2026";

export default function DataDeletionPage() {
  return (
    <LegalPageShell
      title="Eliminación de datos"
      description="Esta página explica cómo solicitar la eliminación, desvinculación, anonimización o bloqueo de información vinculada a Opturon cuando corresponda."
      updatedAt={updatedAt}
    >
      <LegalSection title="1. Quién puede solicitarlo">
        <p>
          Usuarios de Opturon y personas cuyos datos estén vinculados a la plataforma pueden solicitar la eliminación de información cuando corresponda, según el tipo de relación con la cuenta, la funcionalidad utilizada y la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection title="2. Método principal">
        <p>
          Para iniciar una solicitud, enviá un correo a{" "}
          <a href={`mailto:${contactEmail}`} className="text-brandBright underline-offset-4 hover:underline">
            {contactEmail}
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Información mínima sugerida">
        <p>Para poder ubicar la información correcta, la solicitud debería incluir, cuando sea posible:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>nombre de la persona solicitante;</li>
          <li>correo electrónico o teléfono asociado;</li>
          <li>nombre de la cuenta, negocio o empresa relacionada;</li>
          <li>descripción de los datos o de la integración cuya eliminación se solicita;</li>
          <li>indicación de si el pedido se relaciona con WhatsApp, Instagram, Meta u otra función de la plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Verificación de identidad">
        <p>
          Opturon puede solicitar información razonable para verificar identidad, titularidad de cuenta o autorización suficiente antes de procesar una solicitud. No se deben enviar contraseñas, códigos de autenticación ni documentos innecesarios por este medio.
        </p>
      </LegalSection>

      <LegalSection title="5. Tratamiento de la solicitud">
        <p>
          Según el caso, la información podrá ser eliminada, desvinculada, anonimizada o bloqueada hasta su eliminación definitiva, de acuerdo con la naturaleza del dato, la relación contractual y los requisitos técnicos aplicables.
        </p>
      </LegalSection>

      <LegalSection title="6. Excepciones de conservación">
        <p>
          Opturon puede conservar información limitada cuando resulte necesaria para obligaciones legales, facturación, prevención de fraude, seguridad, resolución de disputas, auditoría, cumplimiento de contratos o mantenimiento de copias de respaldo durante su ciclo normal de retención.
        </p>
      </LegalSection>

      <LegalSection title="7. Plazo de respuesta">
        <p>
          La solicitud será revisada y respondida dentro de un plazo razonable, de acuerdo con su complejidad y la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection title="8. Revocación desde Meta">
        <p>
          Cuando una cuenta haya conectado productos de Meta, el usuario también puede retirar permisos desde la configuración de Facebook o Instagram, según corresponda.
        </p>
        <p>
          Esa revocación no siempre elimina automáticamente datos previamente almacenados en Opturon. Si también se desea la eliminación de esos datos, es necesario usar el procedimiento indicado en esta página.
        </p>
      </LegalSection>

      <LegalSection title="9. Enlaces relacionados">
        <p>
          Política de privacidad:{" "}
          <Link href="/privacy" className="text-brandBright underline-offset-4 hover:underline">
            /privacy
          </Link>
        </p>
        <p>
          Volver al sitio principal:{" "}
          <Link href="/" className="text-brandBright underline-offset-4 hover:underline">
            https://www.opturon.com/
          </Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
