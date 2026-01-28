"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// Check if speech recognition is supported
function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function VoiceInput({ 
  onTranscript, 
  onInterimTranscript,
  disabled,
  className 
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-AU";

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText("");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        onInterimTranscript?.(interim);
      }

      if (final) {
        onTranscript(final);
        setInterimText("");
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimText("");
      
      // Show user-friendly message for common errors
      if (event.error === "network") {
        alert("Voice input requires internet connection. Please type your symptoms instead.");
      } else if (event.error === "not-allowed") {
        alert("Microphone access denied. Please allow microphone permission and try again.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript, onInterimTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          "relative transition-all",
          isListening && "animate-pulse"
        )}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-md border-2 border-destructive"
            />
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {interimText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-0 right-0 p-2 bg-muted rounded-lg text-sm text-muted-foreground min-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="italic">{interimText}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
