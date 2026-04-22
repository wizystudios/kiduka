import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VoiceCommandProcessor } from '@/utils/voiceCommandProcessor';
import { speakAssistantText } from '@/utils/voiceAssistantSpeech';
import { Mic, MicOff, ShoppingCart, Trash2, CheckCircle, Loader2 } from 'lucide-react';

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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const NURATH_AUTO_LISTEN_KEY = 'kiduka_nurath_handsfree_enabled';
const WAKE_WORD_PATTERNS = [/\bnurath\b/i, /\bnurat\b/i, /\bnura\b/i];
const SLEEP_PATTERNS = [/\bzima\b/i, /\blala\b/i, /\bnyamaza\b/i, /\bturn ?off\b/i, /\bstop listening\b/i];

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
    .replace(/\bnura\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

export const VoicePOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [assistantMode, setAssistantMode] = useState<'disabled' | 'sleeping' | 'awake'>('disabled');
  const [micPermissionState, setMicPermissionState] = useState<'unknown' | 'granted' | 'needs-gesture' | 'denied' | 'unsupported'>('unknown');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const commandProcessorRef = useRef<VoiceCommandProcessor | null>(null);
  const assistantModeRef = useRef<'disabled' | 'sleeping' | 'awake'>('disabled');
  const shouldRestartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const processingRef = useRef(false);
  const currentSaleRef = useRef<SaleItem[]>([]);
  const conversationHistoryRef = useRef<VoiceAssistantMessage[]>([]);
  const restartTimeoutRef = useRef<number | null>(null);
  const autoStartAttemptedRef = useRef(false);

  const updateAssistantMode = useCallback((mode: 'disabled' | 'sleeping' | 'awake') => {
    assistantModeRef.current = mode;
    setAssistantMode(mode);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    currentSaleRef.current = currentSale;
  }, [currentSale]);

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
    fetchProducts();
  }, [fetchProducts]);

  const persistHandsfreePreference = useCallback((enabled: boolean) => {
    try {
      window.localStorage.setItem(NURATH_AUTO_LISTEN_KEY, enabled ? 'true' : 'false');
    } catch {
      // ignore storage write failures
    }
  }, []);

  const speakResponse = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      isSpeakingRef.current = true;

      speakAssistantText(text, { preferredVoiceGender: 'female' })
        .catch(() => undefined)
        .finally(() => {
        isSpeakingRef.current = false;
        resolve();
        });
    });
  }, []);

  const ensureMicrophonePermission = useCallback(async (mode: 'auto' | 'gesture' = 'gesture') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermissionState('unsupported');
      return false;
    }

    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });

        if (status.state === 'granted') {
          setMicPermissionState('granted');
          return true;
        }

        if (status.state === 'denied') {
          setMicPermissionState('denied');
          setLastResponse('Maikrofoni imezuiwa kwenye kivinjari. Iruhusu kisha urudi tena.');
          return false;
        }

        if (mode === 'auto') {
          setMicPermissionState('needs-gesture');
          setLastResponse('Gusa maikrofoni mara moja kumpa Nurath ruhusa; baada ya hapo atawaka kwa jina lake tu.');
          return false;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionState('granted');
      return true;
    } catch (error) {
      setMicPermissionState(mode === 'auto' ? 'needs-gesture' : 'denied');
      toast({
        title: 'Ruhusa ya Maikrofoni',
        description: mode === 'auto'
          ? 'Gusa maikrofoni mara moja kumpa Nurath ruhusa ya kusikiliza.'
          : 'Ruhusu maikrofoni ili Voice POS ikusikie moja kwa moja.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const rememberConversation = useCallback((command: string, reply: string) => {
    const nextHistory: VoiceAssistantMessage[] = [
      ...conversationHistoryRef.current,
      { role: 'user' as const, content: command },
      { role: 'assistant' as const, content: reply },
    ].slice(-12);

    conversationHistoryRef.current = nextHistory;
  }, []);

  const askVoiceAssistant = useCallback(async (command: string): Promise<VoiceAssistantFunctionResult | null> => {
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

  const completeSale = useCallback(async (announce = true): Promise<string> => {
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
    } catch (error) {
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
      setCurrentSale([]);
      return currentSaleRef.current.length > 0 ? 'Sawa, nimefuta mauzo ya sasa.' : 'Hakuna mauzo ya kufuta.';
    }

    if (action === 'complete_sale') {
      return completeSale(false);
    }

    return result.message;
  }, [completeSale]);

  const processVoiceCommand = useCallback(async (command: string) => {
    if (!user) return;

    const normalizedCommand = normalizeVoiceText(command);
    const cleanedCommand = stripWakeWord(command) || command;
    const processor = commandProcessorRef.current ?? new VoiceCommandProcessor(products, currentSaleRef.current);
    commandProcessorRef.current = processor;

    if (SLEEP_PATTERNS.some((pattern) => pattern.test(normalizedCommand))) {
      const sleepReply = 'Sawa, nimelala. Ukiita Nurath nitarudi.';
      updateAssistantMode('sleeping');
      setLastResponse(sleepReply);
      rememberConversation(command, sleepReply);
      await speakResponse(sleepReply);
      return;
    }

    processingRef.current = true;
    setProcessing(true);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    try {
        let result = await processor.processCommand(cleanedCommand, user.id);

      if (!result.success) {
        const aiResult = await askVoiceAssistant(cleanedCommand);

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
        }
      }

      const finalMessage = result.success ? await applyAssistantAction(result) : 'Samahani, sijaweza kukusaidia kwa ombi hilo kwa sasa.';

      try {
        await supabase.from('voice_commands').insert([{
          user_id: user.id,
          command_text: cleanedCommand,
          command_type: 'voice_command',
          result: { ...result, finalMessage } as any
        }]);
      } catch {}

      setLastResponse(finalMessage);
      rememberConversation(cleanedCommand, finalMessage);
      await speakResponse(finalMessage);
    } catch (error) {
      const errMsg = 'Samahani, kuna hitilafu. Jaribu tena.';
      setLastResponse(errMsg);
      rememberConversation(command, errMsg);
      await speakResponse(errMsg);
    } finally {
      processingRef.current = false;
      setProcessing(false);
      if (shouldRestartRef.current && recognitionRef.current) {
        window.clearTimeout(restartTimeoutRef.current ?? undefined);
        restartTimeoutRef.current = window.setTimeout(() => {
          if (shouldRestartRef.current && recognitionRef.current && !isSpeakingRef.current && !processingRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }, 500);
      }
    }
  }, [applyAssistantAction, askVoiceAssistant, products, rememberConversation, speakResponse, updateAssistantMode, user]);

  const startContinuousListening = useCallback((options?: { persist?: boolean; requireGesture?: boolean }) => {
    const initializeRecognition = async () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setMicPermissionState('unsupported');
        toast({ title: 'Hakuna Msaada wa Sauti', description: 'Kivinjari hiki hakitumii utambuzi wa sauti', variant: 'destructive' });
        return;
      }

      const granted = await ensureMicrophonePermission(options?.requireGesture ? 'gesture' : 'auto');
      if (!granted) return;

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'sw-TZ';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setMicPermissionState('granted');
        setIsListening(true);
        updateAssistantMode(assistantModeRef.current === 'awake' ? 'awake' : 'sleeping');
        setLastResponse((current) => current || 'Nurath anasikiliza. Sema “Nurath” kumwamsha.');
      };

      recognition.onresult = (event: any) => {
        if (processingRef.current || isSpeakingRef.current) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript) {
          setCurrentTranscript(interimTranscript.trim());
        }

        if (finalTranscript.trim()) {
          const spokenText = finalTranscript.trim();
          const normalizedFinal = normalizeVoiceText(spokenText);

          if (assistantModeRef.current !== 'awake') {
            if (WAKE_WORD_PATTERNS.some((pattern) => pattern.test(normalizedFinal))) {
              const wakeMessage = 'Naam, mimi ni Nurath. Niko tayari.';
              const followUpCommand = stripWakeWord(spokenText);
               updateAssistantMode('awake');

              if (followUpCommand) {
                setCurrentTranscript(followUpCommand);
                setLastResponse(`Nimekusikia: ${followUpCommand}`);
                void processVoiceCommand(followUpCommand);
              } else {
                setCurrentTranscript(spokenText);
                setLastResponse(wakeMessage);
                void speakResponse('Naam?');
              }
            }
            return;
          }

          if (SLEEP_PATTERNS.some((pattern) => pattern.test(normalizedFinal))) {
            const sleepReply = 'Sawa, nimelala. Ukiita Nurath nitarudi.';
            updateAssistantMode('sleeping');
            setCurrentTranscript(spokenText);
            setLastResponse(sleepReply);
            rememberConversation(spokenText, sleepReply);
            void speakResponse(sleepReply);
            return;
          }

          const cleanedText = stripWakeWord(spokenText) || spokenText;
          setCurrentTranscript(cleanedText);
          setLastResponse(`Nimekusikia: ${cleanedText}`);
          void processVoiceCommand(cleanedText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermissionState('denied');
          toast({ title: 'Ruhusa ya Maikrofoni', description: 'Ruhusu maikrofoni kwenye kivinjari ili uongee moja kwa moja.', variant: 'destructive' });
          shouldRestartRef.current = false;
          setIsListening(false);
          updateAssistantMode('disabled');
          return;
        }

        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }

        if (shouldRestartRef.current && !processingRef.current) {
          window.clearTimeout(restartTimeoutRef.current ?? undefined);
          restartTimeoutRef.current = window.setTimeout(() => {
            if (shouldRestartRef.current && !processingRef.current && !isSpeakingRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 700);
        }
      };

      recognition.onend = () => {
        if (!shouldRestartRef.current) {
          setIsListening(false);
          if (assistantModeRef.current !== 'disabled') {
            updateAssistantMode('disabled');
          }
          return;
        }

        if (!processingRef.current && !isSpeakingRef.current) {
          window.clearTimeout(restartTimeoutRef.current ?? undefined);
          restartTimeoutRef.current = window.setTimeout(() => {
            if (shouldRestartRef.current && !processingRef.current && !isSpeakingRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      shouldRestartRef.current = true;
      if (options?.persist !== false) {
        persistHandsfreePreference(true);
      }

      try {
        recognition.start();
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          toast({ title: 'Ruhusa ya Maikrofoni', description: 'Ruhusu maikrofoni kwenye mipangilio ya kivinjari', variant: 'destructive' });
        }
      }
    };

    void initializeRecognition();
  }, [ensureMicrophonePermission, persistHandsfreePreference, processVoiceCommand, rememberConversation, speakResponse, toast, updateAssistantMode]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    persistHandsfreePreference(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    window.clearTimeout(restartTimeoutRef.current ?? undefined);
    setIsListening(false);
    updateAssistantMode('disabled');
    setCurrentTranscript('');
    setLastResponse('Nurath amelala. Ukihitaji tena, gusa maikrofoni au uruhusu kuendelea kusikiliza.');
    window.speechSynthesis.cancel();
  }, [persistHandsfreePreference, updateAssistantMode]);

  useEffect(() => {
    if (!user || autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;

    // Auto-start Nurath in passive (sleeping) mode by default — she only wakes on her name.
    // Users can disable by clicking the mic button.
    let optedOut = false;
    try {
      optedOut = window.localStorage.getItem(NURATH_AUTO_LISTEN_KEY) === 'false';
    } catch {
      // ignore
    }
    if (!optedOut) {
      startContinuousListening({ persist: false, requireGesture: false });
    }
  }, [startContinuousListening, user]);

  useEffect(() => {
    if (!user) return;

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      window.clearTimeout(restartTimeoutRef.current ?? undefined);
      window.speechSynthesis.cancel();
    };
  }, [user]);

  const getTotalAmount = () => currentSale.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Listening Status */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={isListening ? stopListening : () => startContinuousListening({ persist: true })}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-primary/20 animate-pulse" />
            </>
          )}
          {isListening ? <Mic className="h-10 w-10 relative z-10" /> : <MicOff className="h-10 w-10" />}
        </button>
        
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
              {processing
                ? 'Nurath anajibu sasa...'
                : isListening
                  ? assistantMode === 'awake'
                    ? 'Nurath yuko hewani. Ongea sasa.'
                    : 'Nurath anasikiliza kwa jina lake tu.'
                  : 'Bonyeza kuwasha Nurath.'}
          </p>
          {currentTranscript && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{currentTranscript}"</p>
          )}
        </div>

        {lastResponse && (
          <div className="w-full bg-accent/50 border border-border rounded-xl p-3">
            <p className="text-sm text-center text-foreground">{lastResponse}</p>
          </div>
        )}
      </div>

      {/* Current Sale */}
      {currentSale.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Mauzo ya Sasa
              </h3>
              <Badge variant="secondary">{currentSale.length} bidhaa</Badge>
            </div>
            
            {currentSale.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × TZS {item.unit_price.toLocaleString()}</p>
                </div>
                <p className="font-bold text-sm">TZS {item.total_price.toLocaleString()}</p>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-bold">Jumla:</span>
              <span className="text-lg font-bold text-primary">TZS {getTotalAmount().toLocaleString()}</span>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => void completeSale()} className="flex-1 rounded-full" size="sm">
                {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Kamilisha
              </Button>
              <Button onClick={() => { setCurrentSale([]); setLastResponse('Sawa, nimefuta mauzo ya sasa.'); void speakResponse('Sawa, nimefuta mauzo ya sasa.'); }} variant="outline" className="rounded-full" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Futa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Sema “Nurath” kumwamsha, kisha sema oda yako. Ukisema “turn off” au “zima”, atalala mwenyewe.</p>
      </div>
    </div>
  );
};
