import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockDrivers, mockAssignments } from '@/lib/mock-data';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AdminDrivers() {
  const [open, setOpen] = useState(false);

  const getCompletedCount = (driverId: string) =>
    mockAssignments.filter(a => a.assigned_driver_id === driverId && a.status === 'completed').length;

  return (
    <AdminLayout title="Chaufförshantering">
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chaufförer</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Ny chaufför
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lägg till ny chaufför</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                toast.success('Inbjudan skickad!');
                setOpen(false);
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="driverName">Namn</Label>
                  <Input id="driverName" placeholder="Förnamn Efternamn" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverEmail">E-post</Label>
                  <Input id="driverEmail" type="email" placeholder="namn@exempel.se" required />
                </div>
                <Button type="submit" className="w-full">Skicka inbjudan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead className="text-center">Slutförda uppdrag</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDrivers.map(driver => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{driver.email}</TableCell>
                    <TableCell className="text-center">{getCompletedCount(driver.id)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => toast.success('Chaufför borttagen')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
