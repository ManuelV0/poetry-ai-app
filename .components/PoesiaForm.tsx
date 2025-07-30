import { useState } from 'react';

export default function PoesiaForm() {
  const [poesia, setPoesia] = useState('');
  const [profilo, setProfilo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poesia }),
    });
    const data = await res.json();
    setProfilo(data);
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={10}
          value={poesia}
          onChange={(e) => setPoesia(e.target.value)}
          placeholder="Inserisci la tua poesia..."
          style={{ width: '100%' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Analizzando...' : 'Analizza'}
        </button>
      </form>

      {profilo && (
        <pre style={{ marginTop: 20 }}>{JSON.stringify(profilo, null, 2)}</pre>
      )}
    </div>
  );
}