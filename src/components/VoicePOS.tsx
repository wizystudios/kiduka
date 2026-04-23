import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VoiceCommandProcessor } from '@/utils/voiceCommandProcessor';
import { speakAssistantText } from '@/utils/voiceAssistantSpeech';
import {
  Activity,
  CheckCircle,
  Ear,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  Radio,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Wrench,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode?: string;
  low_stock_threshold?: number;
}

interface SaleItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface VoiceAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceAssistantFunctionResult {
  success: boolean;
  message: string;
  intent?: 'answer' | 'add_to_sale' | 'remove_from_sale' | 'clear_sale' | 'complete_sale';
  productId?: string | null;
  quantity?: number | null;
  confidence?: number;
}

type AssistantMode = 'disabled' | 'sleeping' | 'awake';
type VoiceStatus = 'idle' | 'permission' | 'listening' | 'hearing' | 'processing' | 'speaking' | 'error';
type ListeningSource = 'handsfree' | 'push-to-talk' | 'permission-wizard' | 'system';
type RecognitionMode = 'handsfree' | 'push-to-talk';

type NurathLogEntry = {
  id: string;
  timestamp: number;
  kind: 'command' | 'wake' | 'reply' | 'error' | 'permission' | 'status';
  source: ListeningSource;
  transcript?: string;
  command?: string;
  response?: string;
  apiLatencyMs?: number | null;
  wakeTriggered?: boolean;
  note?: string;
};

type WakeDebugState = {
  heardText: string;
  normalizedText: string;
  matchedAlias: string | null;
  triggered: boolean;
  timestamp: number | null;
};

type MicPermissionState = 'unknown' | 'granted' | 'needs-gesture' | 'denied' | 'unsupported';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    webkitAudioContext?: typeof AudioContext;
  }
}

const NURATH_AUTO_LISTEN_KEY = 'kiduka_nurath_handsfree_enabled';
const WAKE_WORD_ALIASES = ['nurath', 'nurat', 'nurathi', 'norath', 'nura'];
const SLEEP_PATTERNS = [
  /\bzima\b/i,
  /\blala\b/i,
  /\bnyamaza\b/i,
  /\bturn ?off\b/i,
  /\bstop listening\b/i,
  /\bgo to sleep\b/i,
];

