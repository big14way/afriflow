import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
}

export function VoiceInput({ onTranscript, language = 'en-US' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getLanguageCode(language);

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
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
    return null; // Hide if not supported
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleListening}
      disabled={isListening}
      className={`relative p-2 rounded-lg transition-all ${
        isListening
          ? 'bg-red-500 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
      title={isListening ? 'Listening... Click to stop' : 'Click to use voice input'}
    >
      {isListening ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-red-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        </>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </motion.button>
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
