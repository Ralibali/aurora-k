export function OfflineFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 0 1 0 12.728M5.636 18.364a9 9 0 0 1 0-12.728m2.828 9.9a5 5 0 0 0 7.072 0m-7.072 0a5 5 0 0 1 0-7.072m7.072 7.072a5 5 0 0 0 0-7.072" />
            <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">Ingen internetanslutning</h2>
        <p className="text-sm text-muted-foreground">
          Data synkas när du är online igen
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary hover:underline"
        >
          Försök igen
        </button>
      </div>
    </div>
  );
}
