export function isValidMapCoordinate(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

/** Popup content is text, never HTML assembled from customer or driver input. */
export function mapPopup(title: string, lines: string[], assignmentId?: string | null): HTMLDivElement {
  const content = document.createElement('div');
  content.style.minWidth = '160px';
  const heading = document.createElement('strong');
  heading.textContent = title;
  content.append(heading);
  for (const line of lines) {
    const row = document.createElement('div');
    row.style.color = '#666';
    row.textContent = line;
    content.append(row);
  }
  if (assignmentId) {
    const link = document.createElement('a');
    link.href = `/admin/assignments/${encodeURIComponent(assignmentId)}`;
    link.textContent = 'Visa uppdrag →';
    link.style.color = '#2563eb';
    content.append(link);
  }
  return content;
}

export function mapTimeAgo(value?: string): string {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return 'okänt';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s sedan`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m sedan` : `${Math.floor(minutes / 60)}h sedan`;
}
