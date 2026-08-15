import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const form = await req.formData();
  const targetDate = String(form.get("targetDate") || "");
  await prisma.vault.create({ data: {
    userId,
    name: String(form.get("name") || "").trim(),
    target: String(form.get("target")),
    balance: String(form.get("balance") || 0),
    targetDate: targetDate ? new Date(`${targetDate}T12:00:00Z`) : null
  } });
  return NextResponse.redirect(externalUrl(req, "/app/cofres"), 303);
}
