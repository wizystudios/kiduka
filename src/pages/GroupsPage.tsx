import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomersPage } from '@/pages/CustomersPage';
import SuppliersPage from '@/pages/SuppliersPage';
import { UsersPage } from '@/pages/UsersPage';
import { useAuth } from '@/hooks/useAuth';
import { Users, Truck, UserCheck } from 'lucide-react';

export default function GroupsPage() {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'super_admin';

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Makundi</h1>
        <p className="text-sm text-muted-foreground">Wateja, Wasambazaji na Wasaidizi</p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className={`grid w-full ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="customers" className="gap-1 text-xs">
            <Users className="h-3.5 w-3.5" /> Wateja
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1 text-xs">
            <Truck className="h-3.5 w-3.5" /> Wasambazaji
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="users" className="gap-1 text-xs">
              <UserCheck className="h-3.5 w-3.5" /> Wasaidizi
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="customers" className="mt-0">
          <CustomersPage embedded />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-0">
          <SuppliersPage embedded />
        </TabsContent>

        {isOwner && (
          <TabsContent value="users" className="mt-0">
            <UsersPage embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}