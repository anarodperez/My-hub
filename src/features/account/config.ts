export function readAccountConfig(url: string | undefined, key: string | undefined): { url: string; key: string } | null {
  if (!url || !key?.startsWith('sb_publishable_')) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    return { url, key };
  } catch { return null; }
}
