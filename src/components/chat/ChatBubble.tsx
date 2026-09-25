'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, AlertCircle, FileText, Download, Play, Pause, Mic } from 'lucide-react';
import { parseMessageContent } from '@/lib/mediaMessage';

interface Message {
  id?: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
  read?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'sending';
}

interface ChatBubbleProps {
  message: Message;
  isConsecutive?: boolean;
  onRetry?: (tempId: string, text: string) => void;
}

// ─── Voice Message Player ──────────────────────────────────────────────────
function VoiceMessagePlayer({ src, isOutgoing }: { src: string; isOutgoing: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      try {
        setLoading(true);
        await audio.play();
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }, [playing]);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    const onError = () => setError(true);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };
  }, [src]);

  const formatAudioTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 py-1 px-1 min-w-[220px] opacity-60">
        <Mic size={16} />
        <span className="text-xs italic">Voice message unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1.5 min-w-[240px] max-w-[300px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={loading}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isOutgoing
            ? 'bg-white/25 hover:bg-white/35 text-white'
            : 'bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884]'
        } disabled:opacity-50 cursor-pointer`}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {loading ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
          </svg>
        ) : playing ? (
          <Pause size={16} />
        ) : (
          <Play size={16} className="ml-0.5" />
        )}
      </button>

      {/* Waveform + Time */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Waveform progress bar */}
        <div
          role="slider"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-[22px] flex items-center cursor-pointer"
          onClick={handleSeek}
        >
          {/* Static waveform bars */}
          <div className="absolute inset-0 flex items-center gap-[2px] overflow-hidden">
            {Array.from({ length: 28 }, (_, i) => {
              const heights = [6,10,14,8,16,10,12,6,18,14,8,12,16,10,6,14,10,18,8,12,16,6,14,10,8,16,12,10];
              const h = heights[i % heights.length];
              const filled = (i / 27) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`rounded-full shrink-0 transition-colors duration-150 ${
                    filled
                      ? isOutgoing ? 'bg-white/90' : 'bg-[#00a884]'
                      : isOutgoing ? 'bg-white/35' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ width: 3, height: h }}
                />
              );
            })}
          </div>
        </div>
        {/* Time display */}
        <span className={`text-[10px] font-medium ${
          isOutgoing ? 'text-white/70' : 'text-[#667781] dark:text-[#8696A0]'
        }`}>
          {playing || currentTime > 0 ? formatAudioTime(currentTime) : formatAudioTime(duration)}
        </span>
      </div>

      {/* Mic icon indicator */}
      <Mic size={14} className={`shrink-0 ${
        isOutgoing ? 'text-white/50' : 'text-gray-400'
      }`} />
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatBubble({ message, isConsecutive = false, onRetry }: ChatBubbleProps) {
  const isOutgoing = message.sender === 'agent';
  const parsed = parseMessageContent(message.text);

  // Format timestamp (e.g., 9:58 am)
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    } catch {
      return '';
    }
  };

  const bubbleVariants = {
    initial: { opacity: 0, scale: 0.95, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
  };

  const renderContent = () => {
    if (!parsed.isMedia) {
      return <p className="whitespace-pre-wrap font-sans">{parsed.caption || ''}</p>;
    }

    if (parsed.mediaType === 'image' || parsed.mediaType === 'sticker') {
      return (
        <div className={`space-y-2 ${parsed.mediaType === 'sticker' ? 'max-w-[180px]' : 'max-w-[280px]'}`}>
          <a
            href={parsed.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`block overflow-hidden group cursor-pointer ${parsed.mediaType === 'sticker' ? '' : 'rounded-lg border border-black/10 dark:border-white/10'}`}
          >
            <img
              src={parsed.mediaUrl}
              alt="Sent attachment"
              className={`w-full h-auto object-cover transition-transform duration-200 group-hover:scale-[1.02] ${parsed.mediaType === 'sticker' ? 'max-h-[180px] bg-transparent drop-shadow-sm' : 'max-h-[220px]'}`}
            />
          </a>
          {parsed.caption && (
            <p className="whitespace-pre-wrap font-sans text-xs mt-1.5 text-text-primary dark:text-[#E9EDEF]">
              {parsed.caption}
            </p>
          )}
        </div>
      );
    }

    if (parsed.mediaType === 'video') {
      return (
        <div className="space-y-2 max-w-[280px]">
          <video
            src={parsed.mediaUrl}
            controls
            className="w-full h-auto max-h-[300px] rounded-lg border border-black/10 dark:border-white/10"
          />
          {parsed.caption && (
            <p className="whitespace-pre-wrap font-sans text-xs mt-1.5 text-text-primary dark:text-[#E9EDEF]">
              {parsed.caption}
            </p>
          )}
        </div>
      );
    }

    if (parsed.mediaType === 'audio') {
      return (
        <div className="space-y-1">
          <VoiceMessagePlayer src={parsed.mediaUrl!} isOutgoing={isOutgoing} />
          {parsed.caption && (
            <p className="whitespace-pre-wrap font-sans text-[13px] text-text-primary dark:text-[#E9EDEF] mt-1 px-1.5 pb-1 italic">
              {parsed.caption}
            </p>
          )}
        </div>
      );
    }

    if (parsed.mediaType === 'document') {
      return (
        <div className="space-y-2 min-w-[240px]">
          <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2.5 rounded-lg border border-black/10 dark:border-white/10">
            <div className="p-2 bg-[#005C4B]/10 rounded-lg text-[#005C4B] dark:text-brand shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-text-primary dark:text-foreground">
                {parsed.filename}
              </p>
              <p className="text-[10px] text-chat-time font-medium uppercase mt-0.5">Document</p>
            </div>
            <a
              href={parsed.mediaUrl}
              download={parsed.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-[#667781] hover:text-text-primary dark:text-[#8696A0] dark:hover:text-[#E9EDEF] transition-colors cursor-pointer shrink-0"
              title="Download file"
            >
              <Download size={16} />
            </a>
          </div>
          {parsed.caption && (
            <p className="whitespace-pre-wrap font-sans text-xs mt-1.5 text-text-primary dark:text-[#E9EDEF]">
              {parsed.caption}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.15 }}
      className={`flex w-full mb-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`relative max-w-[65%] px-3.5 py-2 text-sm leading-[19px] shadow-xs select-text ${
          isOutgoing
            ? `bg-chat-outgoing text-text-primary dark:text-foreground ${
                isConsecutive ? 'rounded-lg' : 'rounded-[8px_0_8px_8px]'
              }`
            : `bg-chat-incoming text-text-primary dark:text-foreground ${
                isConsecutive ? 'rounded-lg' : 'rounded-[0_8px_8px_8px]'
              }`
        }`}
      >
        {parsed.quotedMessage && (
          <div className="mb-2 bg-black/5 dark:bg-black/20 border-l-[3px] border-[#00a884] dark:border-brand rounded-r-md px-2.5 py-2 text-[12px] leading-snug opacity-90 whitespace-pre-wrap line-clamp-4 overflow-hidden">
            {parsed.quotedMessage}
          </div>
        )}
        {renderContent()}
        {parsed.footer && (
          <p className="text-[10px] text-[#667781] dark:text-[#8696A0] mt-1.5 leading-normal select-text">
            {parsed.footer}
          </p>
        )}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-chat-time font-sans">
          <span>{formatTime(message.timestamp)}</span>
          {isOutgoing && (
            message.status === 'failed' ? (
              <button
                onClick={() => onRetry?.(message.id || '', parsed.caption || message.text)}
                className="p-0.5 hover:bg-red-500/10 rounded-full text-red-600 dark:text-red-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center ml-0.5"
                title="Failed to deliver. Click to retry sending."
              >
                <AlertCircle size={13} />
              </button>
            ) : (message.status === 'read' || message.read) ? (
              <CheckCheck size={13} className="text-[#53BDEB] shrink-0" />
            ) : message.status === 'delivered' ? (
              <CheckCheck size={13} className="text-[#667781] shrink-0" />
            ) : (
              <Check size={13} className="text-chat-time shrink-0" />
            )
          )}
        </div>
        {parsed.buttons && parsed.buttons.length > 0 && (
          <div className="mt-2.5 border-t border-black/10 dark:border-white/15 pt-2 flex flex-col gap-1.5 w-full">
            {parsed.buttons.map((btnLabel, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/30 dark:bg-black/30 hover:bg-white/40 dark:hover:bg-black/40 rounded-lg text-xs font-bold text-[#00a884] dark:text-brand cursor-default select-none border border-black/5 dark:border-white/5 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  className="fill-current text-[#00a884] dark:text-brand"
                >
                  <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
                </svg>
                <span>{btnLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
