import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { money } from '../lib/format';
import type { Beat, License } from '../types';

type BeatCardProps = {
  b: Beat;
  onAdd: (beat: Beat, license: License) => void;
};

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80';

/** A single beat card: cover art, audio preview, licence selector, and cart action. */
export function BeatCard({ b, onAdd }: BeatCardProps) {
  const [playing, setPlaying] = useState(false);
  const [licenseId, setLicenseId] = useState(b.licenses[0]?.id || '');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedLicense = b.licenses.find((license) => license.id === licenseId);

  // Reset the selection when React reuses this card for a different beat.
  useEffect(() => {
    setLicenseId(b.licenses[0]?.id || '');
    setPlaying(false);
  }, [b.id, b.licenses]);

  async function togglePreview() {
    const audio = audioRef.current;
    if (!audio || !b.previewUrl) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <article className="beat">
      <div className="cover">
        <img src={b.coverUrl || FALLBACK_COVER} alt={`${b.title} cover artwork`} />
        {b.previewUrl && (
          <audio ref={audioRef} src={b.previewUrl} onEnded={() => setPlaying(false)} preload="none" />
        )}
        <button
          className="play"
          disabled={!b.previewUrl}
          title={b.previewUrl ? 'Play preview' : 'No preview uploaded'}
          aria-label={playing ? `Pause ${b.title}` : `Play ${b.title} preview`}
          onClick={togglePreview}
        >
          {playing ? <Pause size={19} /> : <Play size={19} />}
        </button>
        <span className="tag">{b.genre}</span>
      </div>

      <div className="beatInfo">
        <div><h3>{b.title}</h3><p>{b.bpm} BPM • {b.musicalKey}</p></div>
        <strong>{money(selectedLicense?.priceKobo || 0)}</strong>
      </div>

      {b.licenses.length > 0 && (
        <select
          aria-label={`Licence for ${b.title}`}
          value={licenseId}
          onChange={(event) => setLicenseId(event.target.value)}
        >
          {b.licenses.map((license) => (
            <option key={license.id} value={license.id}>
              {license.name} — {money(license.priceKobo)}
            </option>
          ))}
        </select>
      )}

      <button className="add" disabled={!selectedLicense} onClick={() => selectedLicense && onAdd(b, selectedLicense)}>
        Add to cart <ArrowRight size={16} />
      </button>
    </article>
  );
}
