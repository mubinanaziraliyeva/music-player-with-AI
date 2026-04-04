import React, { useEffect, useRef, useState, useCallback } from "react";
import "./live-lyrics.css";

/**
 * LiveLyrics React component
 * Props:
 * - lyrics: Array<{ time: number|null, text: string }>
 * - audioRef: React.RefObject<HTMLAudioElement>
 * - className?: string
 * - onLineClick?: (time:number)=>void  // optional click-to-seek handler
 */
export default function LiveLyrics({
  lyrics = [],
  audioRef,
  className = "",
  onLineClick,
}) {
  const containerRef = useRef(null);
  const lineRefs = useRef([]);
  const rafRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // binary-search to find last index where time <= t
  const findActiveIndex = useCallback(
    (t) => {
      if (!lyrics || lyrics.length === 0) return -1;
      let lo = 0,
        hi = lyrics.length - 1,
        ans = -1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const mt =
          typeof lyrics[mid].time === "number" ? lyrics[mid].time : Infinity;
        if (mt <= t) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return ans;
    },
    [lyrics],
  );

  // rAF loop for smooth updates
  useEffect(() => {
    const audio = audioRef && audioRef.current;
    if (!audio) return;

    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      const now = audio.currentTime || 0;
      const idx = findActiveIndex(now);
      setActiveIndex((prev) => (prev !== idx ? idx : prev));
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef, findActiveIndex]);

  // auto-scroll active line to center
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    if (el && containerRef.current) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {
        el.scrollIntoView();
      }
    }
  }, [activeIndex]);

  const handleLineClick = (idx) => {
    const item = lyrics[idx];
    if (!item) return;
    const time = item.time;
    if (typeof time !== "number" || !isFinite(time)) return;
    if (onLineClick) onLineClick(time);
    else if (audioRef && audioRef.current) {
      try {
        audioRef.current.currentTime = time;
        if (audioRef.current.paused) audioRef.current.play().catch(() => {});
      } catch (e) {}
    }
  };

  return (
    <div
      className={`live-lyrics-root ${className}`}
      ref={containerRef}
      role="list"
    >
      {lyrics.map((ln, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        const isFuture = i > activeIndex;
        const cls = [
          "lyric-line",
          isActive ? "active" : "",
          isPast ? "past" : "",
          isFuture ? "future" : "",
        ].join(" ");
        return (
          <div
            key={i}
            role="listitem"
            ref={(el) => (lineRefs.current[i] = el)}
            className={cls}
            onClick={() => handleLineClick(i)}
            aria-current={isActive ? "true" : "false"}
            title={typeof ln.time === "number" ? `${ln.time.toFixed(2)}s` : ""}
          >
            {ln.text}
          </div>
        );
      })}
    </div>
  );
}
