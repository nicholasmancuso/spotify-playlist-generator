// --- App.jsx ---
import { useEffect, useState } from 'react';
import LoginButton from './components/LoginButton';
import PlaylistForm from './components/PlaylistForm';
import PlaylistLink from './components/PlaylistLink';
import { loginWithPKCE, handleRedirect } from './utils/spotifyAuth';

const moodMap = {
  chill: "chill acoustic ambient",
  workout: "energetic workout upbeat",
  party: "party dance pop",
  focus: "focus instrumental study",
  romantic: "romantic love ballad",
  sad: "sad emotional mellow",
  happy: "happy upbeat joyful",
  "rainy day": "rainy mellow acoustic",
  "sunny vibes": "sunshine summer pop",
  "road trip": "road trip driving rock",
  study: "study focus instrumental",
  sleep: "sleep ambient calm",
  meditation: "meditation zen ambient",
  gaming: "gaming electronic synth",
  throwback: "retro 80s 90s",
  jazzy: "jazz smooth saxophone",
  classical: "classical orchestra piano",
  rock: "rock alternative grunge",
  "hip hop": "hip hop rap beats",
  country: "country acoustic americana",
  electronic: "electronic edm house",
  indie: "indie alternative folk",
  metal: "metal heavy rock",
  reggae: "reggae dub chill",
  funk: "funk groove bass",
  lofi: "lofi chill beats",
  instrumental: "instrumental ambient",
  relaxation: "relax calm peaceful",
  travel: "world global vibes",
  celebration: "celebration party upbeat",
  holiday: "holiday festive seasonal",
  spooky: "spooky halloween eerie",
  motivational: "motivational inspiring energetic",
  "deep focus": "deep focus ambient",
  nature: "nature sounds forest",
  kids: "kids fun singalong",
  cooking: "cooking jazz upbeat",
  cleaning: "cleaning energetic pop",
  "creative flow": "creative flow ambient"
};

function LoadingBar({ progress }) {
  return (
    <div style={{ width: '100%', background: '#111', height: 12, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ width: `${progress}%`, height: '100%', transition: 'width 300ms linear', background: '#1DB954' }} />
    </div>
  );
}

