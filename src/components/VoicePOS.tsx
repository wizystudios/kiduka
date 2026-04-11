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

export const VoicePOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const commandProcessorRef = useRef<VoiceCommandProcessor | null>(null);
  const shouldRestartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const processingRef = useRef(false);
  const currentSaleRef = useRef<SaleItem[]>([]);
  const conversationHistoryRef = useRef<VoiceAssistantMessage[]>([]);
  const restartTimeoutRef = useRef<number | null>(null);

  // Keep ref in sync
  useEffect(() => {
    currentSaleRef.current = currentSale;
  }, [currentSale]);

  useEffect(() => {
    if (products.length > 0) {
      commandProcessorRef.current = new VoiceCommandProcessor(products, currentSaleRef.current);
    }
  }, [products, currentSale]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('products').select('*').eq('owner_id', user.id);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const speakResponse = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      isSpeakingRef.current = true;

      speakAssistantText(text)
        .catch(() => undefined)
        .finally(() => {
        isSpeakingRef.current = false;
        resolve();
        });
    });
  }, []);

  const ensureMicrophonePermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      toast({
        title: 'Ruhusa ya Maikrofoni',
        description: 'Ruhusu maikrofoni ili Voice POS ikusikie moja kwa moja.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const rememberConversation = useCallback((command: string, reply: string) => {
    conversationHistoryRef.current = [
      ...conversationHistoryRef.current,
      { role: 'user', content: command },
      { role: 'assistant', content: reply },
    ].slice(-12);
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
      throw error;
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
    if (!user || !commandProcessorRef.current) return;

    processingRef.current = true;
    setProcessing(true);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    try {
      let result = await commandProcessorRef.current.processCommand(command, user.id);

      if (!result.success) {
        const aiResult = await askVoiceAssistant(command);

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
          command_text: command,
          command_type: 'voice_command',
          result: { ...result, finalMessage } as any
        }]);
      } catch {}

      setLastResponse(finalMessage);
      rememberConversation(command, finalMessage);
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
  }, [applyAssistantAction, askVoiceAssistant, products, rememberConversation, speakResponse, user]);

  const startContinuousListening = useCallback(() => {
    const initializeRecognition = async () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({ title: 'Hakuna Msaada wa Sauti', description: 'Kivinjari hiki hakitumii utambuzi wa sauti', variant: 'destructive' });
        return;
      }

      const granted = await ensureMicrophonePermission();
      if (!granted) return;

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'sw-TZ';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
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
          setCurrentTranscript(interimTranscript);
        }

        if (finalTranscript.trim()) {
          setCurrentTranscript(finalTranscript.trim());
          void processVoiceCommand(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast({ title: 'Ruhusa ya Maikrofoni', description: 'Ruhusu maikrofoni kwenye kivinjari ili uongee moja kwa moja.', variant: 'destructive' });
          shouldRestartRef.current = false;
          setIsListening(false);
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

      try {
        recognition.start();
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          toast({ title: 'Ruhusa ya Maikrofoni', description: 'Ruhusu maikrofoni kwenye mipangilio ya kivinjari', variant: 'destructive' });
        }
      }
    };

    void initializeRecognition();
  }, [ensureMicrophonePermission, processVoiceCommand, toast]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    window.clearTimeout(restartTimeoutRef.current ?? undefined);
    setIsListening(false);
    setCurrentTranscript('');
    window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!user) return;

    const timer = window.setTimeout(() => {
      if (!isListening && !processingRef.current) {
        startContinuousListening();
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      window.clearTimeout(restartTimeoutRef.current ?? undefined);
      window.speechSynthesis.cancel();
    };
  }, [isListening, startContinuousListening, user]);

  const getTotalAmount = () => currentSale.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Listening Status */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={isListening ? stopListening : startContinuousListening}
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
            {processing ? 'Ninakuchambulia ombi lako...' : isListening ? 'Ongea kawaida, nitakuelewa.' : 'Naandaa maikrofoni...'}
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
        <p className="text-xs text-muted-foreground">Ongea kawaida tu: “niambie bidhaa zilizokwisha”, “ongeza mkate mbili”, au “nipatie ripoti ya leo”.</p>
      </div>
    </div>
  );
};
