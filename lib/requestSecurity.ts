export function isSameOriginRequest(req: Request) {
  const origin = req.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === new URL(req.url).origin;
}
