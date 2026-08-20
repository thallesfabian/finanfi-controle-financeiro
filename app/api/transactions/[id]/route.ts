import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.redirect(externalUrl(req, "/login"));

  const { id } = await params;
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

  const form = await req.formData();
  const pagePath = transaction.type === "INCOME" ? "/app/receitas" : "/app/despesas";
  const returnMonth = Math.min(12, Math.max(1, Number(form.get("returnMonth")) || transaction.date.getUTCMonth() + 1));
  const returnYear = Math.min(2100, Math.max(2000, Number(form.get("returnYear")) || transaction.date.getUTCFullYear()));

  if (form.get("action") === "delete") {
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.redirect(externalUrl(req, `${pagePath}?month=${returnMonth}&year=${returnYear}`));
  }

  const description = String(form.get("description") || "").trim();
  const amount = Number(form.get("amount") || 0);
  const date = String(form.get("date") || "");
  const categoryId = String(form.get("categoryId") || "");

  if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
    return NextResponse.json({ error: "Preencha os dados corretamente" }, { status: 400 });
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, type: transaction.type }
  });
  if (!category) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });

  await prisma.transaction.update({
    where: { id },
    data: {
      description,
      amount: amount.toFixed(2),
      date: new Date(`${date}T12:00:00Z`),
      categoryId
    }
  });

  const [updatedYear, updatedMonth] = date.split("-");
  return NextResponse.redirect(externalUrl(req, `${pagePath}?month=${Number(updatedMonth)}&year=${Number(updatedYear)}`));
}
