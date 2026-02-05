 import { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent } from '@/components/ui/card';
 import { 
   Package, ShoppingCart, BarChart3, Users, Settings, 
   Scan, Calculator, CreditCard, TrendingUp, ArrowRight, 
   ArrowLeft, X, CheckCircle
 } from 'lucide-react';
 import { KidukaLogo } from './KidukaLogo';
 
 interface TourStep {
   title: string;
   description: string;
   icon: React.ComponentType<any>;
   color: string;
   demoText: string;
   tipTitle: string;
   tipDescription: string;
 }
 
 const tourSteps: TourStep[] = [
   {
     title: "Dashboard",
     description: "Tazama muhtasari wa biashara yako kwa haraka",
     icon: BarChart3,
     color: "from-blue-500 to-blue-600",
     demoText: "Mauzo ya leo: TSh 150,000",
     tipTitle: "Fuatilia Utendaji",
     tipDescription: "Ona mauzo, mapato, na wateja wako kwa wakati halisi."
   },
   {
     title: "Bidhaa",
     description: "Ongeza na usimamie bidhaa zako zote",
     icon: Package,
     color: "from-emerald-500 to-emerald-600",
     demoText: "Bidhaa 45 zinapatikana",
     tipTitle: "Udhibiti wa Stock",
     tipDescription: "Ongeza bidhaa, weka bei, na fuatilia hifadhi."
   },
   {
     title: "Mauzo",
     description: "Fanya mauzo haraka na kwa urahisi",
     icon: ShoppingCart,
     color: "from-purple-500 to-purple-600",
     demoText: "Chagua bidhaa → Lipa → Maliza!",
     tipTitle: "Mauzo Rahisi",
     tipDescription: "Scan barcode au chagua bidhaa, ingiza kiasi, kamilisha uuzaji."
   },
   {
     title: "Scanner",
     description: "Scan barcode kwa kamera ya simu",
     icon: Scan,
     color: "from-orange-500 to-orange-600",
     demoText: "📷 Elekeza kamera...",
     tipTitle: "Scan Haraka",
     tipDescription: "Tumia kamera kuscan barcode za bidhaa moja kwa moja."
   },
   {
     title: "Wateja",
     description: "Fuatilia wateja na madeni yao",
     icon: Users,
     color: "from-pink-500 to-pink-600",
     demoText: "Wateja 23 wameandikishwa",
     tipTitle: "Usimamizi wa Wateja",
     tipDescription: "Ongeza wateja, tazama historia yao, na simamia madeni."
   },
   {
     title: "Ripoti",
     description: "Uchambuzi wa kina wa biashara yako",
     icon: TrendingUp,
     color: "from-cyan-500 to-cyan-600",
     demoText: "📈 Faida +15% wiki hii",
     tipTitle: "Data ni Nguvu",
     tipDescription: "Tazama ripoti za mauzo, faida, na mwenendo wa biashara."
   },
   {
     title: "Kikokotoo",
     description: "Hesabu za haraka wakati wa mauzo",
     icon: Calculator,
     color: "from-amber-500 to-amber-600",
     demoText: "150,000 + 50,000 = 200,000",
     tipTitle: "Hesabu Rahisi",
     tipDescription: "Tumia kikokotoo kuhesabu chenji na jumla za mauzo."
   },
   {
     title: "Mikopo",
     description: "Simamia mikopo na madeni ya wateja",
     icon: CreditCard,
     color: "from-red-500 to-red-600",
     demoText: "Madeni: TSh 75,000",
     tipTitle: "Udhibiti wa Mikopo",
     tipDescription: "Rekodi mikopo, fuatilia malipo, na ukumbushe wateja."
   },
   {
     title: "Mipangilio",
     description: "Badilisha mipangilio ya akaunti yako",
     icon: Settings,
     color: "from-gray-500 to-gray-600",
     demoText: "⚙️ Biashara yangu",
     tipTitle: "Mipangilio",
     tipDescription: "Badilisha jina la duka, theme, na mipangilio ya arifa."
   }
 ];
 
 interface OnboardingTourProps {
   onComplete: () => void;
 }
 
 export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
   const [currentStep, setCurrentStep] = useState(0);
   const [visible, setVisible] = useState(true);
 
   const step = tourSteps[currentStep];
   const Icon = step.icon;
   const progress = ((currentStep + 1) / tourSteps.length) * 100;
   const isLastStep = currentStep === tourSteps.length - 1;
 
   const handleNext = () => {
     if (!isLastStep) {
       setCurrentStep(currentStep + 1);
     } else {
       handleComplete();
     }
   };
 
   const handlePrevious = () => {
     if (currentStep > 0) {
       setCurrentStep(currentStep - 1);
     }
   };
 
   const handleComplete = () => {
     setVisible(false);
     onComplete();
   };
 
   if (!visible) return null;
 
   return (
     <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
       <Card className="w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
         <div className={`h-2 bg-gradient-to-r ${step.color}`} style={{ width: `${progress}%` }} />
         <CardContent className="p-0">
           <div className="flex flex-col lg:flex-row min-h-[480px]">
             {/* LEFT - Feature Description */}
             <div className="flex-1 p-8 flex flex-col justify-between">
               <div className="flex items-center justify-between">
                 <KidukaLogo size="sm" showText={false} />
                 <Button variant="ghost" size="icon" onClick={() => { setVisible(false); onComplete(); }}>
                   <X className="h-5 w-5" />
                 </Button>
               </div>
               <div className="flex-1 flex flex-col justify-center space-y-6 py-6">
                 <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                   <Icon className="h-8 w-8 text-white" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                   <p className="text-muted-foreground">{step.description}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 {currentStep > 0 ? (
                   <Button variant="outline" onClick={handlePrevious} className="flex-1">
                     <ArrowLeft className="h-5 w-5 mr-2" />Rudi
                   </Button>
                 ) : (
                   <Button variant="ghost" onClick={() => { setVisible(false); onComplete(); }} className="flex-1">Ruka Yote</Button>
                 )}
                 <Button className={`flex-1 bg-gradient-to-r ${step.color} text-white border-0`} onClick={handleNext}>
                   {isLastStep ? (<><CheckCircle className="h-5 w-5 mr-2" />Anza Sasa!</>) : (<>Endelea<ArrowRight className="h-5 w-5 ml-2" /></>)}
                 </Button>
               </div>
             </div>
             {/* RIGHT - Demo Preview */}
             <div className="flex-1 bg-muted/30 p-8 flex flex-col justify-center border-l">
               <Card className="shadow-xl overflow-hidden">
                 <div className={`h-2 bg-gradient-to-r ${step.color}`} />
                 <CardContent className="p-5 space-y-4">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center`}>
                       <Icon className="h-5 w-5 text-white" />
                     </div>
                     <div><h3 className="font-bold">{step.title}</h3><p className="text-xs text-muted-foreground">Kiduka POS</p></div>
                   </div>
                   <div className="bg-muted rounded-2xl p-4 text-center">
                     <p className="text-lg font-medium">{step.demoText}</p>
                   </div>
                   <div className="border-t pt-3">
                     <h4 className="font-bold text-sm">💡 {step.tipTitle}</h4>
                     <p className="text-sm text-muted-foreground mt-1">{step.tipDescription}</p>
                   </div>
                 </CardContent>
               </Card>
               <div className="flex justify-center gap-2 mt-6">
                 {tourSteps.map((_, index) => (
                   <button key={index} onClick={() => setCurrentStep(index)} className={`h-2 rounded-full transition-all ${index === currentStep ? 'w-6 bg-primary' : index < currentStep ? 'w-2 bg-primary/50' : 'w-2 bg-muted-foreground/30'}`} />
                 ))}
               </div>
               <p className="text-center text-sm text-muted-foreground mt-3">Hatua {currentStep + 1} ya {tourSteps.length}</p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 };