import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase'; // ✅ usa percorso relativo

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { poesiaId } = req.body;

  const { data: targetPoesia, error: fetchError } = await supabase
    .from('poesie')
    .select('id, profilo_json')
    .eq('id', poesiaId)
    .single();

  if (fetchError || !targetPoesia) {
    return res.status(404).json({ error: 'Poesia non trovata' });
  }

  const { data: tutteLePoesie } = await supabase
    .from('poesie')
    .select('id, testo, profilo_json')
    .neq('id', poesiaId);

  const affini = tutteLePoesie
    ?.map((p) => ({
      ...p,
      affinità: countCommon(targetPoesia.profilo_json, p.profilo_json),
    }))
    .sort((a, b) => b.affinità - a.affinità)
    .slice(0, 5) ?? [];

  return res.status(200).json(affini);
}

function countCommon(a: any, b: any): number {
  const chiavi = ['emozioni', 'temi_principali', 'tono_emotivo', 'stile'];
  return chiavi.reduce((count, key) => {
    const av = normalizeArray(a[key]);
    const bv = normalizeArray(b[key]);
    return count + av.filter((v) => bv.includes(v)).length;
  }, 0);
}

function normalizeArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((i) => i.toLowerCase());
  if (typeof v === 'string') return [v.toLowerCase()];
  return [];
}
