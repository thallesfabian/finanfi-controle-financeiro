import { NextRequest } from "next/server";

export function externalUrl(request: NextRequest, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol || (host.startsWith("localhost") ? "http" : "https");

  return new URL(path, `${protocol}://${host}`);
}
