import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { signProofs, type ProofRecord } from '../../supabase/functions/_shared/proof-paths';
export function useProofUrls(proof?: ProofRecord) {
  const photo = proof?.proof_photo_path, signature = proof?.signature_path;
  const oldPhoto = proof?.consignment_photo_url, oldSignature = proof?.signature_url;
  const query = useQuery({
    queryKey: ['proof-urls', photo, signature, oldPhoto, oldSignature],
    enabled: Boolean(photo || signature || oldPhoto || oldSignature),
    staleTime: 50 * 60 * 1000, refetchInterval: 50 * 60 * 1000,
    queryFn: async () => (await signProofs([{ proof_photo_path: photo, signature_path: signature, consignment_photo_url: oldPhoto, signature_url: oldSignature }], async (bucket, paths, seconds) => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, seconds);
      if (error) throw error;
      return data || [];
    }))[0],
  });
  return { photoUrl: query.data?.consignment_photo_url, signatureUrl: query.data?.signature_url, error: query.isError };
}
