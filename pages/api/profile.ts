
import type { NextApiRequest, NextApiResponse } from 'next'
import openai from '@/lib/openai'
import { supabase } from '@/lib/supabase'

interface ProfiloPoesia {
  tono_emotivo: string;
  emozioni: string[];
  temi_principali: string[];
  stile_poetico: string;
  intensità_espressiva: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfiloPoesia | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { poesia } = req.body
  if (!poesia || typeof poesia !== 'string' || poesia.length < 10) {
    return res.status(400).json({ error: 'Testo poesia mancante o non valido (min 10 caratteri)' })
  }

  const prompt = `Analizza la seguente poesia e restituisci un JSON con:
- tono_emotivo (es. "malinconico", "euforico")
- emozioni (scegli tra: gioia, tristezza, rabbia, paura, sorpresa, disgusto)
- temi_principali (max 3)
- stile_poetico (es. "libero", "sonetto")
- intensità_espressiva (1-10)

Formatta la risposta come JSON valido (senza commenti o markdown).

Poesia:
"""${poesia}"""`

  try {
    // Analisi con OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content
    if (!response) throw new Error('Nessuna risposta da OpenAI')

    const profilo: ProfiloPoesia = JSON.parse(response)

    // Validazione manuale di base
    if (!profilo.tono_emotivo || !profilo.emozioni || !profilo.temi_principali || 
        !profilo.stile_poetico || !profilo.intensità_espressiva) {
      throw new Error('Risposta da OpenAI non valida')
    }

    // Salvataggio su Supabase
    const { error } = await supabase
      .from('poesie')
      .insert([{ 
        testo: poesia, 
        profilo_json: profilo,
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) throw error

    return res.status(200).json(profilo)
  } catch (err) {
    console.error('API Error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto'
    return res.status(500).json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: err instanceof Error ? err.stack : null })
    })
  }
}
