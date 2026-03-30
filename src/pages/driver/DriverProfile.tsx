import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockDrivers } from '@/lib/mock-data';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function DriverProfile() {
  const navigate = useNavigate();
  const driver = mockDrivers[0]; // Mock current driver

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{driver.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{driver.email}</p>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full touch-target"
              onClick={() => {
                toast.success('Utloggad');
                navigate('/');
              }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Logga ut
            </Button>
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}
