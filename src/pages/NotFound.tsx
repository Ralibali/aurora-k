import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-5xl font-bold font-mono text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-8">Sidan hittades inte</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/admin">Gå till dashboarden</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">Gå till startsidan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
