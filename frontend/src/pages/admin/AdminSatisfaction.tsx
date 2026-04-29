import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomerSatisfaction } from '@/hooks/useAllFeatures';
import { Star, SmilePlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function AdminSatisfaction() {
  const { data: ratings, isLoading } = useCustomerSatisfaction();

  const avg = useMemo(() => {
    if (!ratings?.length) return 0;
    return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  }, [ratings]);

  return (
    <AdminLayout title="Kundnöjdhet">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Genomsnitt</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><span className="text-2xl font-bold">{avg.toFixed(1)}</span><Stars rating={Math.round(avg)} /></div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Antal svar</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">{ratings?.length || 0}</span></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">5-stjärniga</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">{ratings?.filter(r => r.rating === 5).length || 0}</span></CardContent>
          </Card>
        </div>
        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          !ratings?.length ? <div className="text-center py-12 text-muted-foreground"><SmilePlus className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga kundbetyg ännu</p></div> :
          <Table><TableHeader><TableRow><TableHead>Kund</TableHead><TableHead>Betyg</TableHead><TableHead>Kommentar</TableHead><TableHead>Datum</TableHead></TableRow></TableHeader>
            <TableBody>{ratings.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{(r as any).customer?.name || '—'}</TableCell>
                <TableCell><Stars rating={r.rating} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.comment || '—'}</TableCell>
                <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('sv-SE')}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
