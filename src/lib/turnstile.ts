const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  fetchFn: typeof fetch = fetch
): Promise<boolean> {
  if (!token || !secretKey) return false;

  const body = new URLSearchParams({ secret: secretKey, response: token });

  const res = await fetchFn(VERIFY_URL, { method: 'POST', body });
  if (!res.ok) return false;

  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
