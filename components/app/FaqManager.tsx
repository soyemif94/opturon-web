"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

type FAQ = { id: string; question: string; answer: string; active: boolean };

export function FaqManager({ initialFaqs }: { initialFaqs: FAQ[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({ tone: null, text: "" });

  async function createFaq() {
    if (question.trim().length < 3 || answer.trim().length < 3) {
      setFeedback({ tone: "error", text: "Completá una pregunta y respuesta de al menos 3 caracteres." });
      toast.error("FAQ incompleta");
      return;
    }

    setIsSaving(true);
    setFeedback({ tone: null, text: "" });

    try {
      const response = await fetch("/api/app/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, active: true })
      });
      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.error?.formErrors?.[0] || json?.error || "No se pudo guardar la FAQ.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar FAQ", String(message));
        return;
      }
      const json = await response.json();
      setFaqs((prev) => [json.faq, ...prev]);
      setQuestion("");
      setAnswer("");
      setFeedback({ tone: "success", text: "FAQ guardada correctamente." });
      toast.success("FAQ creada");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red al guardar la FAQ." });
      toast.error("Error de red", "No pudimos guardar la FAQ.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeFaq(id: string) {
    setRemovingId(id);
    try {
      const response = await fetch(`/api/app/faqs?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await safeJson(response);
        toast.error("No se pudo eliminar", String(json?.error || "Intentá nuevamente."));
        return;
      }
      setFaqs((prev) => prev.filter((item) => item.id !== id));
      toast.success("FAQ eliminada");
    } catch {
      toast.error("Error de red", "No pudimos eliminar la FAQ.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Nueva FAQ</h3>
        <div className="mt-3 space-y-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Pregunta" />
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" rows={3} placeholder="Respuesta" />
          <div className="flex items-center gap-3">
            <button onClick={createFaq} disabled={isSaving} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            {feedback.tone ? <p className={`text-xs ${feedback.tone === "success" ? "text-green-400" : "text-red-300"}`}>{feedback.text}</p> : null}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {faqs.map((faq) => (
          <li key={faq.id} className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
            <p className="font-medium">{faq.question}</p>
            <p className="mt-1 text-sm text-muted">{faq.answer}</p>
            <button onClick={() => removeFaq(faq.id)} disabled={removingId === faq.id} className="mt-2 text-xs text-red-300 hover:underline disabled:opacity-50">
              {removingId === faq.id ? "Eliminando..." : "Eliminar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
