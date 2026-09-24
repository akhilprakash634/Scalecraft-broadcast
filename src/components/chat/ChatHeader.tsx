'use client';

import React from 'react';
import { MoreVertical, Sparkles, CheckCircle } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface ChatHeaderProps {
  name: string;
  phone: string;
  intent?: string;
  connectionType?: string;
  statusText?: string;
  onAnalyzeLead?: () => void;
  onMarkConverted?: () => void;
  onToggleActions?: () => void;
  showLeadActions?: boolean;
  isDnd?: boolean;
  onToggleDnd?: () => void;
}

export default function ChatHeader({
  name,
  phone,
  intent = '',
  connectionType = '',
  statusText,
  onAnalyzeLead,
  onMarkConverted,
  onToggleActions,
  showLeadActions = false,
  isDnd = false,
  onToggleDnd,
}: ChatHeaderProps) {
  // Format phone number
  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return `+${cleaned}`;
  };

  const displayStatus =
    statusText ||
    `${formatPhoneNumber(phone)} · ${
      connectionType === 'cloud_api' ? 'Cloud API' : 'Quick Connect'
    }`;

  return (
    <div className="relative h-14 bg-chat-header border-b border-border-strong/10 flex items-center justify-between px-4 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <Avatar name={name} phone={phone} intent={intent} size="md" />
        <div className="flex flex-col truncate">
          <span className="text-sm font-semibold text-[#E9EDEF] truncate">
            {name || formatPhoneNumber(phone)}
          </span>
          <span className="text-[11px] text-[#8696A0] truncate font-medium">
            {displayStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[#AEBAC1]">
        <button
          type="button"
          onClick={onAnalyzeLead}
          className="p-2 rounded-lg hover:bg-white/10 text-[#AEBAC1] transition-colors cursor-pointer"
          title="Analyze lead with AI"
        >
          <Sparkles size={18} />
        </button>
        <button
          type="button"
          onClick={onMarkConverted}
          className="p-2 rounded-lg hover:bg-white/10 text-[#AEBAC1] transition-colors cursor-pointer"
          title="Mark as converted"
        >
          <CheckCircle size={18} />
        </button>
        <button
          type="button"
          onClick={onToggleActions}
          className="p-2 rounded-lg hover:bg-white/10 text-[#AEBAC1] transition-colors cursor-pointer"
          title="More actions"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {showLeadActions && (
        <div className="absolute right-4 top-14 bg-[#233138] border border-[#2F3C44] rounded-lg shadow-lg py-1.5 min-w-[160px] z-50 text-sm animate-fadeIn">
          <button
            type="button"
            onClick={() => {
              onToggleDnd?.();
              onToggleActions?.();
            }}
            className="w-full text-left px-4 py-2 hover:bg-[#182229] text-[#D1D7DB] transition-colors cursor-pointer"
          >
            {isDnd ? 'Remove DND' : 'Add DND'}
          </button>
        </div>
      )}
    </div>
  );
}
