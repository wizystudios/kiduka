import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, Phone, Mail, MessageSquare, BookOpen,
  Users, Package, BarChart3, CreditCard, Camera, Download
} from 'lucide-react';

export const HelpCenter = () => {
  const faqItems = [
    { question: "Ninawezaje kuongeza bidhaa mpya?", answer: "Nenda Bidhaa → Ongeza Bidhaa. Jaza maelezo ya bidhaa na scan barcode au zalisha mpya.", icon: Package, category: "Bidhaa" },
    { question: "Ninawezaje kuscan bidhaa kwa mauzo?", answer: "Tumia Scanner, elekeza kamera kwenye barcode, na bidhaa itaongezwa moja kwa moja kwenye kikapu.", icon: Camera, category: "Mauzo" },
    { question: "Ninawezaje kuona ripoti za mauzo?", answer: "Nenda Ripoti kuona takwimu za kila siku, wiki, na mwezi pamoja na chati na uhamishaji.", icon: BarChart3, category: "Ripoti" },
    { question: "Ninawezaje kusimamia wasaidizi?", answer: "Wamiliki wa duka wanaweza kwenda Makundi → Wasaidizi kuongeza wasaidizi wenye ruhusa maalum.", icon: Users, category: "Watumiaji" },
    { question: "Je, naweza kufanya kazi bila mtandao?", answer: "Ndiyo! App inafanya kazi offline na kusawazisha data yako unapounganisha tena.", icon: Download, category: "Ufundi" },
    { question: "Ninawezaje kutoa punguzo?", answer: "Unda msimbo wa punguzo katika sehemu ya Punguzo, kisha utumie wakati wa malipo.", icon: CreditCard, category: "Mauzo" },
  ];

  const contactOptions = [
    { title: "Simu", description: "+255 784 813 540", icon: Phone, action: "tel:+255784813540", color: "text-green-600" },
    { title: "Barua Pepe", description: "smartshoppos795@gmail.com", icon: Mail, action: "mailto:smartshoppos795@gmail.com", color: "text-blue-600" },
    { title: "WhatsApp", description: "Zungumza nasi", icon: MessageSquare, action: "https://wa.me/255784813540", color: "text-green-500" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <HelpCircle className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-xl font-bold text-foreground">Kituo cha Msaada</h1>
        <p className="text-sm text-muted-foreground">Pata majibu ya maswali na msaada</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Mwongozo wa Kuanza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { step: "1", title: "Ongeza Bidhaa", desc: "Anza kwa kuongeza bidhaa zako" },
              { step: "2", title: "Panga Timu", desc: "Ongeza wasaidizi ikiwa unahitaji" },
              { step: "3", title: "Anza Kuuza", desc: "Tumia Scanner kuongeza bidhaa na kulipa" },
              { step: "4", title: "Fuatilia Biashara", desc: "Angalia ripoti na takwimu" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 p-2 rounded-xl bg-muted/30">
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{item.step}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Maswali Yanayoulizwa Mara Kwa Mara</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqItems.map((item, index) => (
            <div key={index} className="border-b border-border/50 pb-3 last:border-b-0">
              <div className="flex items-start gap-3">
                <item.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.question}</p>
                    <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Wasiliana na Msaada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contactOptions.map((option, index) => (
              <Button
                key={index} variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-1.5"
                onClick={() => window.open(option.action, '_blank')}
              >
                <option.icon className={`h-6 w-6 ${option.color}`} />
                <p className="text-xs font-medium">{option.title}</p>
                <p className="text-[10px] text-muted-foreground">{option.description}</p>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-1 pb-8">
        <p className="text-xs text-muted-foreground">Kiduka POS System v1.0.0</p>
        <p className="text-[10px] text-muted-foreground">Built with ❤️ for Tanzanian shopkeepers</p>
      </div>
    </div>
  );
};
