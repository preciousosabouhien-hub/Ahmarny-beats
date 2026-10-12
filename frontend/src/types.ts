/** Shared frontend types mirror the public API responses. */
export type License = { id: string; type: string; name: string; priceKobo: number; details?: string };
export type Beat = {
  id: string; title: string; slug: string; genre: string; mood?: string; bpm: number;
  musicalKey: string; description?: string; coverUrl?: string; previewUrl?: string; licenses: License[];
};
export type User = { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' };
export type CartItem = { beat: Beat; license: License };
