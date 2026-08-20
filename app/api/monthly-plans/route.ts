import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const form = await req.formData();
  const month = Math.min(12, Math.max(1, Number(form.get("month"))));
  const year = Math.min(2100, Math.max(2000, Number(form.get("year"))));
  const income = Math.max(0, Number(form.get("income") || 0));
  await prisma.monthlyPlan.upsert({ where: { userId_month_year: { userId, month, year } }, update: { income: String(income) }, create: { userId, month, year, income: String(income) } });
  return NextResponse.redirect(externalUrl(req, `/app/contas?month=${month}&year=${year}`), 303);
}
