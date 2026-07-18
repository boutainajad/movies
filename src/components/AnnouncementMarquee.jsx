import { useState } from 'react';
import { Flame, Film, Globe, Star } from 'lucide-react';

const ITEMS = [
  { icon: Flame, text: 'New movies added daily' },
  { icon: Film, text: 'Watch thousands of movies and series' },
  { icon: Globe, text: 'Available in Arabic, English & French' },
  { icon: Star, text: 'Save favorites and continue watching' },
];

const SEPARATOR = (
  <span style={{ color: '#475569', margin: '0 20px', userSelect: 'none' }}>&bull;</span>
);

function Track() {
  return (
    <>
      {ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <Icon size={16} color="#e50914" />
            <span style={{ fontSize: 14, color: '#94a3b8' }}>{item.text}</span>
            {i < ITEMS.length - 1 && SEPARATOR}
          </span>
        );
      })}
    </>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: 48,
    overflow: 'hidden',
    background: 'linear-gradient(90deg, rgba(6,8,15,0.95) 0%, rgba(10,13,23,0.95) 50%, rgba(6,8,15,0.95) 100%)',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    boxShadow: 'inset 0 0 30px rgba(229,9,20,0.06), 0 0 20px rgba(229,9,20,0.08)',
  },
  trackWrapper: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    padding: '14px 0',
  },
};

export default function AnnouncementMarquee() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="marquee-track"
        style={{
          ...styles.trackWrapper,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        <Track />
        <Track />
      </div>
    </div>
  );
}
