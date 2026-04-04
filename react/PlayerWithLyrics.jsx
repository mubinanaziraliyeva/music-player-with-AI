import React, { useRef } from "react";
import LiveLyrics from "./LiveLyrics";
import "./live-lyrics.css";

const exampleLyrics = [
  { time: 0.0, text: "Intro line 1" },
  { time: 7.2, text: "Verse 1: Salom dunyo" },
  { time: 13.6, text: "Chorus: Bu yerda qilingan gap" },
  { time: 22.0, text: "Verse 2: Yana bir qator" },
];

export default function PlayerWithLyrics() {
  const audioRef = useRef(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
      <div>
        <audio
          ref={audioRef}
          src="/Music/Alan Walker - Darkside.mp3"
          controls
        />
      </div>

      <div>
        <h4 style={{ marginBottom: 8, color: "#9ae6b4" }}>Lyrics</h4>
        <LiveLyrics lyrics={exampleLyrics} audioRef={audioRef} />
      </div>
    </div>
  );
}
