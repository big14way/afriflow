import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  title?: string;
  learnMoreUrl?: string;
}

export function HelpTooltip({ content, title, learnMoreUrl }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl p-3 max-w-xs">
              {title && (
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
              )}
              <p className="text-xs leading-relaxed text-slate-200">{content}</p>
              {learnMoreUrl && (
                <a
                  href={learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-afri-400 hover:text-afri-300 mt-2 inline-block"
                >
                  Learn more →
                </a>
              )}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pre-defined tooltips for common terms
export const TOOLTIPS = {
  escrow: {
    title: 'Escrow Payment',
    content: 'Funds are held securely until milestones are completed. You control when to release payments.',
    learnMoreUrl: 'https://docs.afriflow.app/escrow',
  },
  milestone: {
    title: 'Milestone',
    content: 'A specific deliverable or checkpoint that must be met before funds are released.',
  },
  gasless: {
    title: 'No Gas Fees',
    content: 'AfriFlow covers transaction costs so you only pay the 0.1% platform fee.',
  },
  x402: {
    title: 'Cronos x402',
    content: 'A fast settlement protocol that processes your payment in under 1 second.',
  },
  approval: {
    title: 'Token Approval',
    content: 'Allows the contract to spend your USDC. You control the amount and can revoke anytime.',
  },
  allowance: {
    title: 'Allowance',
    content: 'The maximum amount of USDC the contract can spend on your behalf.',
  },
};
