'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  const dotTransition = (delay: number) => ({
    y: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: 'reverse' as const,
      ease: 'easeInOut' as const,
      delay,
    },
  });

  return (
    <div className="flex justify-end mb-2">
      <div className="bg-chat-outgoing border border-brand/10 dark:bg-brand/20 dark:border-brand/30 rounded-[12px_2px_12px_12px] px-4 py-2.5 shadow-xs text-xs flex items-center gap-2 select-none">
        <div className="flex items-center gap-1">
          <motion.span
            animate={{ y: [-2, 2] }}
            transition={dotTransition(0)}
            className="w-1.5 h-1.5 bg-[#667781] dark:bg-text-secondary rounded-full inline-block"
          />
          <motion.span
            animate={{ y: [-2, 2] }}
            transition={dotTransition(0.15)}
            className="w-1.5 h-1.5 bg-[#667781] dark:bg-text-secondary rounded-full inline-block"
          />
          <motion.span
            animate={{ y: [-2, 2] }}
            transition={dotTransition(0.3)}
            className="w-1.5 h-1.5 bg-[#667781] dark:bg-text-secondary rounded-full inline-block"
          />
        </div>
        <span className="text-[11px] font-bold text-chat-time dark:text-text-secondary">
          Agent is typing...
        </span>
      </div>
    </div>
  );
}
