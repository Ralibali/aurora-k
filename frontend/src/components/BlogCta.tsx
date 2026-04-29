import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface BlogCtaProps {
  text: string;
  to?: string;
}

export function BlogCta({ text, to = '/kontakt' }: BlogCtaProps) {
  return (
    <div className="my-10 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
      <Button size="lg" asChild className="rounded-xl px-8">
        <Link to={to}>{text} <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>
  );
}
