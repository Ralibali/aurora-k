type ProofStorage = { storage: { from(bucket: string): { upload(path: string, file: File, options: { contentType: string; upsert: boolean }): Promise<{ error: { statusCode?: string | number } | null }> } } };
export async function storeProof(storage: ProofStorage, userId: string, assignmentId: string, operationId: string, file: File, suffix: string) {
  const path = `${userId}/${assignmentId}/${operationId}-${suffix}`;
  const { error } = await storage.storage.from('consignment-notes').upload(path, file, { contentType: file.type, upsert: false });
  // Retries reuse the first object. No expiring URL is written to the database.
  if (error && String(error.statusCode) !== '409') throw error;
  return `consignment-notes/${path}`;
}
