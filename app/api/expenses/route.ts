import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

//const prisma = new PrismaClient();

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, amount, currency, category, description, date } = body;

  if (!userId)
    return NextResponse.json({ error: "Falta userId" }, { status: 400 });

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  const saved = await prisma.expense.create({
    data: { userId, amount, currency, category, description, date },
  });

  return NextResponse.json(saved);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "Falta userId" }, { status: 400 });

  const items = await prisma.expense.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}
