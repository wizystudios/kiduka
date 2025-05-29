
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'sw' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  sw: {
    // General
    'welcome': 'Karibu',
    'settings': 'Mipangilio',
    'dashboard': 'Dashibodi',
    'products': 'Bidhaa',
    'sales': 'Mauzo',
    'reports': 'Ripoti',
    'customers': 'Wateja',
    'users': 'Watumiaji',
    'discounts': 'Punguzo',
    'scanner': 'Skana',
    'logout': 'Toka',
    
    // Settings
    'profile_information': 'Taarifa za Wasifu',
    'full_name': 'Jina Kamili',
    'business_name': 'Jina la Biashara',
    'email': 'Barua Pepe',
    'update_profile': 'Sasisha Wasifu',
    'security': 'Usalama',
    'new_password': 'Nywila Mpya',
    'confirm_password': 'Thibitisha Nywila',
    'update_password': 'Sasisha Nywila',
    'language_settings': 'Mipangilio ya Lugha',
    'theme_settings': 'Mipangilio ya Mandhari',
    'dark_mode': 'Hali ya Giza',
    'light_mode': 'Hali ya Mwanga',
    'account_management': 'Usimamizi wa Akaunti',
    'delete_account': 'Futa Akaunti',
    'help_support': 'Msaada na Uongozi',
    'help_center': 'Kituo cha Msaada',
    'contact_support': 'Wasiliana na Msaada',
    
    // Actions
    'save': 'Hifadhi',
    'cancel': 'Ghairi',
    'delete': 'Futa',
    'confirm': 'Thibitisha',
    'close': 'Funga',
    'add': 'Ongeza',
    'edit': 'Hariri',
    'view': 'Angalia',
    'export': 'Hamisha',
    
    // Messages
    'success': 'Mafanikio',
    'error': 'Hitilafu',
    'loading': 'Inapakia...',
    'no_data': 'Hakuna data',
    'confirm_delete_account': 'Je, una uhakika unataka kufuta akaunti yako? Hii haitaweza kutenduliwa.',
    
    // Products
    'add_product': 'Ongeza Bidhaa',
    'product_name': 'Jina la Bidhaa',
    'price': 'Bei',
    'stock': 'Hifadhi',
    'category': 'Jamii',
    'low_stock_alert': 'Onyo la Hifadhi Chini',
    
    // Sales
    'total_sales': 'Jumla ya Mauzo',
    'transactions': 'Miamala',
    'daily_sales': 'Mauzo ya Kila Siku',
    'payment_method': 'Njia ya Malipo',
    'cash': 'Fedha Taslimu',
    'card': 'Kadi',
    
    // Reports
    'sales_report': 'Ripoti ya Mauzo',
    'inventory_report': 'Ripoti ya Hifadhi',
    'profit_analysis': 'Uchambuzi wa Faida',
    'export_data': 'Hamisha Data'
  },
  en: {
    // General
    'welcome': 'Welcome',
    'settings': 'Settings',
    'dashboard': 'Dashboard',
    'products': 'Products',
    'sales': 'Sales',
    'reports': 'Reports',
    'customers': 'Customers',
    'users': 'Users',
    'discounts': 'Discounts',
    'scanner': 'Scanner',
    'logout': 'Logout',
    
    // Settings
    'profile_information': 'Profile Information',
    'full_name': 'Full Name',
    'business_name': 'Business Name',
    'email': 'Email',
    'update_profile': 'Update Profile',
    'security': 'Security',
    'new_password': 'New Password',
    'confirm_password': 'Confirm Password',
    'update_password': 'Update Password',
    'language_settings': 'Language Settings',
    'theme_settings': 'Theme Settings',
    'dark_mode': 'Dark Mode',
    'light_mode': 'Light Mode',
    'account_management': 'Account Management',
    'delete_account': 'Delete Account',
    'help_support': 'Help & Support',
    'help_center': 'Help Center',
    'contact_support': 'Contact Support',
    
    // Actions
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'confirm': 'Confirm',
    'close': 'Close',
    'add': 'Add',
    'edit': 'Edit',
    'view': 'View',
    'export': 'Export',
    
    // Messages
    'success': 'Success',
    'error': 'Error',
    'loading': 'Loading...',
    'no_data': 'No data',
    'confirm_delete_account': 'Are you sure you want to delete your account? This action cannot be undone.',
    
    // Products
    'add_product': 'Add Product',
    'product_name': 'Product Name',
    'price': 'Price',
    'stock': 'Stock',
    'category': 'Category',
    'low_stock_alert': 'Low Stock Alert',
    
    // Sales
    'total_sales': 'Total Sales',
    'transactions': 'Transactions',
    'daily_sales': 'Daily Sales',
    'payment_method': 'Payment Method',
    'cash': 'Cash',
    'card': 'Card',
    
    // Reports
    'sales_report': 'Sales Report',
    'inventory_report': 'Inventory Report',
    'profit_analysis': 'Profit Analysis',
    'export_data': 'Export Data'
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('sw'); // Default to Swahili

  useEffect(() => {
    const savedLang = localStorage.getItem('preferred-language') as Language;
    if (savedLang && (savedLang === 'sw' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
