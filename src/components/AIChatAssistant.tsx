
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageCircle, 
  Mic, 
  MicOff, 
  Send, 
  Bot,
  User,
  Lightbulb,
  TrendingUp,
  Package,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  language: 'sw' | 'en';
}

interface AIChatAssistantProps {
  sessionType?: 'business_advisor' | 'pricing_help' | 'inventory_help' | 'general';
  language?: 'sw' | 'en';
}

export const AIChatAssistant = ({ 
  sessionType = 'business_advisor', 
  language = 'sw' 
}: AIChatAssistantProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    initializeSession();
  }, [user, sessionType]);

  const initializeSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_type: sessionType,
          language,
          messages: [],
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);

      // Add welcome message
      const welcomeMessages = {
        sw: {
          business_advisor: 'Karibu! Mimi ni mshauri wako wa kibiashara. Nitakusaidia kupata maamuzi mazuri kwa ajili ya biashara yako.',
          pricing_help: 'Hujambo! Nitakusaidia kupanga bei za bidhaa zako kwa njia bora.',
          inventory_help: 'Karibu! Natayari kukusaidia kusimamia stock yako vizuri.',
          general: 'Hujambo! Nitakusaidia na maswali yoyote kuhusu biashara yako.'
        },
        en: {
          business_advisor: 'Welcome! I\'m your business advisor. I\'ll help you make smart decisions for your business.',
          pricing_help: 'Hello! I\'ll help you optimize your product pricing.',
          inventory_help: 'Welcome! I\'m ready to help you manage your inventory efficiently.',
          general: 'Hello! I\'ll help you with any questions about your business.'
        }
      };

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: welcomeMessages[language][sessionType],
        timestamp: new Date(),
        language
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error initializing chat session:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      language
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual AI service)
      const aiResponse = await generateAIResponse(inputMessage, sessionType, language);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        language
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update session in database
      const updatedMessages = [...messages, userMessage, aiMessage];
      await supabase
        .from('ai_chat_sessions')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: language === 'sw' ? 'Hitilafu' : 'Error',
        description: language === 'sw' ? 'Imeshindwa kutuma ujumbe' : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (message: string, type: string, lang: string): Promise<string> => {
    // This is a simplified AI response generator
    // In production, you would integrate with OpenAI, Anthropic, or other AI services
    
    const responses = {
      sw: {
        business_advisor: [
          'Hii ni wazo nzuri! Je, umewahi kufikiria jinsi wateja wako wanavyotumia pesa zao?',
          'Kutokana na data yako ya mauzo, naona kuwa unaweza kuongeza faida kwa asilimia 15% ukibadilisha mikakati yako ya bei.',
          'Nashauri uongeze bidhaa zinazouzwa kila siku. Hii itakusaidia kupunguza hatari.',
          'Je, umewahi kufikiria kuanzisha mfumo wa mikopo kwa wateja wako wa kawaida?'
        ],
        pricing_help: [
          'Bei hii inaweza kuwa nzuri, lakini fikiria bei ya wakati wa joto na baridi.',
          'Naona kuwa unaweza kuongeza bei ya bidhaa hii kwa asilimia 8% bila kupoteza wateja.',
          'Usisahau kuhesabu gharama za usafirishaji na kodi katika bei yako.'
        ],
        inventory_help: [
          'Stock yako ya bidhaa hii inakaribia kuisha. Nashauri uagize zaidi mapema.',
          'Kuna bidhaa ambazo hazijauza kwa wiki 2. Je, tunaweza kubadilisha mikakati ya mauzo?',
          'Msimu wa mvua unakuja. Ongeza stock ya vitu vya mvua.'
        ]
      },
      en: {
        business_advisor: [
          'That\'s a great idea! Have you considered how your customers spend their money?',
          'Based on your sales data, I see you could increase profits by 15% by adjusting your pricing strategy.',
          'I recommend adding more fast-moving products to reduce risk.',
          'Have you considered implementing a credit system for your regular customers?'
        ],
        pricing_help: [
          'This price looks good, but consider seasonal pricing variations.',
          'I see you could increase this product\'s price by 8% without losing customers.',
          'Don\'t forget to factor in transportation and tax costs in your pricing.'
        ],
        inventory_help: [
          'Your stock for this product is running low. I recommend ordering more soon.',
          'Some products haven\'t sold in 2 weeks. Should we adjust the sales strategy?',
          'Rainy season is coming. Increase stock for rain-related items.'
        ]
      }
    };

    const categoryResponses = responses[lang][type] || responses[lang].business_advisor;
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: language === 'sw' ? 'Hitilafu' : 'Error',
        description: language === 'sw' ? 'Kivinjari chako hakitumii teknolojia ya sauti' : 'Speech recognition not supported',
        variant: 'destructive'
      });
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = language === 'sw' ? 'sw-TZ' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      
      // Log voice command
      if (user) {
        await supabase.from('voice_commands').insert({
          user_id: user.id,
          command_text: transcript,
          language,
          action_taken: 'chat_message',
          success: true
        });
      }
    };

    recognition.onerror = () => {
      toast({
        title: language === 'sw' ? 'Hitilafu' : 'Error',
        description: language === 'sw' ? 'Imeshindwa kusikia sauti' : 'Failed to recognize speech',
        variant: 'destructive'
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'pricing_help': return <DollarSign className="h-4 w-4" />;
      case 'inventory_help': return <Package className="h-4 w-4" />;
      case 'business_advisor': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getSessionTitle = () => {
    const titles = {
      sw: {
        business_advisor: 'Mshauri wa Biashara',
        pricing_help: 'Msaada wa Bei',
        inventory_help: 'Msaada wa Stock',
        general: 'Msaada wa Jumla'
      },
      en: {
        business_advisor: 'Business Advisor',
        pricing_help: 'Pricing Help',
        inventory_help: 'Inventory Help',
        general: 'General Help'
      }
    };
    return titles[language][sessionType];
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-3">
        <div className="flex items-center space-x-2">
          {getSessionIcon()}
          <CardTitle className="text-lg">{getSessionTitle()}</CardTitle>
        </div>
        <Badge variant="outline" className="ml-auto">
          {language === 'sw' ? 'Kiswahili' : 'English'}
        </Badge>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'ai' && <Bot className="h-4 w-4 mt-0.5 text-purple-600" />}
                    {message.type === 'user' && <User className="h-4 w-4 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-purple-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={language === 'sw' ? 'Andika ujumbe...' : 'Type a message...'}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <Button
            onClick={startVoiceRecognition}
            disabled={isListening || isLoading}
            variant="outline"
            size="icon"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
