import { useState } from 'react';

export default function MatchPage() {
  const [poesiaId, setPoesiaId] = useState('');
  const [risultati, setRisultati] = useState<any[]>([]);

  const handleMatch = async () => {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poesiaId }),
    });
    const data = await res.json();
    setRisultati(data);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>🔗 Trova poesie affini</h1>
      <input
        type="text"
        placeholder="ID poesia"
        value={poesiaId}
        onChange={(e) => setPoesiaId(e.target.value)}
      />
      <button onClick={handleMatch}>Cerca affini</button>

      {risultati.length > 0 && (
        <ul>
          {risultati.map((p) => (
            <li key={p.id}>
              <strong>Affinità:</strong> {p.affinità}
              <pre>{p.testo}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}