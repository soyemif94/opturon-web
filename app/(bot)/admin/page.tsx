import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AdminPlaceholderPage() {
  return (
    <section className="container-opt py-20">
      <Card className="p-8 max-w-2xl mx-auto text-center">
        <ShieldCheck className="mx-auto mb-4 text-brand" />
        <h1 className="text-3xl font-semibold mb-2">/admin próximamente</h1>
        <p className="text-muted">Base preparada para futuros endpoints administrativos.</p>
      </Card>
    </section>
  );
}
