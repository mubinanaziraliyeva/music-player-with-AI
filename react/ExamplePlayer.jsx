import React, { useRef, useState, useEffect } from "react";
import LyricsViewer from "./LyricsViewer";
import "./lyrics.css";

// Example usage - simple player wrapper demonstrating onTimeUpdate wiring
export default function ExamplePlayer({ src, initialLyrics = [] }) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    a.addEventListener("timeupdate", onTime);
    return () => a.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <audio ref={audioRef} controls src={src} preload="metadata" />
      <LyricsViewer currentTime={currentTime} lyrics={initialLyrics} />
    </div>
  );
}
