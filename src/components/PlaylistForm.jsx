import { useState } from 'react';

const moodOptions = [
  "chill", "workout", "party", "focus", "romantic", "sad", "happy",
  "rainy day", "sunny vibes", "road trip", "study", "sleep", "meditation",
  "gaming", "throwback", "jazzy", "classical", "rock", "hip hop", "country",
  "electronic", "indie", "metal", "reggae", "funk", "lofi", "instrumental",
  "relaxation", "travel", "celebration", "holiday", "spooky", "motivational",
  "deep focus", "nature", "kids", "cooking", "cleaning", "creative flow"
];

export default function PlaylistForm({ onSubmit }) {
  const [mode, setMode] = useState('mood');
  const [mood, setMood] = useState('');
  const [artist, setArtist] = useState('');
  const [artist1, setArtist1] = useState('');
  const [artist2, setArtist2] = useState('');
  const [artist3, setArtist3] = useState('');
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(20);

  function handleSubmit(e) {
    e.preventDefault();

    if (mode === 'mood' && !mood) return alert('Please choose a mood');
    if (mode === 'artist' && !artist.trim()) return alert('Please enter an artist name');
    if (mode === 'multi-artist') {
      const provided = [artist1, artist2, artist3].map(a => a && a.trim()).filter(Boolean);
      if (provided.length < 2) return alert('Please enter at least two artists for Multi-Artist mode');
    }

    const payload = {
      mode,
      mood,
      artist: artist.trim(),
      artists: [artist1.trim(), artist2.trim(), artist3.trim()],
      title: title.trim() || undefined,
      count: Number(count) || 20
    };

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: '#121212', color: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '720px', margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#1DB954' }}>🎵 Generate a Spotify Playlist</h2>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        {['mood', 'artist', 'multi-artist'].map((m) => (
          <label key={m} style={{ margin: '0 8px', cursor: 'pointer' }}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} style={{ marginRight: 6 }} />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6 }}>Playlist title (optional)</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. My Vibe Mix" style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #333', backgroundColor: '#181818', color: 'white' }} />
      </div>

      {mode === 'mood' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6 }}>Mood</label>
          <select value={mood} onChange={e => setMood(e.target.value)} style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #333', backgroundColor: '#181818', color: 'white' }}>
            <option value="">-- choose a mood --</option>
            {moodOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {mode === 'artist' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6 }}>Artist name</label>
          <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="e.g. Childish Gambino" style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #333', backgroundColor: '#181818', color: 'white' }} />
        </div>
      )}

      {mode === 'multi-artist' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6 }}>Artists (enter 2 or 3 separate artists)</label>
          <input value={artist1} onChange={e => setArtist1(e.target.value)} placeholder="Artist 1 (required)" style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #333', backgroundColor: '#181818', color: 'white', marginBottom: 8 }} />
          <input value={artist2} onChange={e => setArtist2(e.target.value)} placeholder="Artist 2 (required)" style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #333', backgroundColor: '#181818', color: 'white', marginBottom: 8 }} />
          <input value={artist3} onChange={e => setArtist3(e.target.value)} placeholder="Artist 3 (optional)" style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #333', backgroundColor: '#181818', color: 'white' }} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6 }}>Number of songs: {count}</label>
        <input type="range" min="1" max="100" value={count} onChange={e => setCount(e.target.value)} style={{ width: '100%', accentColor: '#1DB954' }} />
      </div>

      <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#1DB954', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.3s' }} onMouseOver={e => (e.target.style.backgroundColor = '#1ed760')} onMouseOut={e => (e.target.style.backgroundColor = '#1DB954')}>Generate Playlist</button>
    </form>
  );
}
