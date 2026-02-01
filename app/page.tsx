"use client";

import { useState } from "react";

type Expense = {
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
};

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendToAI(text: string) {
    setLoading(true);
    setError("");
    setExpense(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.detail || data?.error || "Error llamando a /api/chat");
        return;
      }

      setExpense(data as Expense);
    } catch (e: any) {
      setError(e?.message || "Error de red");
    } finally {
      setLoading(false);
    }
  }

  function onSpeakClick() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz 😕");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-CO";
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      sendToAI(text);
    };

    recognition.start();
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Where is my money? 💸</h1>
      <p style={{ marginTop: 8, fontSize: 16 }}>
        MVP: registrar gastos por voz.
      </p>

      <button
        onClick={onSpeakClick}
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
          fontSize: 16,
        }}
        disabled={loading}
      >
        {loading ? "Procesando..." : "🎙️ Hablar"}
      </button>

      {transcript && (
        <p style={{ marginTop: 16 }}>
          <strong>Texto reconocido:</strong> {transcript}
        </p>
      )}

      {error && (
        <p style={{ marginTop: 16, color: "crimson" }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      {expense && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>✅ Gasto detectado</h2>
          <p style={{ margin: "8px 0 0" }}>
            <strong>Monto:</strong> {expense.amount} {expense.currency}
          </p>
          <p style={{ margin: "6px 0 0" }}>
            <strong>Categoría:</strong> {expense.category}
          </p>
          <p style={{ margin: "6px 0 0" }}>
            <strong>Descripción:</strong> {expense.description}
          </p>
          <p style={{ margin: "6px 0 0" }}>
            <strong>Fecha:</strong> {expense.date}
          </p>
        </div>
      )}
    </main>
  );
}
