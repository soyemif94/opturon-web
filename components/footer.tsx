export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-surface/50">
      <div className="container-opt py-8 text-sm text-muted flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Opturon. Todos los derechos reservados.</p>
        <p>Marketing + AI + Experiencias Digitales</p>
      </div>
    </footer>
  );
}
