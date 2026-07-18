import { createRoot } from 'react-dom/client';
import AnnouncementMarquee from './components/AnnouncementMarquee.jsx';

const container = document.getElementById('announcement-marquee');
if (container) {
  const root = createRoot(container);
  root.render(<AnnouncementMarquee />);
}
