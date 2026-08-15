import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const userId = await sessionUserId();
  const { id } = await params;
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const journey = await prisma.journey.findFirst({ where: { id, userId } });
  if (!journey) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const form = await req.formData();
  if (form.get("action") === "delete") {
    await prisma.journey.delete({ where: { id } });
    return NextResponse.redirect(externalUrl(req, "/app/motorista"), 303);
  }

  const date = String(form.get("date"));
  const start = String(form.get("startTime"));
  const end = String(form.get("endTime"));
  const distance = Math.max(0, Number(form.get("distanceKm") || 0));
  const costs = [["Combustível","fuel"],["Alimentação","food"],["Pedágio","toll"],["Outros","otherCost"]]
    .map(([category,key]) => ({ category, amount: String(form.get(key) || 0) }))
    .filter(item => Number(item.amount) > 0);

  await prisma.$transaction([
    prisma.journeyCost.deleteMany({ where: { journeyId: id } }),
    prisma.journey.update({ where: { id }, data: {
      date: new Date(`${date}T12:00:00Z`),
      startTime: new Date(`${date}T${start}:00`),
      endTime: new Date(`${date}T${end}:00`),
      startKm: "0",
      endKm: String(distance),
      uber: String(form.get("uber") || 0),
      ninetyNine: String(form.get("ninetyNine") || 0),
      inDrive: String(form.get("inDrive") || 0),
      otherApps: String(form.get("otherApps") || 0),
      tips: String(form.get("tips") || 0),
      otherIncome: String(form.get("otherIncome") || 0),
      costs: { create: costs }
    } })
  ]);
  return NextResponse.redirect(externalUrl(req, "/app/motorista"), 303);
}
