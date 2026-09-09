import { corsHeaders } from '../_shared/cors.ts';

type MinimalClient = {
  auth: { getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          not: (column: string, operator: string, value: unknown) => {
            limit: (count: number) => Promise<{ data: Array<{ company_id: string | null }> | null; error: unknown }>;
          };
        };
      };
    };
  };
};

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// Returnerar den publika, referrer-begränsade Google Maps-webbnyckeln till
// inloggade företagsadministratörer. Behörigheten härleds enbart från
// user_roles (aldrig profiles.role eller user_metadata) och läses med
// anroparens egen RLS-klient.
export async function handleMapsConfig(req: Request, db: MinimalClient, env: (name: string) => string | undefined) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!token) return json({ error: 'Logga in för att använda kartfunktionerna.' }, 401);

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return json({ error: 'Logga in för att använda kartfunktionerna.' }, 401);

  const roles = await db
    .from('user_roles')
    .select('company_id')
    .eq('user_id', data.user.id)
    .eq('role', 'admin')
    .not('company_id', 'is', null)
    .limit(1);

  if (roles.error) return json({ error: 'Behörigheten kunde inte kontrolleras.' }, 500);
  if (!roles.data?.some(row => Boolean(row.company_id))) return json({ error: 'Företagsadministratör krävs.' }, 403);

  const key = env('GOOGLE_MAPS_BROWSER_KEY');
  if (!key) return json({ configured: false }, 200);

  return json({ configured: true, key }, 200);
}
