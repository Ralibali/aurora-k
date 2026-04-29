import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Truck, ArrowRight, Home, Mail, BookOpen, Wrench, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/lib/use-page-meta";

const QUICK_LINKS = [
  { to: "/", label: "Startsidan", icon: Home, description: "Så funkar Aurora Transport" },
  { to: "/tjanster", label: "Tjänster", icon: Wrench, description: "Allt vi erbjuder" },
  { to: "/blogg", label: "Bloggen", icon: BookOpen, description: "Guider och artiklar" },
  { to: "/kontakt", label: "Kontakta oss", icon: Mail, description: "Vi svarar på svenska" },
];

const NotFound = () => {
  const location = useLocation();

  usePageMeta({
    title: "Sidan hittades inte (404) | Aurora Transport",
    description:
      "Sidan du sökte finns inte längre eller har flyttats. Gå till startsidan eller utforska våra tjänster för åkerier och transportföretag.",
    canonical: `https://auroratransport.se${location.pathname}`,
    noindex: true,
  });

  useEffect(() => {
    // Log to console in dev and to Sentry breadcrumb in prod
    console.warn("[404] User hit non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="mx-auto w-full max-w-2xl text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Truck className="h-8 w-8" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fel 404
        </p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Sidan hittades inte
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Vi kan inte hitta sidan{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {location.pathname}
          </code>
          . Den kan ha flyttats eller aldrig funnits. Välj en av länkarna nedan för att fortsätta.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{l.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
          <Button asChild size="lg">
            <Link to="/">
              <Home className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Till startsidan
            </Link>
          </Button>
          <Button variant="ghost" asChild size="lg">
            <Link to="/blogg">
              <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Sök bland våra artiklar
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
