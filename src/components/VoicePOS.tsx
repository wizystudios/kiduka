import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VoiceCommandProcessor } from '@/utils/voiceCommandProcessor';
import { Mic, MicOff, Volume2, VolumeX,
  ShoppingCart,
  Package,
  Search,
  BarChart
} from 'lucide-react';

interface VoiceCommand {
  id: string;
  command_text: string;
  language: string;
  command_type: string;
  processed_result: any;
  is_successful: boolean;
  execution_time_ms: number;
  created_at: string;
}

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

// Declare the Web Speech API types locally
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
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const commandProcessorRef = useRef<VoiceCommandProcessor | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCommandHistory();
    initializeSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [user]);

  useEffect(() => {
    // Update command processor when products or current sale changes
    if (products.length > 0) {
      commandProcessorRef.current = new VoiceCommandProcessor(products, currentSale);
    }
  }, [products, currentSale]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCommandHistory = async () => {
    if (!user) return;

    try {
      // Use localStorage to simulate voice commands history
      const storedCommands = localStorage.getItem(`voice_commands_${user.id}`);
      if (storedCommands) {
        setCommandHistory(JSON.parse(storedCommands));
      }
    } catch (error) {
      console.error('Error fetching command history:', error);
    }
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: 'Hakuna Msaada wa Sauti',
        description: 'Kivinjari hiki hakitumii utambuzi wa sauti',
        variant: 'destructive'
      });
      setIsEnabled(false);
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionConstructor();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'sw-TZ'; // Swahili Tanzania

    recognition.onstart = () => {
      setIsListening(true);
      setCurrentCommand('Nazisikiliza...');
    };

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setCurrentCommand(command);
      processVoiceCommand(command);
    };

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      setCurrentCommand('');
      toast({
        title: 'Hitilafu ya Sauti',
        description: 'Imeshindwa kutambua sauti yako',
        variant: 'destructive'
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (recognitionRef.current && isEnabled) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setCurrentCommand('');
    }
  };

  const processVoiceCommand = async (command: string) => {
    if (!user || !commandProcessorRef.current) return;

    const startTime = Date.now();
    setLoading(true);

    try {
      const result = await commandProcessorRef.current.processCommand(command, user.id);
      
      const executionTime = Date.now() - startTime;
      
      // Handle successful sale commands
      if (result.success && result.data?.product && result.data?.quantity) {
        const { product, quantity } = result.data;
        
        // Add to current sale
        const existingItem = currentSale.find(item => item.product.id === product.id);
        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.total_price = existingItem.quantity * existingItem.unit_price;
          setCurrentSale([...currentSale]);
        } else {
          const newItem: SaleItem = {
            product,
            quantity,
            unit_price: product.price,
            total_price: quantity * product.price
          };
          setCurrentSale([...currentSale, newItem]);
        }
      }

      // Save command to database
      await saveVoiceCommand(command, 'voice_command', result, result.success, executionTime);

      // Provide voice feedback
      speakResponse(result.message);

      fetchCommandHistory();
    } catch (error) {
      console.error('Error processing voice command:', error);
      speakResponse('Samahani, imeshindwa kuchakata amri');
    } finally {
      setLoading(false);
    }
  };

  const saveVoiceCommand = async (
    commandText: string,
    commandType: string,
    result: any,
    isSuccessful: boolean,
    executionTime: number
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('voice_commands')
        .insert({
          user_id: user.id,
          command_text: commandText,
          command_type: commandType,
          result: result
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving voice command:', error);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sw-TZ';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const completeSale = async () => {
    if (currentSale.length === 0) return;

    try {
      const totalAmount = currentSale.reduce((sum, item) => sum + item.total_price, 0);
      
      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          owner_id: user?.id,
          total_amount: totalAmount,
          payment_method: 'cash'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      for (const item of currentSale) {
        await supabase
          .from('sales_items')
          .insert({
            sale_id: sale.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.total_price
          });

        // Update stock
        await supabase
          .from('products')
          .update({
            stock_quantity: item.product.stock_quantity - item.quantity
          })
          .eq('id', item.product.id);
      }

      setCurrentSale([]);
      fetchProducts();
      
      toast({
        title: 'Mauzo Yamekamilika',
        description: `Jumla: TZS ${totalAmount.toLocaleString()}`,
      });

      speakResponse(`Mauzo yamekamilika. Jumla shilingi ${totalAmount.toLocaleString()}`);
    } catch (error) {
      console.error('Error completing sale:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kukamilisha mauzo',
        variant: 'destructive'
      });
    }
  };

  const clearSale = () => {
    setCurrentSale([]);
    speakResponse('Mauzo yamefutwa');
  };

  const getTotalAmount = () => {
    return currentSale.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getCommandTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'search': return <Search className="h-4 w-4" />;
      case 'report': return <BarChart className="h-4 w-4" />;
      default: return <Mic className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Voice Control Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mauzo ya Sauti (Voice POS)</span>
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? 'Inapatikana' : 'Haijumuishwa'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={!isEnabled || loading}
              size="lg"
              className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            >
              {isListening ? <MicOff className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
              {isListening ? 'Acha Kusikiliza' : 'Anza Kusikiliza'}
            </Button>
            
            <Button
              onClick={() => setIsEnabled(!isEnabled)}
              variant="outline"
            >
              {isEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {isEnabled ? 'Zima Sauti' : 'Washa Sauti'}
            </Button>
          </div>

          {currentCommand && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Amri:</strong> {currentCommand}
              </p>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>Mifano ya amri:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>"Uza mkate miwili" - Kuuza mkate 2</li>
              <li>"Hesabu maziva" - Kuangalia stock ya maziva</li>
              <li>"Tafuta unga" - Kutafuta bidhaa ya unga</li>
              <li>"Ripoti ya leo" - Kupata ripoti ya mauzo ya leo</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Current Sale */}
      {currentSale.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mauzo ya Sasa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSale.map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-600">{item.quantity} × TZS {item.unit_price.toLocaleString()}</p>
                </div>
                <p className="font-bold">TZS {item.total_price.toLocaleString()}</p>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-lg font-bold">Jumla:</span>
              <span className="text-xl font-bold text-green-600">TZS {getTotalAmount().toLocaleString()}</span>
            </div>

            <div className="flex space-x-2">
              <Button onClick={completeSale} className="flex-1">
                Kamilisha Mauzo
              </Button>
              <Button onClick={clearSale} variant="outline">
                Futa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command History */}
      <Card>
        <CardHeader>
          <CardTitle>Historia ya Amri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {commandHistory.slice(0, 10).map((cmd) => (
              <div key={cmd.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  {getCommandTypeIcon(cmd.command_type)}
                  <span className="text-sm">{cmd.command_text}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={cmd.is_successful ? 'default' : 'destructive'}>
                    {cmd.is_successful ? 'Imefanikiwa' : 'Imeshindwa'}
                  </Badge>
                  <span className="text-xs text-gray-500">{cmd.execution_time_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
