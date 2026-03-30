import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useData';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <User className="h-8 w-8 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <>
                <CardTitle>{profile?.full_name || user?.email}</CardTitle>
                <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
              </>
            )}
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full touch-target"
              onClick={handleLogout}
            >
              Logga ut
            </Button>
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}
