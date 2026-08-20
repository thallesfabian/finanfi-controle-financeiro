import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  const { id } = await params;
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const bill = await prisma.bill.findFirst({ where: { id, userId } });
  if (!bill) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const form = await req.formData();
  const month = Math.min(12, Math.max(1, Number(form.get("month"))));
  const year = Math.min(2100, Math.max(2000, Number(form.get("year"))));
  const action = String(form.get("action") || "toggle");
  if (action === "delete") await prisma.bill.delete({ where: { id } });
  else if (action === "update") {
    const data = {
      name: String(form.get("name") || "").trim(),
      amount: String(Math.max(0.01, Number(form.get("amount") || 0))),
      dueDay: Math.min(31, Math.max(1, Number(form.get("dueDay")))),
      category: String(form.get("category") || "").trim(),
      paymentMethod: String(form.get("paymentMethod") || "")
    };
    if (bill.recurring) {
      await prisma.billMonthOverride.upsert({
        where: { billId_month_year: { billId: id, month, year } },
        update: data,
        create: { billId: id, month, year, ...data }
      });
    } else {
      await prisma.bill.update({ where: { id }, data });
    }
  } else {
    const payment = await prisma.billPayment.findUnique({ where: { billId_month_year: { billId: id, month, year } } });
    if (payment) await prisma.billPayment.delete({ where: { id: payment.id } });
    else await prisma.billPayment.create({ data: { billId: id, month, year } });
  }
  return NextResponse.redirect(externalUrl(req, `/app/contas?month=${month}&year=${year}`), 303);
}
