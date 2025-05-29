
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Phone, 
  Mail, 
  MessageSquare, 
  BookOpen,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  CreditCard,
  Camera,
  Download
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const HelpCenter = () => {
  const { t } = useLanguage();

  const faqItems = [
    {
      question: "How do I add a new product?",
      answer: "Go to Products → Add Product. Fill in the product details and either scan an existing barcode or generate a new one.",
      icon: Package,
      category: "Products"
    },
    {
      question: "How do I scan products for checkout?",
      answer: "Use the Scanner tab, point your camera at the barcode, and the product will be added to your cart automatically.",
      icon: Camera,
      category: "Sales"
    },
    {
      question: "How can I view my sales reports?",
      answer: "Navigate to Reports to see daily, weekly, and monthly sales analytics with charts and export options.",
      icon: BarChart3,
      category: "Reports"
    },
    {
      question: "How do I manage my staff/assistants?",
      answer: "Shop owners can go to Users section to add assistants with limited permissions for sales and scanning.",
      icon: Users,
      category: "Users"
    },
    {
      question: "Can I work offline?",
      answer: "Yes! The app works offline and syncs your data when you reconnect to the internet.",
      icon: Download,
      category: "Technical"
    },
    {
      question: "How do I apply discounts?",
      answer: "Create discount codes in the Discounts section, then apply them during checkout by scanning or entering the code.",
      icon: CreditCard,
      category: "Sales"
    }
  ];

  const contactOptions = [
    {
      title: "Phone Support",
      description: "+255 700 123 456",
      icon: Phone,
      action: "tel:+255700123456",
      color: "text-green-600"
    },
    {
      title: "Email Support", 
      description: "help@kiduka.co.tz",
      icon: Mail,
      action: "mailto:help@kiduka.co.tz",
      color: "text-blue-600"
    },
    {
      title: "WhatsApp",
      description: "Chat with us",
      icon: MessageSquare,
      action: "https://wa.me/255700123456",
      color: "text-green-500"
    }
  ];

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <HelpCircle className="h-12 w-12 text-blue-600 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('help_center')}</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Add Your Products</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Start by adding your inventory in the Products section
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Set Up Your Team</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add assistants in the Users section if needed
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Start Selling</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use the Scanner to add products to cart and checkout
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">4. Track Performance</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Monitor your business with Reports and Analytics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
              <div className="flex items-start space-x-3">
                <item.icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{item.question}</h4>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contact_support')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contactOptions.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => window.open(option.action, '_blank')}
              >
                <option.icon className={`h-8 w-8 ${option.color}`} />
                <div className="text-center">
                  <p className="font-medium">{option.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{option.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* App Version Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">Kiduka POS System</p>
            <p className="text-xs text-gray-500">Version 1.0.0</p>
            <p className="text-xs text-gray-500">
              Built with ❤️ for Tanzanian shopkeepers
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
