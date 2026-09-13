// Increment this version whenever the rules change so every account must accept again.
export const CONTENT_POLICY_VERSION = '2026-09-13.1';

export type ContentPolicyAcceptance = 'accepted' | 'required' | 'storage-error';

function acceptanceKey(userId: string) {
  return `aurora:content-policy:${encodeURIComponent(userId)}:${CONTENT_POLICY_VERSION}`;
}

export function readContentPolicyAcceptance(userId: string): ContentPolicyAcceptance {
  if (!userId) return 'required';
  try {
    return window.localStorage.getItem(acceptanceKey(userId)) === 'accepted' ? 'accepted' : 'required';
  } catch {
    return 'storage-error';
  }
}

export function acceptContentPolicy(userId: string): boolean {
  if (!userId) return false;
  try {
    window.localStorage.setItem(acceptanceKey(userId), 'accepted');
    // Do not unlock on a failed or silently ignored storage write.
    return readContentPolicyAcceptance(userId) === 'accepted';
  } catch {
    return false;
  }
}
