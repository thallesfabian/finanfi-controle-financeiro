import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { externalUrl } from "@/lib/request-url";

const defaults = {
  INCOME: ["Salário","Uber","99","inDrive","Venda","Renda extra","Outros"],
  EXPENSE: ["Alimentação","Combustível","Moradia","Energia","Água","Internet","Telefone","Carro","Seguro","Manutenção","Lazer","Assinaturas","Financiamentos","Outros"],
} as const;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const confirmation = String(form.get("passwordConfirmation") || "");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (name.length < 2 || !validEmail || password.length < 8 || password !== confirmation) {
    return NextResponse.redirect(externalUrl(req, "/cadastro?error=invalid"), 303);
  }
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash: await hash(password, 12), settings: { create: {} }, categories: { create: [...defaults.INCOME.map(category => ({ name: category, type: "INCOME" as const })), ...defaults.EXPENSE.map(category => ({ name: category, type: "EXPENSE" as const }))] } } });
    await createSession(user.id);
    return NextResponse.redirect(externalUrl(req, "/app/dashboard"), 303);
  } catch (error) {
    const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    return NextResponse.redirect(externalUrl(req, duplicate ? "/cadastro?error=duplicate" : "/cadastro?error=server"), 303);
  }
}
