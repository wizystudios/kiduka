import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VoiceCommandProcessor } from '@/utils/voiceCommandProcessor';
import { Mic, MicOff, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';

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
  const currentSaleRef = useRef<SaleItem[]>([]);

  // Keep ref in sync
  useEffect(() => {
    currentSaleRef.current = currentSale;
  }, [currentSale]);

  useEffect(() => {
    if (products.length > 0) {
      commandProcessorRef.current = new VoiceCommandProcessor(products, currentSaleRef.current);
    }
  }, [products, currentSale]);

  useEffect(() => {
    fetchProducts();
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      window.speechSynthesis.cancel();
    };
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('products').select('*').eq('owner_id', user.id);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const speakResponse = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      
      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sw-KE';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      
      // Try to find a Swahili voice
      const voices = window.speechSynthesis.getVoices();
      const swVoice = voices.find(v => v.lang.startsWith('sw')) || 
                      voices.find(v => v.lang.startsWith('en'));
      if (swVoice) utterance.voice = swVoice;
      
      utterance.onend = () => {
        isSpeakingRef.current = false;
        resolve();
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const processVoiceCommand = useCallback(async (command: string) => {
    if (!user || !commandProcessorRef.current) return;
    
    setProcessing(true);
    
    // Pause recognition while processing
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop(); } catch {}
    }

    try {
      const result = await commandProcessorRef.current.processCommand(command, user.id);
      
      // Handle sale commands
      if (result.success && result.data?.product && result.data?.quantity) {
        const { product, quantity } = result.data;
        setCurrentSale(prev => {
          const existing = prev.find(item => item.product.id === product.id);
          if (existing) {
            return prev.map(item => 
              item.product.id === product.id 
                ? { ...item, quantity: item.quantity + quantity, total_price: (item.quantity + quantity) * item.unit_price }
                : item
            );
          }
          return [...prev, { product, quantity, unit_price: product.price, total_price: quantity * product.price }];
        });
      }

      // Save command
      try {
        await supabase.from('voice_commands').insert([{
          user_id: user.id,
          command_text: command,
          command_type: 'voice_command',
          result: result as any
        }]);
      } catch {}

      setLastResponse(result.message);
      
      // Speak response, then resume listening
      await speakResponse(result.message);
      
    } catch (error) {
      const errMsg = 'Samahani, kuna hitilafu. Jaribu tena.';
      setLastResponse(errMsg);
      await speakResponse(errMsg);
    } finally {
      setProcessing(false);
      // Resume listening after speaking
      if (shouldRestartRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    }
  }, [user, speakResponse, isListening]);

  const startContinuousListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: 'Hakuna Msaada wa Sauti', description: 'Kivinjari hiki hakitumii utambuzi wa sauti', variant: 'destructive' });
      return;
    }

    // Clean up old instance
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
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
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
        processVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        toast({ title: 'Ruhusa ya Maikrofoni', description: 'Tafadhali ruhusu matumizi ya maikrofoni', variant: 'destructive' });
        shouldRestartRef.current = false;
        setIsListening(false);
        return;
      }
      // For other errors, auto-restart
      if (shouldRestartRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening and not currently speaking
      if (shouldRestartRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 300);
      } else if (!shouldRestartRef.current) {
        setIsListening(false);
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
  }, [toast, processVoiceCommand]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setCurrentTranscript('');
    window.speechSynthesis.cancel();
  }, []);

  // Auto-start listening on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && !isListening) {
        startContinuousListening();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const completeSale = async () => {
    if (currentSale.length === 0) return;
    try {
      const totalAmount = currentSale.reduce((sum, item) => sum + item.total_price, 0);
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({ owner_id: user?.id, total_amount: totalAmount, payment_method: 'cash' })
        .select().single();

      if (saleError) throw saleError;

      for (const item of currentSale) {
        await supabase.from('sales_items').insert({
          sale_id: sale.id, product_id: item.product.id,
          quantity: item.quantity, unit_price: item.unit_price, subtotal: item.total_price
        });
        await supabase.from('products').update({
          stock_quantity: item.product.stock_quantity - item.quantity
        }).eq('id', item.product.id);
      }

      setCurrentSale([]);
      fetchProducts();
      const msg = `Mauzo yamekamilika. Jumla shilingi ${totalAmount.toLocaleString()}`;
      setLastResponse(msg);
      speakResponse(msg);
      toast({ title: 'Mauzo Yamekamilika', description: `Jumla: TZS ${totalAmount.toLocaleString()}` });
    } catch (error) {
      toast({ title: 'Hitilafu', description: 'Imeshindwa kukamilisha mauzo', variant: 'destructive' });
    }
  };

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
            {processing ? 'Inachakata...' : isListening ? 'Nasikiliza... sema amri yako' : 'Bonyeza kuanza'}
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
              <Button onClick={completeSale} className="flex-1 rounded-full" size="sm">
                <CheckCircle className="h-4 w-4 mr-1" /> Kamilisha
              </Button>
              <Button onClick={() => { setCurrentSale([]); speakResponse('Mauzo yamefutwa'); }} variant="outline" className="rounded-full" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Futa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick commands hint */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Mifano: "Uza mkate miwili" • "Hesabu maziva" • "Ripoti ya leo"</p>
      </div>
    </div>
  );
};
