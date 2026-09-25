export type ProofRecord = { proof_photo_path?: string | null; signature_path?: string | null; consignment_photo_url?: string | null; signature_url?: string | null };
export function proofPath(path?: string | null, legacy?: string | null): string | null {
  const value = path || legacy;
  if (!value) return null;
  const raw = value.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//, '').split('?')[0];
  if (!/^(consignment-notes|signatures)\/.+/.test(raw)) return null;
  try { return decodeURIComponent(raw); } catch { return null; }
}
export async function signProofs<T extends ProofRecord>(rows: T[], sign: (bucket: string, paths: string[], expires: number) => Promise<{ path: string | null; signedUrl: string | null }[]>): Promise<Array<Omit<T, "consignment_photo_url" | "signature_url"> & { consignment_photo_url: string | null; signature_url: string | null }>> {
  const groups = new Map<string, Set<string>>();
  const paths = rows.map(row => [proofPath(row.proof_photo_path, row.consignment_photo_url), proofPath(row.signature_path, row.signature_url)]);
  for (const pair of paths) for (const path of pair) {
    if (!path) continue;
    const slash = path.indexOf('/'), bucket = path.slice(0, slash), key = path.slice(slash + 1);
    if (!groups.has(bucket)) groups.set(bucket, new Set());
    groups.get(bucket)?.add(key);
  }
  const urls = new Map<string, string>();
  await Promise.all([...groups].map(async ([bucket, keys]) => {
    for (const item of await sign(bucket, [...keys], 3600)) {
      if (item.path && item.signedUrl) urls.set(`${bucket}/${item.path}`, item.signedUrl);
    }
  }));
  return rows.map((row, i) => ({ ...row, consignment_photo_url: urls.get(paths[i][0] ?? '') ?? null, signature_url: urls.get(paths[i][1] ?? '') ?? null }));
}