async function TrackUrisFromRecommendations(token, params = {}, limit = 20) {
  const actualLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const qs = new URLSearchParams({ ...params, limit: actualLimit }).toString();
  try {
    const res = await fetch(`https://api.spotify.com/v1/recommendations?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks || []).slice(0, actualLimit).map(t => t.uri);
  } catch {
    return [];
  }
}

async function TrackUrisFromSearch(token, query, limit = 20) {
  const actualLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const qs = new URLSearchParams({ q: query, type: 'track', limit: actualLimit }).toString();
  try {
    const res = await fetch(`https://api.spotify.com/v1/search?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks.items || []).slice(0, actualLimit).map(t => t.uri);
  } catch {
    return [];
  }
}

async function createPlaylistAndAddTracks(token, userId, name, uris) {
  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, public: false, description: 'Generated with Spotify Playlist Generator' })
  });
  if (!createRes.ok) {
    const txt = await createRes.text().catch(() => null);
    throw new Error('Failed to create playlist: ' + (txt || createRes.status));
  }
  const playlist = await createRes.json();

  const uniqueUris = Array.from(new Set(uris));
  const BATCH = 100;
  for (let i = 0; i < uniqueUris.length; i += BATCH) {
    const batch = uniqueUris.slice(i, i + BATCH);
    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: batch })
    });
  }

  return playlist;
}

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const token = await handleRedirect();
        const stored = token || localStorage.getItem('access_token');
        if (stored) {
          setAccessToken(stored);
          setLoggedIn(true);
          const me = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${stored}` } });
          if (me.ok) {
            const meJson = await me.json();
            setUserName(meJson.display_name || meJson.id || '');
            setUserId(meJson.id || '');
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setLoggedIn(false);
    setUserName('');
    setUserId('');
    setPlaylistUrl('');
    setPlaylistName('');
  }

  async function generatePlaylist({ mode, mood, artist, artists, title, count }) {
    if (!accessToken) return alert('Please login to Spotify first.');
    setLoading(true);
    setProgress(5);

    try {
      let currentUserId = userId;
      if (!currentUserId) {
        setProgress(12);
        const me = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!me.ok) throw new Error('Failed fetching profile');
        const meJson = await me.json();
        currentUserId = meJson.id;
        setUserName(meJson.display_name || meJson.id || '');
        setUserId(currentUserId);
      }

      const desired = Math.min(Math.max(Number(count) || 20, 1), 100);
      let uris = [];

      if (mode === 'mood') {
        setProgress(30);
        const keywords = (moodMap[mood] || mood || '').trim();
        uris = await TrackUrisFromSearch(accessToken, keywords, desired);
        if (uris.length < desired) {
          const recs = await TrackUrisFromRecommendations(accessToken, { seed_genres: 'pop' }, desired - uris.length);
          uris = uris.concat(recs).slice(0, desired);
        }
        setProgress(65);
      } else if (mode === 'artist') {
        setProgress(35);

        const userInput = (artist || '').toLowerCase().trim();
        if (!userInput) throw new Error('Artist name required');

        const qs = new URLSearchParams({ q: `artist:"${artist}"`, type: 'artist', limit: 10 }).toString();
        const res = await fetch(`https://api.spotify.com/v1/search?${qs}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error('Artist search failed');
        const data = await res.json();
        const items = data.artists?.items || [];
        if (items.length === 0) throw new Error('Artist not found');

        let artistObj = items.find(a => a.name.toLowerCase().trim() === userInput) || items[0];
        const artistId = artistObj.id;

        const trackPool = new Set();
        setProgress(50);
        try {
          const topRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (topRes.ok) {
            const topData = await topRes.json();
            (topData.tracks || []).forEach(t => t.uri && trackPool.add(t.uri));
          }
        } catch {}

        setProgress(65);
        try {
          const albRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=20`, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (albRes.ok) {
            const albData = await albRes.json();
            const albums = albData.items || [];
            for (const album of albums.slice(0, 10)) {
              const tRes = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, { headers: { Authorization: `Bearer ${accessToken}` } });
              if (!tRes.ok) continue;
              const tData = await tRes.json();
              (tData.items || []).forEach(t => t.uri && trackPool.add(t.uri));
            }
          }
        } catch {}

        setProgress(80);
        try {
          const recs = await TrackUrisFromRecommendations(accessToken, { seed_artists: artistId }, 50);
          recs.forEach(u => trackPool.add(u));
        } catch {}

        let allUris = Array.from(trackPool);
        if (allUris.length === 0) throw new Error('No tracks found for this artist.');

        for (let i = allUris.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allUris[i], allUris[j]] = [allUris[j], allUris[i]];
        }

        const desiredArtistCount = Math.min(Math.max(Number(count) || 20, 1), 100);
        uris = allUris.slice(0, desiredArtistCount);
        setProgress(95);

      } else if (mode === 'multi-artist') {
        setProgress(30);
        const provided = (artists || []).map(a => a && a.trim()).filter(Boolean).slice(0,3);
        if (provided.length < 2) throw new Error('Please provide at least 2 artists for multi-artist mode');

        const trackPool = new Set();

        let iProgress = 30;
        for (const name of provided) {
          iProgress += 20;
          setProgress(Math.min(iProgress, 90));

          try {
            const qs = new URLSearchParams({ q: `artist:"${name}"`, type: 'artist', limit: 5 }).toString();
            const res = await fetch(`https://api.spotify.com/v1/search?${qs}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) continue;
            const data = await res.json();
            const artistObj = data.artists?.items?.find(a => a.name.toLowerCase().trim() === name.toLowerCase().trim()) || data.artists?.items?.[0];
            if (!artistObj) continue;
            const artistId = artistObj.id;

            try {
              const topRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, { headers: { Authorization: `Bearer ${accessToken}` } });
              if (topRes.ok) {
                const topData = await topRes.json();
                (topData.tracks || []).forEach(t => t.uri && trackPool.add(t.uri));
              }
            } catch {}

            try {
              const albRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=10`, { headers: { Authorization: `Bearer ${accessToken}` } });
              if (albRes.ok) {
                const albData = await albRes.json();
                const albums = albData.items || [];
                for (const album of albums.slice(0,5)) {
                  const tRes = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, { headers: { Authorization: `Bearer ${accessToken}` } });
                  if (!tRes.ok) continue;
                  const tData = await tRes.json();
                  (tData.items || []).forEach(t => t.uri && trackPool.add(t.uri));
                }
              }
            } catch {}

            try {
              const recs = await TrackUrisFromRecommendations(accessToken, { seed_artists: artistId }, 30);
              recs.forEach(u => trackPool.add(u));
            } catch {}

          } catch (e) {
            console.warn('multi-artist fetch error for', name, e);
          }
        }

        let allUris = Array.from(trackPool);
        if (allUris.length === 0) throw new Error('No tracks found for provided artists.');

        for (let i = allUris.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allUris[i], allUris[j]] = [allUris[j], allUris[i]];
        }

        uris = allUris.slice(0, Math.min(desired, 100));
        setProgress(95);
      }

      if (!uris || uris.length === 0) throw new Error('No tracks found for that selection.');

      const finalName = title || (mode === 'mood' ? `Mood: ${mood}` : mode === 'artist' ? `Artist: ${artist}` : `Multi-Artist Mix (${(artists||[]).filter(Boolean).slice(0,3).join(', ')})`);
      setProgress(90);
      const playlist = await createPlaylistAndAddTracks(accessToken, currentUserId, finalName, uris);
      setPlaylistUrl(playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`);
      setPlaylistName(finalName);
      setProgress(100);
      setTimeout(() => { setLoading(false); setProgress(0); }, 500);

    } catch (err) {
      console.error(err);
      setLoading(false);
      setProgress(0);
      alert('Error creating playlist: ' + (err.message || err));
    }
  }

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 20 }}>
          <div style={{ marginBottom: 24 }}>
            <img src="slogo.jpg" alt="logo" style={{ width: 150 }} />
          </div>

          <h1 style={{ color: '#fff', marginBottom: 8 }}>Spotify Playlist Generator</h1>
          <p style={{ color: '#ddd' }}>Login to Spotify to create playlists from moods or artists.</p>

          <div style={{ marginTop: 20 }}>
            <LoginButton onClick={() => loginWithPKCE()}>Login with Spotify</LoginButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Spotify Playlist Generator</h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14 }}>Signed in as <strong>{userName || 'Unknown'}</strong></div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#e63946',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {loading && (
          <div style={{ marginBottom: 12 }}>
            <LoadingBar progress={progress} />
            <div style={{ marginTop: 8 }}>{Math.round(progress)}%</div>
          </div>
        )}

        <PlaylistForm onSubmit={generatePlaylist} />
        <div style={{ marginTop: 20 }}>
          <PlaylistLink url={playlistUrl} name={playlistName} />
        </div>
      </div>
    </div>
  );
}

export default App;

