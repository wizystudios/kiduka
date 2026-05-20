import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SokoniCustomer {
  id: string;
  phone: string;
  name: string | null;
}

const STORAGE_KEY = 'sokoni_customer_phone';
const PIN_KEY = 'sokoni_customer_pin';

export const useSokoniCustomer = () => {
  const [customer, setCustomer] = useState<SokoniCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    const savedPin = localStorage.getItem(PIN_KEY);
    if (savedPhone && savedPin) {
      verifyAndLoad(savedPhone, savedPin);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyAndLoad = async (phone: string, pin: string): Promise<SokoniCustomer | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sokoni_verify_pin' as any, {
        p_phone: phone,
        p_pin: pin,
      });
      if (error) {
        console.error('verify_pin error:', error);
        return null;
      }
      const result = data as any;
      if (result?.success && result?.customer) {
        const c = result.customer as SokoniCustomer;
        setCustomer(c);
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEY, phone);
        localStorage.setItem(PIN_KEY, pin);
        return c;
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (phone: string, pin: string, name?: string): Promise<SokoniCustomer | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sokoni_register_customer' as any, {
        p_phone: phone,
        p_pin: pin,
        p_name: name || null,
      });
      if (error) {
        console.error('register error:', error);
        return null;
      }
      const result = data as any;
      if (result?.success && result?.customer) {
        const c = result.customer as SokoniCustomer;
        setCustomer(c);
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEY, phone);
        localStorage.setItem(PIN_KEY, pin);
        return c;
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, pin: string): Promise<SokoniCustomer | null> => {
    return await verifyAndLoad(phone, pin);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PIN_KEY);
    setCustomer(null);
    setIsLoggedIn(false);
  }, []);

  const updateName = async (name: string) => {
    if (!customer) return false;
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) return false;
    try {
      const { data, error } = await supabase.rpc('sokoni_update_customer_name' as any, {
        p_phone: customer.phone,
        p_pin: pin,
        p_name: name,
      });
      if (error || !(data as any)?.success) return false;
      setCustomer({ ...customer, name });
      return true;
    } catch {
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
