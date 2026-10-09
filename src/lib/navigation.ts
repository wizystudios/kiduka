import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  CreditCard,
  Wallet,
  Crown,
  Gift,
  HelpCircle,
  Home,
  Package,
  Settings,
  Shield,
  Smartphone,
  Store,
  ShoppingCart,
  type LucideIcon,
  Users,
} from 'lucide-react';

export interface AppNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  permission?: string | null;
  /** Branch feature key the owner/admin must enable for branch staff to see this item. */
  feature?: string;
  ownerOnly?: boolean;
}

export const primaryNavigationItems: AppNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard', permission: null },
  { id: 'products', feature: 'products', label: 'Bidhaa', icon: Package, href: '/products', permission: 'can_view_products' },
  { id: 'sales', feature: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
  { id: 'stock', feature: 'inventory', label: 'Stock', icon: ClipboardList, href: '/inventory-snapshots', permission: 'can_view_inventory' },
  { id: 'orders', feature: 'sales', label: 'Oda', icon: Crown, href: '/sokoni-orders', permission: 'can_view_sales' },
  { id: 'rewards', label: 'Tuzo', icon: Gift, href: '/rewards', permission: null },
  { id: 'groups', feature: 'customers', label: 'Makundi', icon: Users, href: '/groups', permission: null },
  { id: 'mikopo', feature: 'customers', label: 'Mikopo', icon: CreditCard, href: '/credit-management', permission: null },
  { id: 'invoices', feature: 'sales', label: 'Ankara', icon: FileText, href: '/invoices', permission: 'can_view_sales' },
  { id: 'payments', feature: 'sales', label: 'Malipo', icon: Wallet, href: '/lipa-namba', permission: null },
  { id: 'reports', feature: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
  { id: 'bookkeeping', feature: 'reports', label: 'Uhasibu', icon: BookOpen, href: '/bookkeeping', permission: null },
    { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', permission: null },
];

export const utilityNavigationItems: AppNavItem[] = [
  { id: 'notifications', label: 'Arifa', icon: Bell, href: '/notifications', permission: null },
  { id: 'subscription', label: 'Michango', icon: Crown, href: '/subscription', permission: null },
  { id: 'install', label: 'Sakinisha App', icon: Smartphone, href: '/pwa-install', permission: null },
  { id: 'help', label: 'Msaada', icon: HelpCircle, href: '/help', permission: null },
];

export const superAdminNavigationItem: AppNavItem = {
  id: 'super-admin',
  label: 'Super Admin',
  icon: Shield,
  href: '/super-admin',
  permission: null,
};

export const filterNavigationItems = <T extends AppNavItem>(
  items: T[],
  role?: string | null,
  permissions?: Record<string, boolean> | null,
  branchFeatures?: Record<string, boolean> | null,
) => items.filter((item) => {
  if (role === 'owner' || role === 'super_admin') return true;
  if (item.ownerOnly) return false;
  // Branch staff only see what the owner/admin enabled for their branch
  if (branchFeatures && item.feature && branchFeatures[item.feature] === false) return false;
  if (!item.permission) return true;
  return permissions?.[item.permission] ?? false;
});
