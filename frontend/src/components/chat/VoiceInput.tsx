import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
}

export function VoiceInput({ onTranscript, language = 'en-US' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('Speech recognition not supported in this browser');
      setIsSupported(false);
      setError('Voice input not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = getLanguageCode(language);

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError('');

        // Auto-stop after 10 seconds to prevent hanging
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 10000);
      };

      recognition.onresult = (event: any) => {
        console.log('Speech recognition result received');
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);
        onTranscript(transcript);
        setIsListening(false);
        clearTimeout(timeoutRef.current);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error, event);
        console.log('🔍 Diagnostic Info:', {
          browser: navigator.userAgent,
          online: navigator.onLine,
          language: recognition.lang,
          speechRecognitionSupport: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
        });
        clearTimeout(timeoutRef.current);

        let errorMsg = 'Voice input failed';
        switch (event.error) {
          case 'no-speech':
            errorMsg = 'No speech detected. Try again.';
            break;
          case 'audio-capture':
            errorMsg = 'Microphone not found';
            break;
          case 'not-allowed':
            errorMsg = 'Microphone permission denied. Check browser settings.';
            break;
          case 'network':
            errorMsg = 'Cannot reach speech service. Try: 1) Different browser (Chrome/Edge) 2) Disable ad-blockers 3) Check firewall';
            console.warn('🔴 NETWORK ERROR TROUBLESHOOTING:');
            console.warn('1. Browser: Use Chrome or Edge (best support)');
            console.warn('2. Extensions: Disable ad-blockers/privacy extensions');
            console.warn('3. Firewall: Check if blocking Google Speech API (speech.googleapis.com)');
            console.warn('4. Network: Corporate/school networks may block this');
            console.warn('5. Permissions: Ensure microphone permission is granted');
            break;
          case 'aborted':
            errorMsg = 'Recording cancelled';
            break;
          case 'service-not-allowed':
            errorMsg = 'Speech service not available';
            break;
        }

        setError(errorMsg);
        setIsListening(false);

        // Show error longer for network issues
        const timeout = event.error === 'network' ? 8000 : 3000;
        setTimeout(() => setError(''), timeout);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        clearTimeout(timeoutRef.current);
      };

      recognitionRef.current = recognition;
      console.log('Speech recognition initialized');
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsSupported(false);
      setError('Failed to initialize voice input');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, onTranscript]);

  const toggleListening = () => {
    console.log('Toggle listening clicked, current state:', isListening);

    if (!recognitionRef.current) {
      console.error('Recognition not initialized');
      setError('Voice input not available');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
        console.log('Stopping recognition');
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
        setIsListening(false);
      }
    } else {
      try {
        setError('');
        recognitionRef.current.start();
        console.log('Starting recognition');
      } catch (error: any) {
        console.error('Failed to start speech recognition:', error);
        setError('Failed to start voice input. Try again.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Map language codes to speech recognition language codes
  function getLanguageCode(lang: string): string {
    const map: Record<string, string> = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'sw': 'sw-KE',
      'pt': 'pt-BR',
    };
    return map[lang] || 'en-US';
  }

  if (!isSupported) {
    return (
      <div className="relative">
        <button
          disabled
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
          title="Voice input not supported"
        >
          <MicOff className="w-5 h-5" />
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap">
            Voice input not supported in this browser
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={toggleListening}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white'
            : error
            ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title={
          error
            ? error
            : isListening
            ? 'Listening... Click to stop'
            : 'Click to use voice input'
        }
      >
        {isListening ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Mic className="w-5 h-5" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-red-500"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
          </>
        ) : error ? (
          <AlertCircle className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </motion.button>

      {/* Tooltip */}
      {showTooltip && !error && !isListening && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap z-50"
        >
          <div className="font-semibold mb-1">🎤 Voice Input</div>
          <div className="text-slate-300">Click to speak • Internet required</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
        </motion.div>
      )}

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap max-w-xs z-50"
          >
            {error}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap z-50"
          >
            🎤 Listening... Speak now
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Voice Input Status Indicator
 */
interface VoiceStatusProps {
  isListening: boolean;
}

export function VoiceStatus({ isListening }: VoiceStatusProps) {
  if (!isListening) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-red-500"
      />
      <span className="text-sm font-medium text-red-700 dark:text-red-400">
        Listening...
      </span>
      <MicOff className="w-4 h-4 text-red-600 dark:text-red-400 ml-1" />
    </motion.div>
  );
}
