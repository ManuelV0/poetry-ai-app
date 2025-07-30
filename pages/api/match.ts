import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { poesiaId } = req.body;

  // Recupera la poesia da confrontare
  const { data: targetPoesia, error: fetchError } = await supabase
    .from('poesie')
    .select('id, profilo_json')
    .eq('id', poesiaId)
    .single();

  if (fetchError || !targetPoesia) {
    return res.status(404).json({ error: 'Poesia non trovata' });
  }

  // Prende tutte le altre poesie per confronto
  const { data: tutteLePoesie } = await supabase
    .from('poesie')
    .select('id, testo, profilo_json')
    .neq('id', poesiaId);

  // Calcolo della "distanza semantica" (grezza: numero di tag condivisi)
  const affini = tutteLePoesie
    .map((p) => {
      const comune = countCommon(
        targetPoesia.profilo_json,
        p.profilo_json
      );
      return { ...p, affinità: comune };
    })
    .sort((a, b) => b.affinità - a.affinità)
    .slice(0, 5); // restituisce le 5 più affini

  return res.status(200).json(affini);
}

function countCommon(a: any, b: any): number {
  let count = 0;
  const chiavi = ['emozioni', 'temi_principali', 'tono_emotivo', 'stile'];
  for (const key of chiavi) {
    const av = normalizeArray(a[key]);
    const bv = normalizeArray(b[key]);
    count += av.filter((v) => bv.includes(v)).length;
  }
  return count;
}

function normalizeArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((i) => i.toLowerCase());
  if (typeof v === 'string') return [v.toLowerCase()];
  return [];
}