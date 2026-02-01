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

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [insights, setInsights] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const THRESHOLD = 50000;
  const level = Math.floor(total / THRESHOLD);

  useEffect(() => {
    setNickname(loadNickname());
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    fetch(`/api/expenses?userId=${userId}`)
      .then((res) => res.json())
      .then(setExpenses)
      .catch(console.error);
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

      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...data }),
      });

      setExpenses((prev) => [data as Expense, ...prev]);
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

  function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  async function analyze() {
    try {
      setAnalyzing(true);
      setError("");

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses }),
      });

      const data = await res.json();
      const text = data?.text || "";

      const lines = text
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);

      setInsights(lines);
    } catch (e: any) {
      setError(e?.message || "Error analizando");
    } finally {
      setAnalyzing(false);
    }
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

      <p style={{ marginTop: 16, fontSize: 18 }}>
        <strong>Total:</strong> {total.toLocaleString("es-CO")} COP
      </p>

      {level > 0 && (
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 8 }}>
          ⚠️ Has gastado más de {(level * THRESHOLD).toLocaleString("es-CO")}{" "}
          COP
        </p>
      )}

      <p style={{ marginTop: 16, color: "#555" }}>
        🧠 Este análisis usa IA para detectar posibles fugas de dinero y hábitos
        de gasto llamativos.
      </p>
      <button
        onClick={analyze}
        disabled={total < 50000 || analyzing}
        style={{ opacity: total < 50000 ? 0.5 : 1 }}
      >
        {analyzing ? "Analizando..." : "🔍 Analizar fugas de dinero"}
      </button>

      {total < THRESHOLD && (
        <p style={{ fontSize: 12, color: "#999" }}>
          Disponible cuando gastes más de 50.000 COP
        </p>
      )}

      {insights.length > 0 && (
        <ul style={{ marginTop: 12 }}>
          {insights.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}

      {expenses.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>📜 Historial</h2>
          {expenses.map((e, i) => (
            <p key={i}>
              {formatDate(e.date)} – {e.category}: {e.description} ({e.amount}{" "}
              {e.currency})
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
