import { motion } from 'framer-motion';
import { Send, Eye, History, HelpCircle, Zap, ShieldCheck } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  prompt: string;
  color?: string;
}

interface QuickActionsProps {
  onActionClick: (prompt: string) => void;
  customActions?: QuickAction[];
  showDefault?: boolean;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    icon: Send,
    label: 'Send Payment',
    prompt: 'I want to send a payment',
    color: 'text-afri-600 dark:text-afri-400',
  },
  {
    icon: ShieldCheck,
    label: 'Create Escrow',
    prompt: 'I want to create an escrow with milestones',
    color: 'text-prosperity-600 dark:text-prosperity-400',
  },
  {
    icon: Eye,
    label: 'View Escrows',
    prompt: 'Show me my escrows',
    color: 'text-ocean-600 dark:text-ocean-400',
  },
  {
    icon: History,
    label: 'Transaction History',
    prompt: 'Show my transaction history',
    color: 'text-slate-600 dark:text-slate-400',
  },
];

const ADVANCED_ACTIONS: QuickAction[] = [
  {
    icon: Zap,
    label: 'Check Balance',
    prompt: 'What is my USDC balance?',
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: HelpCircle,
    label: 'How It Works',
    prompt: 'How does AfriFlow work?',
    color: 'text-purple-600 dark:text-purple-400',
  },
];

export function QuickActions({
  onActionClick,
  customActions,
  showDefault = true,
}: QuickActionsProps) {
  const actions = customActions || (showDefault ? DEFAULT_ACTIONS : ADVANCED_ACTIONS);

  return (
    <div className="w-full">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">
        Quick actions:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onActionClick(action.prompt)}
            className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50
                     transition-all duration-200 group text-left"
          >
            <action.icon
              className={`w-4 h-4 ${action.color || 'text-afri-600 dark:text-afri-400'}
                         group-hover:scale-110 transition-transform`}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

interface SmartSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export function SmartSuggestions({ suggestions, onSuggestionClick }: SmartSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="w-full mb-4">
      <p className="text-xs text-afri-600 dark:text-afri-400 mb-2 px-1 flex items-center gap-1">
        <Zap className="w-3 h-3" />
        Suggested for you:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-3 py-1.5 rounded-full text-xs font-medium
                     bg-gradient-to-r from-afri-500 to-ocean-500 text-white
                     hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
