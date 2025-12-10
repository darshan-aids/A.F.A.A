
import React, { useEffect, useRef, useState } from 'react';
import { getGeminiClient, createPcmBlob } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';

interface LiveAudioAgentProps {
  onClose: () => void;
}

export const LiveAudioAgent: React.FC<LiveAudioAgentProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [isTalking, setIsTalking] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        const ai = getGeminiClient();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Input Audio Setup (16kHz for Gemini)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        inputSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        // Output Audio Setup (24kHz for Gemini response)
        outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        outputNodeRef.current = outputContextRef.current.createGain();
        outputNodeRef.current.connect(outputContextRef.current.destination);

        // Connect to Live API
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: "You are A.F.A.A., a helpful financial assistant. Keep responses concise.",
          },
          callbacks: {
            onopen: () => {
              if (mounted) setStatus('connected');
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && outputContextRef.current && outputNodeRef.current) {
                setIsTalking(true);
                const ctx = outputContextRef.current;
                
                // Decode
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                
                const int16Data = new Int16Array(bytes.buffer);
                const buffer = ctx.createBuffer(1, int16Data.length, 24000);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < int16Data.length; i++) {
                   channelData[i] = int16Data[i] / 32768.0;
                }

                // Play
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNodeRef.current);
                
                const currentTime = ctx.currentTime;
                const startTime = Math.max(nextStartTimeRef.current, currentTime);
                source.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
                
                source.onended = () => setIsTalking(false);
              }
              
              if (message.serverContent?.turnComplete) {
                setIsTalking(false);
              }
            },
            onclose: () => {
              if (mounted) setStatus('disconnected');
            },
            onerror: (err) => {
              console.error(err);
              if (mounted) setStatus('error');
            }
          }
        });

        sessionPromiseRef.current = sessionPromise;

        // Start Processing Audio Input
        processorRef.current.onaudioprocess = (e) => {
           const inputData = e.inputBuffer.getChannelData(0);
           const pcmBlob = createPcmBlob(inputData);
           sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
           });
        };

        inputSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

        // Cleanup function for this specific session
        disconnectRef.current = () => {
             inputSourceRef.current?.disconnect();
             processorRef.current?.disconnect();
             audioContextRef.current?.close();
             outputContextRef.current?.close();
             sessionPromise.then(s => s.close()); // No direct close check available
             stream.getTracks().forEach(t => t.stop());
        };

      } catch (e) {
        console.error("Failed to start live session", e);
        setStatus('error');
      }
    };

    startSession();

    return () => {
      mounted = false;
      if (disconnectRef.current) disconnectRef.current();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-brand-dark border border-brand-lime rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(210,241,89,0.2)] flex flex-col items-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${status === 'connected' ? 'bg-brand-lime/10 shadow-[0_0_30px_rgba(210,241,89,0.3)]' : 'bg-slate-800'}`}>
           {status === 'connecting' && <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin"></div>}
           {status === 'connected' && (
             <div className={`w-16 h-16 rounded-full bg-brand-lime transition-all duration-100 ${isTalking ? 'scale-110 shadow-[0_0_40px_rgba(210,241,89,0.8)]' : 'scale-100'}`}></div>
           )}
           {status === 'error' && <span className="text-3xl">⚠️</span>}
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Gemini Live</h2>
        <p className="text-sm text-slate-400 text-center mb-6">
          {status === 'connecting' && "Establishing secure connection..."}
          {status === 'connected' && "Listening... Speak naturally."}
          {status === 'error' && "Connection failed. Please check permissions."}
        </p>

        <div className="flex gap-2">
           <div className={`w-2 h-2 rounded-full ${isTalking ? 'bg-brand-cyan animate-bounce' : 'bg-slate-700'}`}></div>
           <div className={`w-2 h-2 rounded-full ${isTalking ? 'bg-brand-lime animate-bounce delay-75' : 'bg-slate-700'}`}></div>
           <div className={`w-2 h-2 rounded-full ${isTalking ? 'bg-brand-purple animate-bounce delay-150' : 'bg-slate-700'}`}></div>
        </div>
      </div>
    </div>
  );
};
