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

  const [preparing, setPreparing] = useState(false);

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const THRESHOLD = 50000;
  const level = Math.floor(total / THRESHOLD);

  const isInterpretationError = (msg: string) =>
    msg?.toLowerCase().includes("entender") ||
    msg?.toLowerCase().includes("interpret") ||
    msg?.toLowerCase().includes("parse");

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
      setPreparing(false);

      if ("vibrate" in navigator) {
        navigator.vibrate(30);
      }

      sendToAI(text);
    };

    setPreparing(true);

    setTimeout(() => {
      recognition.start();
    }, 2000);
  }

  function formatDate(iso: string) {
    return (iso || "").split("T")[0];
  }

  function formatMoney(n: number) {
    return (n || 0).toLocaleString("es-CO");
  }

  function badgeFor(category: string) {
    const c = (category || "").toLowerCase();
    if (c.includes("comida") || c.includes("alimento") || c.includes("rest"))
      return "🍔";
    if (c.includes("trans") || c.includes("uber") || c.includes("taxi"))
      return "🚕";
    if (c.includes("arriendo") || c.includes("renta")) return "🏠";
    if (c.includes("salud") || c.includes("farm")) return "💊";
    if (c.includes("entre")) return "🎮";
    return "🧾";
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

  function resetFlow() {
    setLoading(false);
    setPreparing(false);
    setError("");
    setExpense(null);
    // opcional:
    // setTranscript("");
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 20% -10%, #e9f6ff 0%, transparent 60%), radial-gradient(1000px 500px at 110% 10%, #fff1e8 0%, transparent 55%), #fbfbfd",
      color: "#0f172a",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji",
    },
    container: {
      maxWidth: 760,
      margin: "0 auto",
      padding: "16px 14px 28px",
    },
    header: {
      position: "sticky",
      top: 0,
      zIndex: 10,
      backdropFilter: "blur(10px)",
      background: "rgba(251,251,253,0.7)",
      borderBottom: "1px solid rgba(15,23,42,0.08)",
      padding: "14px 14px",
      margin: "-16px -14px 16px",
    },
    titleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    h1: { fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.2 },
    subtitle: { margin: "6px 0 0", color: "#475569", fontSize: 13 },
    chip: {
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "white",
      color: "#0f172a",
      whiteSpace: "nowrap",
    },
    section: { display: "grid", gap: 12 },
    card: {
      background: "white",
      border: "1px solid rgba(15,23,42,0.08)",
      borderRadius: 16,
      padding: 14,
      boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
    },
    label: { fontSize: 12, color: "#64748b", marginBottom: 6 },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,0.15)",
      outline: "none",
      fontSize: 16,
    },
    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
    primaryBtn: {
      width: "100%",
      padding: "14px 14px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "#0f172a",
      color: "white",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 10px 25px rgba(15,23,42,0.18)",
    },
    secondaryBtn: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.12)",
      background: "white",
      color: "#0f172a",
      fontSize: 15,
      fontWeight: 650,
      cursor: "pointer",
    },
    muted: { color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.35 },
    danger: {
      background: "rgba(220,38,38,0.08)",
      border: "1px solid rgba(220,38,38,0.25)",
      color: "#b91c1c",
      borderRadius: 14,
      padding: "10px 12px",
      fontSize: 13,
    },
    success: {
      background: "rgba(16,185,129,0.10)",
      border: "1px solid rgba(16,185,129,0.25)",
      borderRadius: 14,
      padding: "10px 12px",
    },
    metric: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    bigNumber: { fontSize: 22, fontWeight: 850, letterSpacing: -0.4 },
    small: { fontSize: 12, color: "#64748b" },
    list: { display: "grid", gap: 10, marginTop: 10 },
    listItem: {
      display: "grid",
      gridTemplateColumns: "28px 1fr auto",
      gap: 10,
      alignItems: "start",
      padding: "10px 10px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "rgba(15,23,42,0.02)",
    },
    liTitle: { fontWeight: 700, fontSize: 14, margin: 0 },
    liDesc: { margin: "2px 0 0", fontSize: 13, color: "#475569" },
    amount: { fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
    divider: {
      height: 1,
      background: "rgba(15,23,42,0.08)",
      margin: "6px 0 0",
    },
    bottomBar: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      padding: "12px 14px 14px",
      background: "rgba(251,251,253,0.8)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(15,23,42,0.10)",
      zIndex: 50,
    },
    bottomInner: {
      maxWidth: 760,
      margin: "0 auto",
      display: "grid",
      gap: 10,
    },
    hint: {
      fontSize: 12,
      color: "#64748b",
      margin: 0,
      textAlign: "center",
    },
    bottomNote: {
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.18)",
      background: "rgba(15,23,42,0.55)",
      color: "white",
      textAlign: "center",
      boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    },
    bottomNoteTitle: {
      fontSize: 14,
      fontWeight: 800,
      margin: 0,
    },
    bottomNoteSub: {
      fontSize: 13,
      margin: "6px 0 0",
      color: "rgba(255,255,255,0.85)",
      lineHeight: 1.35,
    },
  };

  return (
    <main style={styles.page}>
      <div style={{ ...styles.container, paddingBottom: 110 }}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div>
              <h1 style={styles.h1}>Where is my money? 💸</h1>
              <p style={styles.subtitle}>
                Habla, guarda, y mira en qué se va tu plata.
              </p>
            </div>
            <div style={styles.chip}>
              Total: <strong>{formatMoney(total)}</strong> COP
            </div>
          </div>
        </div>

        <div style={styles.section}>
          {/* Nickname */}
          {!nickname ? (
            <div style={styles.card}>
              <div style={styles.label}>
                Tu nombre (solo en este dispositivo)
              </div>
              <input
                placeholder="Ej: Sergio"
                style={styles.input}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) {
                    saveNickname(v);
                    setNickname(v);
                  }
                }}
              />
              <p style={{ ...styles.muted, marginTop: 10 }}>
                Tip: así verás “Hola, Sergio 👋” cada vez que abras la app.
              </p>
            </div>
          ) : (
            <div style={styles.card}>
              <p style={{ margin: 0 }}>
                Hola, <strong>{nickname}</strong> 👋
              </p>
              <p style={{ ...styles.muted, marginTop: 6 }}>
                Toca el botón y di: <em>“Gasté 12.000 en almuerzo”</em>.
              </p>
            </div>
          )}

          <div style={styles.card}>
            {transcript && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    ...styles.label,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Texto reconocido</span>
                  <span style={{ cursor: "pointer" }}>✏️</span>
                </div>

                <div style={{ fontSize: 14, color: "#0f172a" }}>
                  {transcript}
                </div>
              </div>
            )}

            {error && isInterpretationError(error) && (
              <div style={styles.danger}>
                <p style={{ margin: 0, fontWeight: 800 }}>
                  🤖 No logré entender el gasto
                </p>
                <ul style={{ margin: "6px 0 0 16px", fontSize: 13 }}>
                  <li>Habla a velocidad normal</li>
                  <li>Espera 3 segundos después de presionar el botón</li>
                  <li>Sin palabras coloquiales</li>
                  <li>Usa el nombre básico del producto</li>
                </ul>
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  <strong>Ejemplo:</strong> “Gasté 12.000 en almuerzo”
                </p>
              </div>
            )}

            {error && !isInterpretationError(error) && (
              <div style={styles.danger}>
                <strong>Error:</strong> {error}
                <p style={{ margin: 0, fontWeight: 800 }}>
                  🤖 No logré entender el gasto
                </p>
                <ul style={{ margin: "6px 0 0 16px", fontSize: 13 }}>
                  <li>Habla a velocidad normal</li>
                  <li>Sin palabras coloquiales</li>
                  <li>Usa el nombre básico del producto</li>
                </ul>
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  <strong>Ejemplo:</strong> “Gasté 12.000 en almuerzo”
                </p>
              </div>
            )}
          </div>

          {/* Detected expense */}
          {expense && (
            <div style={{ ...styles.card, ...styles.success }}>
              <p style={{ margin: 0, fontWeight: 800 }}>
                {badgeFor(expense.category)} Gasto detectado
              </p>

              <div style={styles.divider} />
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                <div style={styles.metric}>
                  <span style={styles.small}>Monto</span>
                  <span style={{ fontWeight: 800 }}>
                    {formatMoney(Number(expense.amount))} {expense.currency}
                  </span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.small}>Categoría</span>
                  <span style={{ fontWeight: 700 }}>{expense.category}</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.small}>Descripción</span>
                  <span style={{ fontWeight: 700 }}>{expense.description}</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.small}>Fecha</span>
                  <span style={{ fontWeight: 700 }}>
                    {formatDate(expense.date)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Total + warning */}
          <div style={styles.card}>
            <div style={styles.metric}>
              <div>
                <div style={styles.small}>Total gastado</div>
                <div style={styles.bigNumber}>{formatMoney(total)} COP</div>
              </div>
              <div style={styles.chip}>
                Meta IA: <strong>{formatMoney(THRESHOLD)}</strong>+
              </div>
            </div>

            {level > 0 && (
              <div style={{ ...styles.danger, marginTop: 10 }}>
                ⚠️ Has superado {formatMoney(level * THRESHOLD)} COP
              </div>
            )}

            <p style={{ ...styles.muted, marginTop: 10 }}>
              🧠 Al llegar a {formatMoney(THRESHOLD)} COP, la IA te sugiere
              posibles “fugas” y hábitos a mejorar.
            </p>

            <button
              onClick={analyze}
              disabled={total < THRESHOLD || analyzing}
              style={{
                ...styles.secondaryBtn,
                opacity: total < THRESHOLD || analyzing ? 0.55 : 1,
                marginTop: 10,
              }}
            >
              {analyzing ? "Analizando..." : "🔍 Analizar fugas de dinero"}
            </button>

            {total < THRESHOLD && (
              <p style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                Disponible cuando gastes más de {formatMoney(THRESHOLD)} COP
              </p>
            )}

            {insights.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Insights</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {insights.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(15,23,42,0.08)",
                        background: "rgba(15,23,42,0.02)",
                        fontSize: 13,
                        color: "#0f172a",
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History */}
          {expenses.length > 0 && (
            <div style={styles.card}>
              <div style={styles.titleRow}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>
                  📜 Historial
                </h2>
                <span style={styles.small}>{expenses.length} registros</span>
              </div>

              <div style={styles.list}>
                {expenses.slice(0, 20).map((e, i) => (
                  <div key={i} style={styles.listItem}>
                    <div style={{ fontSize: 18, lineHeight: 1 }}>
                      {badgeFor(e.category)}
                    </div>
                    <div>
                      <p style={styles.liTitle}>
                        {e.category} · {formatDate(e.date)}
                      </p>
                      <p style={styles.liDesc}>{e.description}</p>
                    </div>
                    <div style={styles.amount}>
                      {formatMoney(Number(e.amount))} {e.currency}
                    </div>
                  </div>
                ))}
              </div>

              {expenses.length > 20 && (
                <p style={{ ...styles.muted, marginTop: 10 }}>
                  Mostrando 20 más recientes.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={styles.bottomBar}>
        <div style={styles.bottomInner}>
          <div style={styles.bottomNote}>
            <p style={styles.bottomNoteTitle}>
              {preparing ? "🎙️ Habla en 2 segundos…" : "💡 Ejemplo"}
            </p>
            <p style={styles.bottomNoteSub}>
              {preparing
                ? "Espera un momento y luego habla a velocidad normal."
                : "“Gasté 12.000 en almuerzo”"}
            </p>
          </div>

          <button
            onClick={onSpeakClick}
            disabled={loading}
            style={{
              ...styles.primaryBtn,
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Procesando..." : "🎙️ Toca y habla"}
          </button>
          {loading && (
            <button
              onClick={resetFlow}
              style={{
                ...styles.secondaryBtn,
                background: "rgba(255,255,255,0.9)",
              }}
            >
              🔁 Reintentar
            </button>
          )}
          <p
            style={{
              fontSize: 11,
              color: "#94a3b8",
              textAlign: "center",
              margin: 0,
            }}
          >
            Habla natural. La IA entiende frases incompletas.
          </p>
        </div>
      </div>
    </main>
  );
}
