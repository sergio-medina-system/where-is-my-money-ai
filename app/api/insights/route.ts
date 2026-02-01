import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { expenses } = await req.json();

  if (!Array.isArray(expenses) || expenses.length === 0) {
    return NextResponse.json({
      text: "No hay datos suficientes para analizar.",
    });
  }

  const prompt = `
Analiza estos gastos y detecta posibles fugas de dinero.
El texto FINAL NO debe superar 300 caracteres.
Si es más largo, resume hasta cumplir el límite.
No uses introducciones largas ni conclusiones genéricas.
Devuelve:
- Categoría con mayor gasto
- Gastos repetidos o impulsivos
- 3 recomendaciones claras y accionables
Sé breve y humano.

Gastos:
${JSON.stringify(expenses)}
`;

  const r = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const text = r.output_text || "No se pudo generar el análisis.";
  return NextResponse.json({ text });
}
