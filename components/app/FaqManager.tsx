"use client";

import { useState } from "react";

type FAQ = { id: string; question: string; answer: string; active: boolean };

export function FaqManager({ initialFaqs }: { initialFaqs: FAQ[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function createFaq() {
    const response = await fetch("/api/app/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, active: true })
    });
    if (!response.ok) return;
    const json = await response.json();
    setFaqs((prev) => [json.faq, ...prev]);
    setQuestion("");
    setAnswer("");
  }

  async function removeFaq(id: string) {
    const response = await fetch(`/api/app/faqs?id=${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setFaqs((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Nueva FAQ</h3>
        <div className="mt-3 space-y-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Pregunta" />
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" rows={3} placeholder="Respuesta" />
          <button onClick={createFaq} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Guardar</button>
        </div>
      </div>

      <ul className="space-y-2">
        {faqs.map((faq) => (
          <li key={faq.id} className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
            <p className="font-medium">{faq.question}</p>
            <p className="mt-1 text-sm text-muted">{faq.answer}</p>
            <button onClick={() => removeFaq(faq.id)} className="mt-2 text-xs text-red-300 hover:underline">Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

