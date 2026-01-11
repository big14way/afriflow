import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  name?: string;
}

export function TypingIndicator({ name = 'AfriFlow AI' }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 max-w-md"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-afri-500 to-ocean-500 flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1">
        <div className="chat-bubble-assistant inline-block">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
              {name} is typing
            </span>
            <div className="typing-indicator-dots">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                className="inline-block w-2 h-2 rounded-full bg-afri-500"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                className="inline-block w-2 h-2 rounded-full bg-afri-500 mx-1"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                className="inline-block w-2 h-2 rounded-full bg-afri-500"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
