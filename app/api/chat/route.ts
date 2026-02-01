import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CATEGORIES = [
  "Comida",
  "Bebidas",
  "Transporte",
  "Vivienda",
  "Salud",
  "Ocio",
  "Compras",
  "Servicios",
  "Educación",
  "Otros",
] as const;

const today = new Date().toISOString().slice(0, 10);

function safeJsonParse(s: string) {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  return JSON.parse(s.slice(start, end + 1));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
        description: { type: "string" },
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
      },
      required: ["amount", "currency", "category", "description", "date"],
    } as const;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Eres un asistente de gastos. Extrae UN solo gasto del texto en español. " +
            "Si no hay currency usa COP. La fecha debe ser YYYY-MM-DD. Si no hay fecha usa hoy." +
            "La categoría debe ser UNA de: " +
            CATEGORIES.join(", ") +
            ". " +
            "Devuelve SOLO JSON. No agregues texto. ",
        },
        { role: "user", content: text },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "expense",
          schema,
          strict: true,
        },
      },
    });

    // output_text será un string que contiene JSON válido (por strict:true)
    const out: any = response;
    const textOut = out.output_text as string | undefined;

    if (!textOut) {
      return NextResponse.json({ error: "Sin output_text" }, { status: 500 });
    }

    const raw = response.output_text; // string
    const parsed = safeJsonParse(raw);

    parsed.date = today;

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("OPENAI_ERROR:", err);

    const message =
      err?.message ||
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      "Error desconocido";

    return NextResponse.json(
      { error: "Error llamando al modelo", detail: message },
      { status: 500 },
    );
  }
}
