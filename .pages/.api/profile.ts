import type { NextApiRequest, NextApiResponse } from 'next';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { poesia } = req.body;

  const prompt = `Analizza la seguente poesia e restituisci un JSON con:
  - tono emotivo
  - emozioni dominanti (tra: gioia, tristezza, rabbia, paura, sorpresa, disgusto)
  - temi principali
  - stile poetico
  - intensità espressiva da 1 a 10

  Poesia:
  """${poesia}"""`;

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4', // puoi usare anche gpt-4o o turbo
      messages: [{ role: 'user', content: prompt }],
    });

    const response = completion.data.choices[0].message?.content;

    const profilo = JSON.parse(response!);

    // Salva nel DB
    const { data, error } = await supabase.from('poesie').insert([
      { testo: poesia, profilo_json: profilo },
    ]);

    if (error) throw error;

    res.status(200).json(profilo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}