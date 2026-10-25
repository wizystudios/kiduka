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
  anyPermission?: string[];
  /** Branch feature key the owner/admin must enable for branch staff to see this item. */
  feature?: string;
  ownerOnly?: boolean;
}

export const primaryNavigationItems: AppNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard', permission: null },
  { id: 'products', feature: 'products', label: 'Bidhaa', icon: Package, href: '/products', permission: 'can_view_products' },
  { id: 'sales', feature: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
  { id: 'stock', feature: 'inventory', label: 'Stock', icon: ClipboardList, href: '/inventory-snapshots', permission: 'can_view_inventory' },
  { id: 'orders', label: 'Oda', icon: Crown, href: '/sokoni-orders', permission: 'sokoni_orders_manage' },
  { id: 'rewards', label: 'Tuzo', icon: Gift, href: '/rewards', anyPermission: ['discounts_manage', 'returns_view', 'marketplace_manage'] },
  { id: 'groups', feature: 'customers', label: 'Makundi', icon: Users, href: '/groups', permission: 'groups_manage' },
  { id: 'mikopo', feature: 'customers', label: 'Mikopo', icon: CreditCard, href: '/credit-management', permission: 'debts_manage' },
  { id: 'invoices', feature: 'sales', label: 'Ankara', icon: FileText, href: '/invoices', permission: 'invoices_view' },
  { id: 'payments', label: 'Malipo', icon: Wallet, href: '/lipa-namba', permission: 'payment_numbers_manage' },
  { id: 'reports', feature: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
  { id: 'bookkeeping', feature: 'reports', label: 'Uhasibu', icon: BookOpen, href: '/bookkeeping', permission: 'bookkeeping_view' },
  { id: 'branches', label: 'Matawi', icon: Store, href: '/branches', ownerOnly: true },
    { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', permission: null },
];

export const utilityNavigationItems: AppNavItem[] = [
  { id: 'servicehub', label: 'ServiceHUB', icon: HelpCircle, href: '/servicehub', permission: null },
  { id: 'notifications', label: 'Arifa', icon: Bell, href: '/notifications', permission: null },
  { id: 'subscription', label: 'Michango', icon: Crown, href: '/subscription', permission: 'billing_view' },
  { id: 'install', label: 'Sakinisha App', icon: Smartphone, href: '/pwa-install', permission: null },
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
  if (branchFeatures && item.feature && branchFeatures[item.feature] !== true) return false;
  if (item.anyPermission) return item.anyPermission.some(key => permissions?.[key] === true);
  if (!item.permission) return true;
  return permissions?.[item.permission] ?? false;
});