const normalizeVoiceText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripWakeWord = (value: string) =>
  value
    .replace(/\bnurath\b/gi, '')
    .replace(/\bnurat\b/gi, '')
    .replace(/\bnurathi\b/gi, '')
    .replace(/\bnorath\b/gi, '')
    .replace(/\bnura\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const detectWakePhrase = (spokenText: string): WakeDebugState => {
  const normalizedText = normalizeVoiceText(spokenText);
  const tokens = normalizedText.split(' ').filter(Boolean);

  const matchedAlias = WAKE_WORD_ALIASES.find((alias) =>
    normalizedText.includes(alias) ||
    tokens.some((token) => token === alias || token.startsWith(alias) || alias.startsWith(token)),
  ) ?? null;

  return {
    heardText: spokenText,
    normalizedText,
    matchedAlias,
    triggered: Boolean(matchedAlias),
    timestamp: Date.now(),
  };
};

const createLogId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const formatLogTime = (timestamp: number | null) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const VoicePOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('disabled');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [micPermissionState, setMicPermissionState] = useState<MicPermissionState>('unknown');
  const [micError, setMicError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastApiLatency, setLastApiLatency] = useState<number | null>(null);
  const [lastCommand, setLastCommand] = useState('');
  const [lastCommandAt, setLastCommandAt] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isReceivingAudio, setIsReceivingAudio] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [wakeDebug, setWakeDebug] = useState<WakeDebugState>({
    heardText: '',
    normalizedText: '',
    matchedAlias: null,
    triggered: false,
    timestamp: null,
  });
  const [nurathLogs, setNurathLogs] = useState<NurathLogEntry[]>([]);

  const recognitionRef = useRef<any>(null);
  const commandProcessorRef = useRef<VoiceCommandProcessor | null>(null);
  const assistantModeRef = useRef<AssistantMode>('disabled');
  const shouldRestartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const processingRef = useRef(false);
  const currentSaleRef = useRef<SaleItem[]>([]);
  const conversationHistoryRef = useRef<VoiceAssistantMessage[]>([]);
  const restartTimeoutRef = useRef<number | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const recognitionModeRef = useRef<RecognitionMode>('handsfree');
  const activeListeningSourceRef = useRef<ListeningSource>('system');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);

  const speechRecognitionSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const appendLog = useCallback((entry: Omit<NurathLogEntry, 'id' | 'timestamp'>) => {
    setNurathLogs((prev) => [
      {
        id: createLogId(),
        timestamp: Date.now(),
        ...entry,
      },
      ...prev,
    ].slice(0, 8));
  }, []);

  const updateAssistantMode = useCallback((mode: AssistantMode) => {
    assistantModeRef.current = mode;
    setAssistantMode(mode);
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (audioFrameRef.current) {
      window.cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }

    audioSourceNodeRef.current?.disconnect();
    audioSourceNodeRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setAudioLevel(0);
    setIsReceivingAudio(false);
  }, []);

  const startAudioMonitoring = useCallback(async (stream: MediaStream) => {
    stopAudioMonitoring();
    mediaStreamRef.current = stream;

    const tracksLive = stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled);
    setIsReceivingAudio(stream.active && tracksLive);

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    try {
      const audioContext = new AudioContextCtor();
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => undefined);
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      audioContextRef.current = audioContext;
      audioSourceNodeRef.current = sourceNode;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current || !mediaStreamRef.current) return;

        analyserRef.current.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        for (const value of dataArray) {
          const normalized = (value - 128) / 128;
          sumSquares += normalized * normalized;
        }

        const rms = Math.sqrt(sumSquares / dataArray.length);
        const level = Math.min(1, rms * 4.8);
        const activeTracks = mediaStreamRef.current.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled);

        setAudioLevel(level);
        setIsReceivingAudio(Boolean(mediaStreamRef.current.active && activeTracks && (level > 0.01 || isListeningRef.current)));
        audioFrameRef.current = window.requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setAudioLevel(0);
      setIsReceivingAudio(stream.active && tracksLive);
    }
  }, [stopAudioMonitoring]);

  useEffect(() => {
    currentSaleRef.current = currentSale;
  }, [currentSale]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    commandProcessorRef.current = new VoiceCommandProcessor(products, currentSaleRef.current);
  }, [products, currentSale]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, barcode, low_stock_threshold')
        .eq('owner_id', user.id);

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [user]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const persistHandsfreePreference = useCallback((enabled: boolean) => {
    try {
      window.localStorage.setItem(NURATH_AUTO_LISTEN_KEY, enabled ? 'true' : 'false');
    } catch {
      // ignore storage failures
    }
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (!text.trim()) return Promise.resolve();

    setVoiceStatus('speaking');
    isSpeakingRef.current = true;

    return speakAssistantText(text, { preferredVoiceGender: 'female' })
      .catch(() => undefined)
      .finally(() => {
        isSpeakingRef.current = false;
        setVoiceStatus(shouldRestartRef.current ? 'listening' : 'idle');
      });
  }, []);

  const handleMicAccessError = useCallback((error: unknown, mode: 'auto' | 'gesture', source: ListeningSource) => {
    const errorName = typeof error === 'object' && error && 'name' in error
      ? String((error as { name?: string }).name)
      : 'UnknownError';

    let message = 'Nurath hakuweza kufungua maikrofoni yako.';

    if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
      message = mode === 'auto'
        ? 'Nurath anahitaji ruhusa ya mara moja ya maikrofoni kabla hajaanza kujibu kwa jina lake.'
        : 'Ruhusu maikrofoni kwenye kivinjari ili Nurath asikie sauti yako.';
      setMicPermissionState(mode === 'auto' ? 'needs-gesture' : 'denied');
    } else if (errorName === 'NotFoundError') {
      message = 'Hakuna maikrofoni iliyopatikana kwenye kifaa hiki.';
      setMicPermissionState('unsupported');
    } else if (errorName === 'NotReadableError') {
      message = 'Maikrofoni inatumika na app nyingine. Ifunge kwanza kisha ujaribu tena.';
      setMicPermissionState('needs-gesture');
    }

    setVoiceStatus('error');
    setMicError(message);
    setLastResponse(message);
    appendLog({ kind: 'error', source, note: message });
  }, [appendLog]);

  const ensureMicrophonePermission = useCallback(async (mode: 'auto' | 'gesture', source: ListeningSource) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermissionState('unsupported');
      setMicError('Kivinjari hiki hakina msaada wa maikrofoni kwa Nurath.');
      setVoiceStatus('error');
      appendLog({ kind: 'error', source, note: 'Microphone API is unsupported on this browser.' });
      return false;
    }

    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });

        if (status.state === 'denied') {
          setMicPermissionState('denied');
          setVoiceStatus('error');
          const message = 'Maikrofoni imezuiwa kwenye kivinjari. Iruhusu kisha urudi tena.';
          setMicError(message);
          setLastResponse(message);
          appendLog({ kind: 'permission', source, note: message });
          return false;
        }

        if (status.state === 'prompt' && mode === 'auto') {
          setMicPermissionState('needs-gesture');
          setVoiceStatus('permission');
          setMicError(null);
          const message = 'Gusa mara moja tu kuruhusu maikrofoni; baada ya hapo utaita “Nurath” bila kubonyeza tena.';
          setLastResponse(message);
          appendLog({ kind: 'permission', source, note: 'Browser still needs one tap to grant microphone permission.' });
          return false;
        }
      }

      if (mediaStreamRef.current?.active) {
        setMicPermissionState('granted');
        setMicError(null);
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      await startAudioMonitoring(stream);
      setMicPermissionState('granted');
      setMicError(null);
      appendLog({ kind: 'permission', source, note: 'Microphone granted and receiving audio.' });
      return true;
    } catch (error) {
      handleMicAccessError(error, mode, source);
      return false;
    }
  }, [appendLog, handleMicAccessError, startAudioMonitoring]);

  const rememberConversation = useCallback((command: string, reply: string) => {
    const next: VoiceAssistantMessage[] = [
      ...conversationHistoryRef.current,
      { role: 'user', content: command },
      { role: 'assistant', content: reply },
    ];
    conversationHistoryRef.current = next.slice(-12);
  }, []);

  const askVoiceAssistant = useCallback(async (command: string) => {
    if (!user) return null;

    const { data, error } = await supabase.functions.invoke('voice-pos-assistant', {
      body: {
        message: command,
        currentSale: currentSaleRef.current,
        conversationHistory: conversationHistoryRef.current,
      },
    });

    if (error) {
      console.error('Voice assistant invoke error:', error);
      return null;
    }

    return data as VoiceAssistantFunctionResult;
  }, [user]);

  const completeSale = useCallback(async (announce = true) => {
    const saleItems = currentSaleRef.current;

    if (saleItems.length === 0) {
      return 'Hakuna bidhaa kwenye mauzo ya sasa.';
    }

    try {
      const totalAmount = saleItems.reduce((sum, item) => sum + item.total_price, 0);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({ owner_id: user?.id, total_amount: totalAmount, payment_method: 'cash' })
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of saleItems) {
        await supabase.from('sales_items').insert({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.total_price,
        });

        await supabase
          .from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id);
      }

      setCurrentSale([]);
      await fetchProducts();

      const message = `Mauzo yamekamilika. Jumla ni shilingi ${totalAmount.toLocaleString()}.`;
      setLastResponse(message);
      toast({ title: 'Mauzo Yamekamilika', description: `Jumla: TZS ${totalAmount.toLocaleString()}` });

      if (announce) {
        await speakResponse(message);
      }

      return message;
    } catch {
      toast({ title: 'Hitilafu', description: 'Imeshindwa kukamilisha mauzo', variant: 'destructive' });
      return 'Imeshindwa kukamilisha mauzo. Jaribu tena.';
    }
  }, [fetchProducts, speakResponse, toast, user]);

  const applyAssistantAction = useCallback(async (result: any) => {
    const action = result.data?.action || 'answer';

    if (action === 'add_to_sale') {
      const product: Product | undefined = result.data?.product;
      const quantity = Math.max(1, Number(result.data?.quantity || 1));

      if (!product) {
        return 'Sijapata bidhaa hiyo kwa uhakika. Tafadhali sema jina la bidhaa tena.';
      }

      const existingSaleItem = currentSaleRef.current.find((item) => item.product.id === product.id);
      const currentQuantity = existingSaleItem?.quantity ?? 0;

      if (product.stock_quantity < currentQuantity + quantity) {
        return `Stock ya ${product.name} haitoshi. Iliyopo ni ${product.stock_quantity}.`;
      }

      setCurrentSale((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);

        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  total_price: (item.quantity + quantity) * item.unit_price,
                }
              : item,
          );
        }

        return [...prev, { product, quantity, unit_price: product.price, total_price: quantity * product.price }];
      });

      return result.message;
    }

    if (action === 'remove_from_sale') {
      const product: Product | undefined = result.data?.product;
      const quantity = Math.max(1, Number(result.data?.quantity || 1));

      if (!product) {
        return 'Niambie bidhaa unayotaka kuondoa kwenye mauzo ya sasa.';
      }

      const existing = currentSaleRef.current.find((item) => item.product.id === product.id);
      if (!existing) {
        return `${product.name} haipo kwenye mauzo ya sasa.`;
      }

      setCurrentSale((prev) =>
        prev.flatMap((item) => {
          if (item.product.id !== product.id) return [item];

          const remaining = item.quantity - quantity;
          if (remaining <= 0) return [];

          return [{ ...item, quantity: remaining, total_price: remaining * item.unit_price }];
        }),
      );

      return result.message;
    }

    if (action === 'clear_sale') {
      const hadItems = currentSaleRef.current.length > 0;
      setCurrentSale([]);
      return hadItems ? 'Sawa, nimefuta mauzo ya sasa.' : 'Hakuna mauzo ya kufuta.';
    }

    if (action === 'complete_sale') {
      return completeSale(false);
    }

    return result.message;
  }, [completeSale]);

  const processVoiceCommand = useCallback(async (command: string, source: ListeningSource = 'handsfree') => {
    if (!user) return;

    const normalizedCommand = normalizeVoiceText(command);
    const cleanedCommand = stripWakeWord(command) || command;
    const processor = commandProcessorRef.current ?? new VoiceCommandProcessor(products, currentSaleRef.current);
    commandProcessorRef.current = processor;

    setLastCommand(cleanedCommand);
    setLastCommandAt(Date.now());
    appendLog({ kind: 'command', source, command: cleanedCommand, transcript: command });

    if (SLEEP_PATTERNS.some((pattern) => pattern.test(normalizedCommand))) {
      const sleepReply = 'Sawa, nimelala. Ukiita Nurath nitarudi.';
      updateAssistantMode('sleeping');
      setVoiceStatus('listening');
      setLastResponse(sleepReply);
      rememberConversation(command, sleepReply);
      appendLog({ kind: 'status', source, command: cleanedCommand, response: sleepReply, note: 'Handsfree mode switched back to sleeping.' });
      await speakResponse(sleepReply);
      return;
    }

    processingRef.current = true;
    setProcessing(true);
    setVoiceStatus('processing');
    setMicError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    try {
      let result = await processor.processCommand(cleanedCommand, user.id);
      let apiLatencyMs: number | null = null;

      if (!result.success) {
        const apiStartedAt = performance.now();
        const aiResult = await askVoiceAssistant(cleanedCommand);
        apiLatencyMs = Math.round(performance.now() - apiStartedAt);
        setLastApiLatency(apiLatencyMs);

        if (aiResult?.success) {
          const matchedProduct = aiResult.productId ? products.find((product) => product.id === aiResult.productId) : undefined;

          result = {
            success: true,
            message: aiResult.message,
            data: {
              action: aiResult.intent || 'answer',
              product: matchedProduct,
              quantity: aiResult.quantity ?? 1,
              confidence: aiResult.confidence,
            },
          };
        } else {
          appendLog({
            kind: 'error',
            source,
            command: cleanedCommand,
            apiLatencyMs,
            note: 'AI fallback did not return a usable answer.',
          });
        }
      } else {
        setLastApiLatency(null);
      }

      const finalMessage = result.success
        ? await applyAssistantAction(result)
        : 'Samahani, sijaweza kukusaidia kwa ombi hilo kwa sasa.';

      try {
        await supabase.from('voice_commands').insert([{
          user_id: user.id,
          command_text: cleanedCommand,
          command_type: 'voice_command',
          result: { ...result, finalMessage } as any,
        }]);
      } catch {
        // ignore logging failures
      }

      setLastResponse(finalMessage);
      rememberConversation(cleanedCommand, finalMessage);
      appendLog({
        kind: 'reply',
        source,
        command: cleanedCommand,
        transcript: currentTranscript,
        response: finalMessage,
        apiLatencyMs: lastApiLatency,
      });
      await speakResponse(finalMessage);
    } catch {
      const errMsg = 'Samahani, kuna hitilafu. Jaribu tena.';
      setVoiceStatus('error');
      setMicError(errMsg);
      setLastResponse(errMsg);
      rememberConversation(command, errMsg);
      appendLog({ kind: 'error', source, command: cleanedCommand, note: errMsg });
      await speakResponse(errMsg);
    } finally {
      processingRef.current = false;
      setProcessing(false);

      if (shouldRestartRef.current && recognitionRef.current && recognitionModeRef.current === 'handsfree') {
        window.clearTimeout(restartTimeoutRef.current ?? undefined);
        restartTimeoutRef.current = window.setTimeout(() => {
          if (shouldRestartRef.current && recognitionRef.current && !isSpeakingRef.current && !processingRef.current) {
            try {
              recognitionRef.current.start();
              setVoiceStatus('listening');
            } catch {
              // ignore restart errors
            }
          }
        }, 450);
      } else if (!isSpeakingRef.current) {
        setVoiceStatus(micPermissionState === 'granted' ? 'idle' : 'permission');
      }
    }
  }, [
    appendLog,
    applyAssistantAction,
    askVoiceAssistant,
    currentTranscript,
    lastApiLatency,
    micPermissionState,
    products,
    rememberConversation,
    speakResponse,
    updateAssistantMode,
    user,
  ]);

  const startRecognitionSession = useCallback((config: {
    mode: RecognitionMode;
    source: ListeningSource;
    persist?: boolean;
    requireGesture?: boolean;
  }) => {
    if (!speechRecognitionSupported) {
      setMicPermissionState('unsupported');
      setVoiceStatus('error');
      setMicError('Kivinjari hiki hakitumii utambuzi wa sauti wa Nurath.');
      appendLog({ kind: 'error', source: config.source, note: 'SpeechRecognition API is unsupported.' });
      toast({ title: 'Hakuna Msaada wa Sauti', description: 'Kivinjari hiki hakitumii utambuzi wa sauti', variant: 'destructive' });
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionConstructor();

    recognition.continuous = config.mode === 'handsfree';
    recognition.interimResults = true;
    recognition.lang = 'sw-TZ';
    recognition.maxAlternatives = 1;

    recognitionModeRef.current = config.mode;
    activeListeningSourceRef.current = config.source;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('listening');
      setMicPermissionState('granted');
      setMicError(null);

      if (config.mode === 'handsfree') {
        updateAssistantMode(assistantModeRef.current === 'awake' ? 'awake' : 'sleeping');
        setLastResponse((current) => current || 'Nurath anasikiliza. Sema “Nurath” kumwamsha.');
      } else {
        updateAssistantMode('awake');
        setLastResponse('Push-to-talk imewashwa. Ongea sasa, sitahitaji jina la Nurath kwenye amri hii.');
      }

      appendLog({
        kind: 'status',
        source: config.source,
        note: config.mode === 'handsfree' ? 'Handsfree listening started.' : 'Push-to-talk session started.',
      });
    };

    recognition.onresult = (event: any) => {
      if (processingRef.current || isSpeakingRef.current) return;

      let finalTranscript = '';
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript.trim()) {
        setCurrentTranscript(interimTranscript.trim());
        setVoiceStatus('hearing');
      }

      if (!finalTranscript.trim()) return;

      const spokenText = finalTranscript.trim();
      const wakeDetection = detectWakePhrase(spokenText);
      setWakeDebug(wakeDetection);
      setCurrentTranscript(spokenText);
      setLastCommandAt(Date.now());
      appendLog({
        kind: 'wake',
        source: config.source,
        transcript: spokenText,
        wakeTriggered: wakeDetection.triggered,
        note: wakeDetection.triggered
          ? `Wake phrase detected as “${wakeDetection.matchedAlias}”.`
          : 'Speech detected without wake phrase.',
      });

      if (config.mode === 'push-to-talk') {
        void processVoiceCommand(spokenText, config.source);
        return;
      }

      if (assistantModeRef.current !== 'awake') {
        if (wakeDetection.triggered) {
          const followUpCommand = stripWakeWord(spokenText);
          updateAssistantMode('awake');
          setLastResponse('Naam, nipo.');

          if (followUpCommand) {
            setCurrentTranscript(followUpCommand);
            void processVoiceCommand(followUpCommand, config.source);
          } else {
            void speakResponse('Naam?');
          }
        } else {
          setVoiceStatus('listening');
          setLastResponse('Nimekusikia, lakini niite “Nurath” kwanza ndiyo nijibu.');
        }
        return;
      }

      if (SLEEP_PATTERNS.some((pattern) => pattern.test(wakeDetection.normalizedText))) {
        const sleepReply = 'Sawa, nimelala. Ukiita Nurath nitarudi.';
        updateAssistantMode('sleeping');
        setVoiceStatus('listening');
        setLastResponse(sleepReply);
        rememberConversation(spokenText, sleepReply);
        appendLog({ kind: 'status', source: config.source, transcript: spokenText, response: sleepReply, note: 'Wake listener set back to sleeping.' });
        void speakResponse(sleepReply);
        return;
      }

      const cleanedText = stripWakeWord(spokenText) || spokenText;
      setCurrentTranscript(cleanedText);
      setLastResponse(`Nimekusikia: ${cleanedText}`);
      void processVoiceCommand(cleanedText, config.source);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldRestartRef.current = false;
        setIsListening(false);
        updateAssistantMode('disabled');
        handleMicAccessError({ name: 'NotAllowedError' }, config.requireGesture ? 'gesture' : 'auto', config.source);
        return;
      }

      if (event.error === 'aborted') {
        return;
      }

      if (event.error === 'no-speech') {
        setVoiceStatus('listening');
        appendLog({ kind: 'status', source: config.source, note: 'No speech detected in this listening cycle.' });
        return;
      }

      setVoiceStatus('error');
      const message = `Nurath alipata hitilafu ya kusikia: ${event.error}.`;
      setMicError(message);
      setLastResponse(message);
      appendLog({ kind: 'error', source: config.source, note: message });

      if (config.mode === 'handsfree' && shouldRestartRef.current && !processingRef.current) {
        window.clearTimeout(restartTimeoutRef.current ?? undefined);
        restartTimeoutRef.current = window.setTimeout(() => {
          if (shouldRestartRef.current && !processingRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch {
              // ignore restart errors
            }
          }
        }, 700);
      }
    };

    recognition.onend = () => {
      if (config.mode === 'push-to-talk') {
        setIsListening(false);
        if (!processingRef.current && !isSpeakingRef.current) {
          setVoiceStatus(micPermissionState === 'granted' ? 'idle' : 'permission');
        }
        return;
      }

      if (!shouldRestartRef.current) {
        setIsListening(false);
        if (assistantModeRef.current !== 'disabled') {
          updateAssistantMode('disabled');
        }
        setVoiceStatus(micPermissionState === 'granted' ? 'idle' : 'permission');
        return;
      }

      if (!processingRef.current && !isSpeakingRef.current) {
        window.clearTimeout(restartTimeoutRef.current ?? undefined);
        restartTimeoutRef.current = window.setTimeout(() => {
          if (shouldRestartRef.current && !processingRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch {
              // ignore restart errors
            }
          }
        }, 350);
      }
    };

    const initializeRecognition = async () => {
      const granted = await ensureMicrophonePermission(config.requireGesture ? 'gesture' : 'auto', config.source);
      if (!granted) return;

      shouldRestartRef.current = config.mode === 'handsfree';
      if (config.mode === 'handsfree' && config.persist !== false) {
        persistHandsfreePreference(true);
      }

      try {
        recognition.start();
      } catch (error) {
        handleMicAccessError(error, config.requireGesture ? 'gesture' : 'auto', config.source);
      }
    };

    void initializeRecognition();
  }, [
    appendLog,
    ensureMicrophonePermission,
    handleMicAccessError,
    micPermissionState,
    persistHandsfreePreference,
    processVoiceCommand,
    rememberConversation,
    speakResponse,
    speechRecognitionSupported,
    toast,
    updateAssistantMode,
  ]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    persistHandsfreePreference(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    window.clearTimeout(restartTimeoutRef.current ?? undefined);
    setIsListening(false);
    updateAssistantMode('disabled');
    setVoiceStatus(micPermissionState === 'granted' ? 'idle' : 'permission');
    setCurrentTranscript('');
    setLastResponse('Nurath amelala. Ukiita tena baada ya kuruhusu maikrofoni atawaka bila kubonyeza.');
    setMicError(null);
    window.speechSynthesis?.cancel();
    stopAudioMonitoring();
    appendLog({ kind: 'status', source: 'system', note: 'Listening stopped manually.' });
  }, [appendLog, micPermissionState, persistHandsfreePreference, stopAudioMonitoring, updateAssistantMode]);

  const enableHandsfreeMode = useCallback(() => {
    startRecognitionSession({
      mode: 'handsfree',
      source: 'permission-wizard',
      persist: true,
      requireGesture: true,
    });
  }, [startRecognitionSession]);

  const startPushToTalkFallback = useCallback(() => {
    if (isListening && shouldRestartRef.current) {
      updateAssistantMode('awake');
      setLastResponse('Ongea sasa. Nimelazimisha Nurath awe macho kwa amri hii.');
      appendLog({ kind: 'status', source: 'push-to-talk', note: 'Push-to-talk used to wake active handsfree session.' });
      return;
    }

    shouldRestartRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    startRecognitionSession({
      mode: 'push-to-talk',
      source: 'push-to-talk',
      persist: false,
      requireGesture: true,
    });
  }, [appendLog, isListening, startRecognitionSession, updateAssistantMode]);

  useEffect(() => {
    if (!user || autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;

    let optedOut = false;
    try {
      optedOut = window.localStorage.getItem(NURATH_AUTO_LISTEN_KEY) === 'false';
    } catch {
      // ignore
    }

    if (!optedOut) {
      startRecognitionSession({
        mode: 'handsfree',
        source: 'system',
        persist: false,
        requireGesture: false,
      });
    }
  }, [startRecognitionSession, user]);

  useEffect(() => {
    if (!navigator.permissions?.query) return;

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const syncPermission = async () => {
      try {
        permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (!mounted) return;

        if (permissionStatus.state === 'granted') setMicPermissionState('granted');
        else if (permissionStatus.state === 'denied') setMicPermissionState('denied');
        else setMicPermissionState('needs-gesture');

        permissionStatus.onchange = () => {
          if (!mounted || !permissionStatus) return;
          if (permissionStatus.state === 'granted') setMicPermissionState('granted');
          else if (permissionStatus.state === 'denied') setMicPermissionState('denied');
          else setMicPermissionState('needs-gesture');
        };
      } catch {
        // ignore query failures
      }
    };

    void syncPermission();

    return () => {
      mounted = false;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      window.clearTimeout(restartTimeoutRef.current ?? undefined);
      window.speechSynthesis?.cancel();
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  const getTotalAmount = useCallback(() => currentSale.reduce((sum, item) => sum + item.total_price, 0), [currentSale]);

  const statusMeta = useMemo(() => {
    switch (voiceStatus) {
      case 'permission':
        return { label: 'Waiting for mic', detail: 'Ruhusu maikrofoni mara moja tu.', icon: ShieldAlert };
      case 'listening':
        return {
          label: assistantMode === 'awake' ? 'Listening now' : 'Wake-word listening',
          detail: assistantMode === 'awake' ? 'Nurath yuko macho na anasubiri amri.' : 'Nurath anasikiliza jina lake tu.',
          icon: Radio,
        };
      case 'hearing':
        return { label: 'Hearing you', detail: 'Sauti imeingia na transcript inaendelea.', icon: Ear };
      case 'processing':
        return { label: 'Processing', detail: 'Nurath anatafsiri amri yako sasa.', icon: Loader2 };
      case 'speaking':
        return { label: 'Speaking', detail: 'Nurath anatoa jibu sasa.', icon: MessageSquareText };
      case 'error':
        return { label: 'Needs attention', detail: micError || 'Kuna tatizo la maikrofoni au kusikia.', icon: ShieldAlert };
      default:
        return { label: 'Idle', detail: 'Nurath hayupo kwenye kusikiliza kwa sasa.', icon: MicOff };
    }
  }, [assistantMode, micError, voiceStatus]);

  const StatusIcon = statusMeta.icon;
  const latestLog = nurathLogs[0] ?? null;

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        <Card className="rounded-2xl border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Nurath Voice POS</CardTitle>
                <CardDescription>
                  Sasa unaweza kuona kila hatua ya kusikia, wake phrase, majibu, na latency ya backend bila kubahatisha.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setShowTestMode((prev) => !prev)}
              >
                <Wrench className="h-4 w-4" />
                {showTestMode ? 'Funga test mode' : 'Test mode'}
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Last command</p>
                <p className="mt-1 text-sm font-medium text-foreground">{lastCommand || 'Bado hakuna'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatLogTime(lastCommandAt)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">API latency</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {lastApiLatency !== null ? `${lastApiLatency} ms` : 'Local / no API'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{latestLog ? formatLogTime(latestLog.timestamp) : '—'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Mic signal</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-150" style={{ width: `${Math.max(audioLevel * 100, isReceivingAudio ? 8 : 0)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isReceivingAudio ? 'Nurath anapokea sauti kutoka kwenye maikrofoni.' : 'Bado hakuna signal ya sauti.'}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <button
                type="button"
                onClick={isListening ? stopListening : enableHandsfreeMode}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping" />
                    <span className="absolute inset-[-8px] rounded-full border-2 border-primary/20 animate-pulse" />
                  </>
                )}
                {isListening ? <Mic className="relative z-10 h-10 w-10" /> : <MicOff className="h-10 w-10" />}
              </button>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    <StatusIcon className={`mr-1 h-3.5 w-3.5 ${voiceStatus === 'processing' ? 'animate-spin' : ''}`} />
                    {statusMeta.label}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {assistantMode === 'awake' ? 'Nurath awake' : assistantMode === 'sleeping' ? 'Wake word only' : 'Handsfree off'}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {micPermissionState === 'granted'
                      ? 'Mic ready'
                      : micPermissionState === 'needs-gesture'
                        ? 'Need one tap'
                        : micPermissionState === 'denied'
                          ? 'Mic blocked'
                          : micPermissionState === 'unsupported'
                            ? 'Unsupported'
                            : 'Checking mic'}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{statusMeta.detail}</p>
                {currentTranscript && (
                  <p className="text-xs italic text-muted-foreground">"{currentTranscript}"</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Activity className="h-4 w-4 text-primary" />
                  Live status
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{lastResponse || 'Nurath atasema au kuandika jibu lake hapa mara tu anapolipata.'}</p>
                {micError && <p className="mt-2 text-xs text-destructive">{micError}</p>}
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {isReceivingAudio ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                  Mic readiness
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isReceivingAudio
                    ? 'Sasa unaweza kuliita jina la Nurath na atasikia bila kubonyeza tena.'
                    : 'Kama bado hujatoa ruhusa ya maikrofoni, tumia kitufe cha ruhusa hapa chini mara moja.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" className="rounded-full" onClick={enableHandsfreeMode}>
                <Mic className="h-4 w-4" />
                Ruhusu na anza handsfree
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-full" onClick={startPushToTalkFallback}>
                    <Radio className="h-4 w-4" />
                    Push-to-talk fallback
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Tumia hii kama auto-listen imegoma; bonyeza mara moja, ongea amri moja kwa moja, Nurath atajibu.
                </TooltipContent>
              </Tooltip>

              {isListening && (
                <Button type="button" variant="ghost" className="rounded-full" onClick={stopListening}>
                  <MicOff className="h-4 w-4" />
                  Simamisha kusikiliza
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {(micPermissionState === 'needs-gesture' || micPermissionState === 'denied' || micPermissionState === 'unsupported') && (
          <Card className="rounded-2xl border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">One-tap mic permission wizard</CardTitle>
              <CardDescription>
                Gusa mara moja tu, ruhusu maikrofoni, kisha Nurath atasubiri jina lake peke yake bila kubonyeza tena.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="space-y-2 pl-5">
                <li>Bonyeza <span className="font-medium text-foreground">Ruhusu na anza handsfree</span>.</li>
                <li>Chagua <span className="font-medium text-foreground">Allow</span> kwenye popup ya kivinjari.</li>
                <li>Ukiona signal ya mic na status ya listening, sema tu <span className="font-medium text-foreground">“Nurath”</span>.</li>
              </ol>
              {micPermissionState === 'denied' && (
                <p className="text-xs text-destructive">
                  Maikrofoni ime-blockiwa. Fungua browser settings, iruhusu, halafu bonyeza kitufe tena.
                </p>
              )}
              {micPermissionState === 'unsupported' && (
                <p className="text-xs text-destructive">
                  Browser hii haina msaada wa kutosha kwa voice wake-up. Tumia browser yenye speech recognition.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {showTestMode && (
          <Card className="rounded-2xl border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nurath test mode</CardTitle>
              <CardDescription>
                Hapa utaona kile ambacho Nurath alisikia kama wake phrase, kilichonormalize, na kama kime-trigger au la.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Detected phrase</p>
                <p className="mt-1 text-sm font-medium text-foreground">{wakeDebug.heardText || 'Bado hakuna phrase'}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatLogTime(wakeDebug.timestamp)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Wake trigger result</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {wakeDebug.triggered ? `Triggered (${wakeDebug.matchedAlias})` : 'Haijatrigger'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground break-words">{wakeDebug.normalizedText || '—'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nurath logs</CardTitle>
            <CardDescription>
              Panel ndogo ya kuona last command, timestamp, transcription result, na API latency ya kila hatua.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nurathLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                Bado hakuna log. Anzisha handsfree au push-to-talk, kisha sema kitu uone flow nzima.
              </div>
            ) : (
              nurathLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-border/70 bg-background/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5">{log.kind}</Badge>
                      <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">{log.source}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatLogTime(log.timestamp)}</span>
                  </div>
                  {log.command && <p className="mt-2 text-sm font-medium text-foreground">Command: {log.command}</p>}
                  {log.transcript && <p className="mt-1 text-xs text-muted-foreground">Transcript: {log.transcript}</p>}
                  {typeof log.wakeTriggered === 'boolean' && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Wake: {log.wakeTriggered ? 'triggered' : 'not triggered'}
                    </p>
                  )}
                  {log.response && <p className="mt-1 text-sm text-foreground">Reply: {log.response}</p>}
                  {log.apiLatencyMs !== undefined && log.apiLatencyMs !== null && (
                    <p className="mt-1 text-xs text-muted-foreground">API latency: {log.apiLatencyMs} ms</p>
                  )}
                  {log.note && <p className="mt-1 text-xs text-muted-foreground">{log.note}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {currentSale.length > 0 && (
          <Card className="rounded-2xl border-border/70 bg-card/95 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShoppingCart className="h-4 w-4" /> Mauzo ya Sasa
                </h3>
                <Badge variant="secondary">{currentSale.length} bidhaa</Badge>
              </div>

              {currentSale.map((item, index) => (
                <div key={`${item.product.id}-${index}`} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × TZS {item.unit_price.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-bold">TZS {item.total_price.toLocaleString()}</p>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-bold">Jumla:</span>
                <span className="text-lg font-bold text-primary">TZS {getTotalAmount().toLocaleString()}</span>
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={() => void completeSale()} className="flex-1 rounded-full" size="sm">
                  {processing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                  Kamilisha
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  size="sm"
                  onClick={() => {
                    setCurrentSale([]);
                    setLastResponse('Sawa, nimefuta mauzo ya sasa.');
                    appendLog({ kind: 'status', source: 'system', note: 'Current sale cleared from the UI.' });
                    void speakResponse('Sawa, nimefuta mauzo ya sasa.');
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Futa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground">
          Ukiona transcript inaandikwa lakini hakuna jibu, angalia test mode na logs panel hapo juu kujua kama wake phrase haikushika au backend haikurudisha jibu.
        </div>
      </div>
    </TooltipProvider>
  );
};
