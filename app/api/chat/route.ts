import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
        category: { type: "string" },
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
            "Si no hay currency usa COP. La fecha debe ser YYYY-MM-DD. Si no hay fecha usa hoy.",
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
    const parsed = JSON.parse(response.output_text);

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
