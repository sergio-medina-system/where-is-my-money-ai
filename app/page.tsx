"use client";

import { useState, useEffect } from "react";

type Expense = {
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
};

const loadNickname = () =>
  typeof window === "undefined" ? null : localStorage.getItem("nickname");

const saveNickname = (v: string) => localStorage.setItem("nickname", v);

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    setNickname(loadNickname());
  }, []);

  function getOrCreateUserId() {
    if (typeof window === "undefined") return null;

    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("userId", userId);
    }
    return userId;
  }

  async function sendToAI(text: string) {
    setLoading(true);
    setError("");
    setExpense(null);

    const userId = getOrCreateUserId();
    if (!userId) {
      setError("No se pudo obtener el usuario");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userId }),
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

      {nickname && (
        <p>
          Hola, <strong>{nickname}</strong> 👋
        </p>
      )}

      {!nickname && (
        <div style={{ marginTop: 16 }}>
          <p>¿Cómo te llamamos?</p>
          <input
            placeholder="Ej: Sergio"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) {
                saveNickname(v);
                setNickname(v);
              }
            }}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />
        </div>
      )}

      <button
        onClick={onSpeakClick}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
          fontSize: 16,
        }}
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
          <h2>✅ Gasto detectado</h2>
          <p>
            <strong>Monto:</strong> {expense.amount} {expense.currency}
          </p>
          <p>
            <strong>Categoría:</strong> {expense.category}
          </p>
          <p>
            <strong>Descripción:</strong> {expense.description}
          </p>
          <p>
            <strong>Fecha:</strong> {expense.date}
          </p>
        </div>
      )}
    </main>
  );
}
