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
  const recurring = form.get("recurring") === "on";
  await prisma.bill.create({ data: { userId, name: String(form.get("name") || "").trim(), amount: String(form.get("amount")), dueDay: Number(form.get("dueDay")), category: String(form.get("category") || "").trim(), paymentMethod: String(form.get("paymentMethod") || ""), recurring, month: recurring ? null : month, year: recurring ? null : year } });
  return NextResponse.redirect(externalUrl(req, `/app/contas?month=${month}&year=${year}`), 303);
}
