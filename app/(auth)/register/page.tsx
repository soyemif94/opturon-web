import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="container-opt flex min-h-screen items-center justify-center py-12">
      <Suspense fallback={<p className="text-sm text-muted">Cargando registro…</p>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
