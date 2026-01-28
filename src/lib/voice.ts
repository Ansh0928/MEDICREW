/**
 * Voice utilities using Web Speech API (free, browser-based)
 */

// Check if speech recognition is supported
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

// Check if speech synthesis is supported
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Speak text using speech synthesis
export function speak(
  text: string, 
  options?: {
    rate?: number;
    pitch?: number;
    voice?: string;
    onEnd?: () => void;
  }
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) return null;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  
  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) => 
      v.lang.startsWith("en") && 
      (v.name.includes("Samantha") || // macOS
       v.name.includes("Google") ||   // Chrome
       v.name.includes("Microsoft"))  // Edge
  ) || voices.find((v) => v.lang.startsWith("en"));
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }
  
  window.speechSynthesis.speak(utterance);
  return utterance;
}

// Stop speaking
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Get available voices
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}
