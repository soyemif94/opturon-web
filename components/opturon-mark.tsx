export function OpturonMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-xl border border-sky-200/40 bg-sky-100/10 text-sky-300 shadow-[0_0_28px_rgba(56,189,248,0.18)] ${className}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-[62%] w-[62%]">
        <path d="M 12.5 25.9 A 10.5 10.5 0 1 1 19.5 25.9" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3.2" fill="currentColor" />
      </svg>
    </span>
  );
}
