import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockCustomers, mockDrivers } from '@/lib/mock-data';
import { toast } from 'sonner';
import { ArrowLeft, Plus } from 'lucide-react';

export default function AdminNewAssignment() {
  const navigate = useNavigate();
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Uppdrag skapat!');
    navigate('/admin/assignments');
  };

  return (
    <AdminLayout title="Nytt uppdrag">
      <div className="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Skapa nytt uppdrag</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" placeholder="T.ex. Leverans kontorsmöbler" required />
              </div>

              <div className="space-y-2">
                <Label>Kund</Label>
                {!showNewCustomer ? (
                  <div className="flex gap-2">
                    <Select required>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Välj kund" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCustomers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCustomer(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ny kund namn"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      if (newCustomerName.trim()) {
                        toast.success(`Kund "${newCustomerName}" skapad`);
                        setShowNewCustomer(false);
                        setNewCustomerName('');
                      }
                    }}>
                      Lägg till
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCustomer(false)}>
                      Avbryt
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Leveransadress</Label>
                <Input id="address" placeholder="Gatuadress, stad" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instruktioner (valfritt)</Label>
                <Textarea id="instructions" placeholder="Särskilda instruktioner..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Datum och starttid</Label>
                  <Input id="date" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Sluttid (valfritt)</Label>
                  <Input id="end" type="datetime-local" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tilldela chaufför</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj chaufför" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockDrivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit">Skapa uppdrag</Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Avbryt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
