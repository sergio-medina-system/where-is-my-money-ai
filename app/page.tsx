"use client";
import { useState } from "react";

export default function Home() {
  const [transcript, setTranscript] = useState("");

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
    };

    recognition.start();
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
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
      >
        🎙️ Hablar
      </button>
      {transcript && (
        <p style={{ marginTop: 16 }}>
          <strong>Texto reconocido:</strong> {transcript}
        </p>
      )}
    </main>
  );
}
