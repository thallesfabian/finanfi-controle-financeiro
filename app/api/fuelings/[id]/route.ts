import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";
import { monthRedirect } from "@/lib/month";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  const { id } = await params;
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const fueling = await prisma.fueling.findFirst({ where: { id, userId } });
  if (!fueling) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const form = await req.formData();
  let redirectDate = fueling.date.toISOString();
  if (form.get("action") === "delete") {
    await prisma.fueling.delete({ where: { id } });
  } else {
    const liters = Math.max(0.001, Number(form.get("liters") || 0));
    const price = Math.max(0.001, Number(form.get("pricePerLiter") || 0));
    const odometer = String(form.get("odometer") || "").trim();
    redirectDate = String(form.get("date"));
    await prisma.fueling.update({ where: { id }, data: {
      date: new Date(`${String(form.get("date"))}T12:00:00Z`),
      liters: String(liters),
      pricePerLiter: String(price),
      total: String(liters * price),
      odometer: odometer || null
    } });
  }
  return NextResponse.redirect(externalUrl(req, monthRedirect("/app/combustivel", form, redirectDate)), 303);
}
