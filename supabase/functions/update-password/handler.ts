const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

// Keep a tombstone so old clients cannot reach cross-company provisioning.
// Driver creation uses the separate, tenant-bound create-driver endpoint.
export function retiredUpdatePassword(request: Request): Response {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  return new Response(JSON.stringify({ error: 'Funktionen har tagits bort. Använd en återställningslänk.' }), {
    status: 410,
    headers,
  });
}
