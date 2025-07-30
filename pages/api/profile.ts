import type { NextApiRequest, NextApiResponse } from 'next'
import openai from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema di validazione per il profilo poetico
const ProfiloPoesiaSchema = z.object({
  tono_emotivo: z.string(),
  emozioni: z.array(z.enum(['gioia', 'tristezza', 'rabbia', 'paura', 'sorpresa', 'disgusto'])),
  temi_principali: z.array(z.string()).max(3),
  stile_poetico: z.string(),
  intensità_espressiva: z.number().min(1).max(10)
})

type ProfiloPoesia = z.infer<typeof ProfiloPoesiaSchema>

// Schema per la richiesta
const RequestSchema = z.object({
  poesia: z.string().min(10, 'La poesia deve contenere almeno 10 caratteri')
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfiloPoesia | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validazione dell'input
    const { poesia } = RequestSchema.parse(req.body)

    const prompt = `Analizza la seguente poesia e restituisci un JSON con:
- tono_emotivo (es. "malinconico", "euforico")
- emozioni (scegli tra: gioia, tristezza, rabbia, paura, sorpresa, disgusto)
- temi_principali (max 3)
- stile_poetico (es. "libero", "sonetto")
- intensità_espressiva (1-10)

Formatta la risposta come JSON valido (senza commenti o markdown).

Poesia:
"""${poesia}"""`

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

    // Validazione della risposta
    const parsedResponse = JSON.parse(response)
    const profilo = ProfiloPoesiaSchema.parse(parsedResponse)

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
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: err.errors.map(e => e.message).join(', ')
      })
    }

    const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto'
    return res.status(500).json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: err instanceof Error ? err.stack : null })
    })
  }
}
