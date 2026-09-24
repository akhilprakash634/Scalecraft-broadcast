'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Smile, Paperclip, Send, Mic, Sparkles, Loader2, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComposeBarProps {
  phone: string;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSendReply: () => void;
  sendingReply: boolean;

  noteText: string;
  onNoteTextChange: (text: string) => void;
  onSaveNote: () => void;
  savingNote: boolean;

  followUpDate: string;
  onFollowUpDateChange: (date: string) => void;
  onScheduleFollowUp: () => void;
  onCancelFollowUp: () => void;
  hasFollowUp: boolean;
  savingFollowUp: boolean;

  onAiDraftClick: () => void;
  loadingAiDraft: boolean;

  activeTab: 'reply' | 'note' | 'followup';
  onTabChange: (tab: 'reply' | 'note' | 'followup') => void;

  onSendAttachment?: (file: File, type: 'image' | 'document' | 'video' | 'audio') => void;
  onSendVoiceNote?: (blob: Blob) => void;
}

export default function ComposeBar({
  phone,
  replyText,
  onReplyTextChange,
  onSendReply,
  sendingReply,
  noteText,
  onNoteTextChange,
  onSaveNote,
  savingNote,
  followUpDate,
  onFollowUpDateChange,
  onScheduleFollowUp,
  onCancelFollowUp,
  hasFollowUp,
  savingFollowUp,
  onAiDraftClick,
  loadingAiDraft,
  activeTab,
  onTabChange,
  onSendAttachment,
  onSendVoiceNote,
}: ComposeBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [replyText, activeTab]);

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert('File size must be under 30MB.');
      e.target.value = '';
      return;
    }

    let type: 'image' | 'document' | 'video' | 'audio' = 'document';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      // WhatsApp Cloud API only supports native inline videos up to 16MB. 
      // It also only supports mp4/3gp. 
      // To support up to 30MB (and formats like .mov), we send them as documents.
      if (file.size > 16 * 1024 * 1024 || (!file.name.toLowerCase().endsWith('.mp4') && !file.name.toLowerCase().endsWith('.3gp'))) {
        type = 'document';
      } else {
        type = 'video';
      }
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    }
    
    onSendAttachment?.(file, type);
    e.target.value = ''; // Reset input selection
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          onSendVoiceNote?.(audioBlob);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('Could not access microphone. Please check system permissions.');
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!shouldSend) {
      // Discard recording by clearing the stop handler callback
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      };
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const formatRecordTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="shrink-0 flex flex-col w-full relative">
      {/* Hidden file input picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
      />

      {/* AI Draft Floating Button */}
      <AnimatePresence>
        {activeTab === 'reply' && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-9 left-4 z-10"
          >
            <button
              type="button"
              onClick={onAiDraftClick}
              disabled={loadingAiDraft}
              className="flex items-center gap-1.5 bg-[#005C4B] hover:bg-[#007A62] text-white text-[11px] px-3 py-1.5 rounded-full shadow-md font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingAiDraft ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              <span>AI Draft</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs bar */}
      <div className="bg-[#1A2830] border-t border-[#2A3942] py-1 px-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-wider select-none">
        <button
          type="button"
          onClick={() => onTabChange('reply')}
          className={`py-1 transition-all cursor-pointer ${
            activeTab === 'reply'
              ? 'text-brand border-b-2 border-brand font-extrabold'
              : 'text-[#8696A0] hover:text-[#E9EDEF]'
          }`}
        >
          Reply
        </button>
        <button
          type="button"
          onClick={() => onTabChange('note')}
          className={`py-1 transition-all cursor-pointer ${
            activeTab === 'note'
              ? 'text-brand border-b-2 border-brand font-extrabold'
              : 'text-[#8696A0] hover:text-[#E9EDEF]'
          }`}
        >
          Private Note
        </button>
        <button
          type="button"
          onClick={() => onTabChange('followup')}
          className={`py-1 transition-all cursor-pointer ${
            activeTab === 'followup'
              ? 'text-brand border-b-2 border-brand font-extrabold'
              : 'text-[#8696A0] hover:text-[#E9EDEF]'
          }`}
        >
          Follow-up
        </button>
      </div>

      {/* Input / Compose Area */}
      <div className="bg-[#202C33] p-3 flex flex-col gap-2 w-full">
        {activeTab === 'reply' && (
          isRecording ? (
            <div className="flex items-center justify-between bg-[#2A3942] p-2.5 rounded-lg w-full gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-[#E9EDEF]">
                  Recording ({formatRecordTime(recordSeconds)})
                </span>
              </div>

              {/* Pulsing visual mockup bars */}
              <div className="flex-1 flex justify-center gap-0.5 max-w-[200px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => {
                  const randomHeight = Math.floor(Math.random() * 14) + 4;
                  return (
                    <span
                      key={bar}
                      className="w-0.5 bg-brand animate-pulse"
                      style={{
                        height: `${randomHeight}px`,
                        animationDuration: `${0.35 + bar * 0.04}s`,
                      }}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className="p-1.5 hover:bg-[#202C33] rounded-full text-red-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  title="Discard recording"
                >
                  <X size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  className="w-9 h-9 bg-brand hover:bg-brand-dark rounded-full text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Send voice note"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[#AEBAC1]">
                <button
                  type="button"
                  className="p-2 hover:bg-[#2A3942] rounded-lg transition-colors cursor-pointer"
                  title="Emoji"
                >
                  <Smile size={22} />
                </button>
                <button
                  type="button"
                  onClick={handlePaperclipClick}
                  className="p-2 hover:bg-[#2A3942] rounded-lg transition-colors cursor-pointer"
                  title="Attach file"
                >
                  <Paperclip size={20} />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={replyText}
                  onChange={(e) => onReplyTextChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendReply();
                    }
                  }}
                  placeholder="Type a message"
                  className="w-full bg-[#2A3942] border-none outline-none rounded-lg px-3 py-2 text-sm text-[#E9EDEF] placeholder-[#8696A0] resize-none overflow-y-auto max-h-[120px] font-sans"
                />
              </div>

              <div>
                {replyText.trim() ? (
                  <button
                    type="button"
                    onClick={onSendReply}
                    disabled={sendingReply}
                    className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-dark transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingReply ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-brand hover:bg-[#2A3942] transition-all cursor-pointer"
                    title="Record voice note"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'note' && (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              placeholder="Enter private notes about this lead..."
              className="w-full bg-[#2A3942] border-none outline-none rounded-lg px-3 py-2 text-sm text-[#E9EDEF] placeholder-[#8696A0] resize-none font-sans"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSaveNote}
                disabled={savingNote}
                className="bg-brand hover:bg-brand-dark disabled:bg-gray-700 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                {savingNote && <Loader2 size={11} className="animate-spin" />}
                <span>Save Note</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'followup' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#1A2830] border border-[#2A3942] rounded-xl">
            <div className="flex-grow">
              <label className="block text-[9px] font-extrabold text-[#8696A0] uppercase tracking-wider">
                Schedule Follow-up Date/Time
              </label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => onFollowUpDateChange(e.target.value)}
                className="text-xs font-semibold bg-[#2A3942] border border-[#3B4A54] rounded-lg px-2.5 py-1.5 mt-1 text-[#E9EDEF] focus:outline-none focus:border-brand cursor-pointer font-sans"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onScheduleFollowUp}
                disabled={savingFollowUp || !followUpDate}
                className="bg-brand hover:bg-brand-dark disabled:bg-gray-700 text-white text-[10px] font-extrabold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {savingFollowUp ? 'Saving...' : 'Schedule'}
              </button>
              {hasFollowUp && (
                <button
                  type="button"
                  onClick={onCancelFollowUp}
                  disabled={savingFollowUp}
                  className="bg-transparent border border-danger text-danger hover:bg-danger-bg text-[10px] font-extrabold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
