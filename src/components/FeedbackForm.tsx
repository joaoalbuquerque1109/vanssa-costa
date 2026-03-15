"use client";

import { FormEvent, useState } from "react";
import { Star } from "lucide-react";

const MAX_RATING = 5;

export function FeedbackForm() {
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState(5);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, texto, nota }),
      });

      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setFeedback(data.error ?? "Falha ao enviar feedback.");
        return;
      }

      setNome("");
      setTexto("");
      setNota(5);
      setFeedback(data.message ?? "Feedback enviado com sucesso.");
    } catch {
      setFeedback("Falha ao enviar feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900" htmlFor="feedback-nome">
            Nome
          </label>
          <input
            id="feedback-nome"
            className="form-field"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">Nota</span>
          <div className="flex items-center gap-2">
            {Array.from({ length: MAX_RATING + 1 }).map((_, index) => (
              <button
                key={index}
                type="button"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  nota === index ? "border-amber-400 bg-amber-50 text-amber-500" : "border-slate-200 bg-white text-slate-300 hover:text-amber-500"
                }`}
                onClick={() => setNota(index)}
                aria-label={`Selecionar nota ${index}`}
              >
                <Star size={18} className={index > 0 ? "fill-current" : ""} />
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Escolha de 0 a 5 estrelas.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-900" htmlFor="feedback-texto">
          Comentário
        </label>
        <textarea
          id="feedback-texto"
          className="form-field min-h-36"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          required
        />
      </div>

      {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}

      <button type="submit" className="legacy-button" disabled={saving}>
        {saving ? "Enviando..." : "Enviar feedback"}
      </button>
    </form>
  );
}
