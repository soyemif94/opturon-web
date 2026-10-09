import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050b14] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(249,115,22,0.12),transparent_30%)]" aria-hidden="true" />
      <Suspense fallback={<p className="text-sm text-muted">Cargando registro…</p>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
