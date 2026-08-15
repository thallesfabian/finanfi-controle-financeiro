import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  const { id } = await params;
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const form = await req.formData();
  const vault = await prisma.vault.findFirst({ where: { id, userId } });
  if (!vault) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const action = String(form.get("action") || "deposit");
  if (action === "delete") await prisma.vault.delete({ where: { id } });
  else if (action === "plan") {
    const targetDate = String(form.get("targetDate") || "");
    await prisma.vault.update({ where: { id }, data: { target: String(form.get("target")), targetDate: targetDate ? new Date(`${targetDate}T12:00:00Z`) : null } });
  } else {
    const deposit = Math.max(0, Number(form.get("deposit") || 0));
    if (deposit > 0) await prisma.vault.update({ where: { id }, data: { balance: { increment: String(deposit) } } });
  }
  return NextResponse.redirect(externalUrl(req, "/app/cofres"), 303);
}
