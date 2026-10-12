import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../lib/api';
import { money } from '../lib/format';
import type { Beat, User } from '../types';

type AdminPageProps = { user: User; onLogout: () => void };
type BeatForm = {
  title: string; slug: string; genre: string; mood: string; bpm: string;
  musicalKey: string; description: string; coverUrl: string; previewUrl: string;
};

/** Admin-only tools for publishing beats, managing catalogue entries, and viewing basic stats. */
export function AdminPage({ user, onLogout }: AdminPageProps) {
  const [stats, setStats] = useState<any>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [form, setForm] = useState<BeatForm>({
    title: '', slug: '', genre: 'Afrobeats', mood: '', bpm: '100',
    musicalKey: 'C Min', description: '', coverUrl: '', previewUrl: '',
  });

  // Fetch dashboard totals and the current catalogue in parallel.
  async function loadDashboard() {
    try {
      const [dashboardStats, catalogue] = await Promise.all([
        api('/admin/stats'),
        api('/beats'),
      ]);
      setStats(dashboardStats);
      setBeats(catalogue);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the admin dashboard.');
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  async function uploadFile(file: File, kind: 'audio' | 'cover') {
    const body = new FormData();
    body.append('file', file);
    const result = await api(`/admin/uploads/${kind}`, { method: 'POST', body });
    return result.url as string;
  }

  // Upload media first, then publish the beat with the returned storage URLs.
  async function createBeat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      let previewUrl = form.previewUrl;
      let coverUrl = form.coverUrl;
      if (audioFile) previewUrl = await uploadFile(audioFile, 'audio');
      if (coverFile) coverUrl = await uploadFile(coverFile, 'cover');
      if (!previewUrl) throw new Error('Upload an MP3/WAV file or provide an audio preview URL.');

      await api('/admin/beats', {
        method: 'POST',
        body: JSON.stringify({ ...form, previewUrl, coverUrl }),
      });

      setForm({
        title: '', slug: '', genre: 'Afrobeats', mood: '', bpm: '100',
        musicalKey: 'C Min', description: '', coverUrl: '', previewUrl: '',
      });
      setAudioFile(null);
      setCoverFile(null);

      // Clear file inputs too; changing React state alone does not reset a native file input.
      const audioInput = document.getElementById('beat-audio') as HTMLInputElement | null;
      const coverInput = document.getElementById('beat-cover') as HTMLInputElement | null;
      if (audioInput) audioInput.value = '';
      if (coverInput) coverInput.value = '';

      setNotice('Beat uploaded and published to the store.');
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload beat.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteBeat(id: string) {
    if (!window.confirm('Delete this beat?')) return;
    setError('');
    try {
      await api(`/admin/beats/${id}`, { method: 'DELETE' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this beat.');
    }
  }

  return (
    <>
      <Header user={user} onLogin={() => undefined} onLogout={onLogout} />
      <main className="adminPage">
        <div className="adminTop">
          <div><p className="eyebrow">ADMIN</p><h1>Ahmarny Dashboard</h1></div>
          <a className="secondary" href="/store">View store</a>
        </div>

        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="uploadNotice" role="status">{notice}</div>}

        <div className="stats">
          {[
            ['Users', stats?.users ?? '—'],
            ['Beats', stats?.beats ?? '—'],
            ['Orders', stats?.orders ?? '—'],
            ['Revenue', stats ? money(stats.revenueKobo) : '—'],
          ].map(([label, value]) => (
            <div className="stat" key={label as string}>
              <small>{label}</small><strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="adminGrid">
          <section className="adminCard">
            <h2>Upload a beat</h2>
            <p className="adminHint">Add audio and details. Published beats appear in the public store.</p>
            <form onSubmit={createBeat}>
              <label className="fileLabel" htmlFor="beat-audio">
                Preview audio <span>MP3 or WAV · max 30 MB</span>
              </label>
              <input
                id="beat-audio"
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
                required
              />
              <small className="selectedFile">
                {audioFile ? `Selected: ${audioFile.name}` : 'Use a watermarked preview only; this file is publicly playable.'}
              </small>

              <label className="fileLabel" htmlFor="beat-cover">
                Cover artwork <span>JPG, PNG or WebP · optional</span>
              </label>
              <input
                id="beat-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
              />

              <input
                placeholder="Beat title"
                value={form.title}
                onChange={(event) => setForm({
                  ...form,
                  title: event.target.value,
                  slug: event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                })}
                required
              />
              <input placeholder="Genre" value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })} required />
              <div className="two">
                <input type="number" min="1" max="400" placeholder="BPM" value={form.bpm} onChange={(event) => setForm({ ...form, bpm: event.target.value })} required />
                <input placeholder="Musical key" value={form.musicalKey} onChange={(event) => setForm({ ...form, musicalKey: event.target.value })} required />
              </div>
              <input placeholder="Mood (optional)" value={form.mood} onChange={(event) => setForm({ ...form, mood: event.target.value })} />
              <textarea placeholder="Description (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <button className="checkout" disabled={busy}>
                {busy ? 'Uploading beat…' : <><Plus size={16} /> Upload and publish beat</>}
              </button>
            </form>
          </section>

          <section className="adminCard">
            <h2>Beat catalogue</h2>
            {beats.map((beat) => (
              <div className="adminBeat" key={beat.id}>
                <div>
                  <b>{beat.title}</b>
                  <small>{beat.genre} • {beat.bpm} BPM {beat.previewUrl ? '• Audio uploaded' : '• No audio'}</small>
                </div>
                <button aria-label={`Delete ${beat.title}`} onClick={() => deleteBeat(beat.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
