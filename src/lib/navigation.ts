import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  CreditCard,
  Crown,
  HelpCircle,
  Home,
  Package,
  RotateCcw,
  Settings,
  Shield,
  Smartphone,
  Store,
  ShoppingCart,
  Tag,
  type LucideIcon,
  Users,
} from 'lucide-react';

export interface AppNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  permission?: string | null;
}

export const primaryNavigationItems: AppNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard', permission: null },
  { id: 'products', label: 'Bidhaa', icon: Package, href: '/products', permission: 'can_view_products' },
  { id: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
  { id: 'stock', label: 'Stock', icon: ClipboardList, href: '/inventory-snapshots', permission: 'can_view_inventory' },
  { id: 'orders', label: 'Oda', icon: Crown, href: '/sokoni-orders', permission: 'can_view_sales' },
  { id: 'coupons', label: 'Coupons', icon: Tag, href: '/coupons', permission: null },
  { id: 'returns', label: 'Returns', icon: RotateCcw, href: '/returns', permission: null },
  { id: 'sokoni', label: 'Duka Langu', icon: Store, href: '/store-settings', permission: null },
  { id: 'groups', label: 'Makundi', icon: Users, href: '/groups', permission: null },
  { id: 'mikopo', label: 'Mikopo', icon: CreditCard, href: '/credit-management', permission: null },
  { id: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
  { id: 'bookkeeping', label: 'Uhasibu', icon: BookOpen, href: '/bookkeeping', permission: null },
  { id: 'branches', label: 'Matawi', icon: Store, href: '/branches', permission: null },
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
) => items.filter((item) => {
  if (role === 'owner' || role === 'super_admin') return true;
  if (!item.permission) return true;
  return permissions?.[item.permission] ?? false;
});
