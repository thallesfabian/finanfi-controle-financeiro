import { NextRequest,NextResponse } from "next/server";import { clearSession } from "@/lib/auth";import { externalUrl } from "@/lib/request-url";
export async function POST(req:NextRequest){await clearSession();return NextResponse.redirect(externalUrl(req,"/login"),303)}
