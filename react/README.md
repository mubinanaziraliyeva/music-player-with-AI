Lyrics React component

Files created:

- LyricsViewer.jsx - React functional component that accepts `currentTime` and `lyrics` props and highlights/smooth-scrolls the active line.
- ExamplePlayer.jsx - Minimal example showing how to wire `audio` element `timeupdate` to `LyricsViewer`.
- lyrics.css - Styles for the lyrics container and active line.

How to use

1. This repository does not currently include React tooling. To use the component, copy the `react/` folder into a React app (Create React App / Vite / Next.js) and import the component:

import LyricsViewer from './react/LyricsViewer';
import './react/lyrics.css';

2. Provide `lyrics` as an array of objects sorted by time, e.g.:

const sample = [
{ time: 0.0, text: 'Intro lyrics...'},
{ time: 10.5, text: 'First verse...' },
{ time: 25.2, text: 'Chorus...' }
];

3. Wire audio currentTime to the component (see ExamplePlayer.jsx).

Notes and recommendations

- Ensure `lyrics` is sorted ascending by `time` for correct behavior.
- For production, you may want to debounce or throttle time updates, or send only every 200ms to reduce reflows.
- If you want server-side rendering (Next.js), be careful with `window` usage; the component uses `window.matchMedia` so it is client-only behavior.
