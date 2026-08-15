import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "development-secret-change-me");
export async function createSession(userId: string) {
  const token = await new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key());
  (await cookies()).set("finanfi_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
}
export async function sessionUserId() {
  const token = (await cookies()).get("finanfi_session")?.value;
  if (!token) return null;
  try { return String((await jwtVerify(token, key())).payload.userId); } catch { return null; }
}
export async function requireUser() { const id = await sessionUserId(); if (!id) redirect("/login"); return id; }
export async function clearSession() { (await cookies()).delete("finanfi_session"); }
