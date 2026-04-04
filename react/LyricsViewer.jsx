import React, { useEffect, useRef, useMemo } from "react";
import "./lyrics.css";

/**
 * LyricsViewer
 * Props:
 *  - currentTime: number (seconds)
 *  - lyrics: Array<{ time: number, text: string }>
 */
export default function LyricsViewer({ currentTime = 0, lyrics = [] }) {
  const containerRef = useRef(null);
  const lineRefs = useRef([]);

  // compute active index: last line whose time <= currentTime
  const activeIndex = useMemo(() => {
    if (!lyrics || !lyrics.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      const ln = lyrics[i];
      if (typeof ln.time !== "number") continue;
      if (ln.time <= currentTime) idx = i;
      else break; // assumes lyrics are sorted ascending by time
    }
    return idx;
  }, [currentTime, lyrics]);

  // scroll active line into center when it changes
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    if (!el || !containerRef.current) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    } catch (err) {
      // fallback manual scroll calculation
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset =
        elRect.top -
        containerRect.top -
        containerRect.height / 2 +
        elRect.height / 2;
      container.scrollBy({
        top: offset,
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [activeIndex]);

  return (
    <div className="lyrics-container" ref={containerRef} aria-live="polite">
      {lyrics && lyrics.length ? (
        lyrics.map((ln, i) => (
          <div
            key={i}
            ref={(el) => (lineRefs.current[i] = el)}
            className={`line ${i === activeIndex ? "active" : ""}`}
            aria-current={i === activeIndex ? "true" : "false"}
            role="listitem"
          >
            {ln.text}
          </div>
        ))
      ) : (
        <div className="line muted">No lyrics available</div>
      )}
    </div>
  );
}
