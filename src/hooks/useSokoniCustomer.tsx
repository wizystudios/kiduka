import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SokoniCustomer {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
}

const STORAGE_KEY = 'sokoni_customer_phone';

export const useSokoniCustomer = () => {
  const [customer, setCustomer] = useState<SokoniCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    if (savedPhone) {
      fetchCustomerByPhone(savedPhone);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCustomerByPhone = async (phone: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sokoni_customers' as any)
        .select('*')
        .eq('phone', phone)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching customer:', error);
        return null;
      }

      if (data) {
        const customerData = data as unknown as SokoniCustomer;
        setCustomer(customerData);
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEY, phone);
        return customerData;
      }
      return null;
    } catch (error) {
      console.error('Error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (phone: string, name?: string): Promise<SokoniCustomer | null> => {
    try {
      setLoading(true);
      const existing = await fetchCustomerByPhone(phone);
      if (existing) return existing;

      const { data, error } = await supabase
        .from('sokoni_customers' as any)
        .insert([{ phone, name: name || null }])
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        return null;
      }

      const customerData = data as unknown as SokoniCustomer;
      setCustomer(customerData);
      setIsLoggedIn(true);
      localStorage.setItem(STORAGE_KEY, phone);
      return customerData;
    } catch (error) {
      console.error('Error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string): Promise<SokoniCustomer | null> => {
    return await fetchCustomerByPhone(phone);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
    setIsLoggedIn(false);
  }, []);

  const updateName = async (name: string) => {
    if (!customer) return false;
    try {
      const { error } = await supabase
        .from('sokoni_customers' as any)
        .update({ name })
        .eq('id', customer.id);

      if (error) {
        console.error('Error updating name:', error);
        return false;
      }
      setCustomer({ ...customer, name });
      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  };

  return {
    customer,
    isLoggedIn,
    loading,
    register,
    login,
    logout,
    updateName,
    customerPhone: customer?.phone || localStorage.getItem(STORAGE_KEY),
  };
};
