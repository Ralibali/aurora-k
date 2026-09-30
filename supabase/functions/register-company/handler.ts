export const LEGAL_VERSION = '2026-09-23';
export function acceptsCurrentLegal(body: { termsVersion?: unknown; dpaVersion?: unknown }) {
  return body.termsVersion === LEGAL_VERSION && body.dpaVersion === LEGAL_VERSION;
}
