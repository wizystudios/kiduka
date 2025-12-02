import { createContext, useContext, useEffect, useState, ReactNode, useCallback, FC, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, businessName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  try {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

  // Clean-up any stale Supabase auth state to prevent limbo sessions
  const cleanupAuthState = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch (e) {
      console.warn('Auth cleanup warning:', e);
    }
  };

  const createProfile = async (userId: string, email: string, fullName?: string, businessName?: string) => {
    try {
      console.log('Creating profile for user:', userId);
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: email,
            full_name: fullName || '',
            business_name: businessName || '',
            role: 'owner'
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }
      
      console.log('Profile created successfully:', newProfile);
      return newProfile;
    } catch (error) {
      console.error('Unexpected error creating profile:', error);
      return null;
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      if (!profile) {
        // Create profile without waiting - let it happen in background
        createProfile(
          userId,
          user?.email || '',
          user?.user_metadata?.full_name,
          user?.user_metadata?.business_name
        ).catch(err => console.error('Background profile creation failed:', err));
        
        // Return minimal profile immediately so user can proceed
        return {
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || '',
          business_name: user?.user_metadata?.business_name || '',
          role: 'owner'
        };
      }
      
      return profile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Return minimal profile on error so user isn't blocked
      return {
        id: userId,
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name || '',
        business_name: user?.user_metadata?.business_name || '',
        role: 'owner'
      };
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  }, [user?.id]);

  const updateProfile = useCallback(async (updates: any) => {
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;
    let isInitialized = false;

    const handleAuthStateChange = async (event: string, session: any) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUserProfile(null);
          setLoading(false);
        }
        return;
      }
      
      if (session?.user && mounted) {
        // Don't block on profile fetch - load it in background
        fetchUserProfile(session.user.id)
          .then(profile => {
            if (mounted) {
              setUserProfile(profile);
            }
          })
          .catch(err => console.error('Profile load error:', err))
          .finally(() => {
            if (mounted) {
              setLoading(false);
            }
          });
      } else if (mounted) {
        setLoading(false);
      }
    };

    const initializeAuth = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      try {
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Got session:', session?.user?.email || 'no session');
        await handleAuthStateChange('INITIAL_SESSION', session);
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          console.log('Auth init error, setting loading to false');
          setLoading(false);
        }
      }
    };

    try {
      const authListener = supabase.auth.onAuthStateChange((event, session) => {
        // Prevent re-initialization on auth state changes
        if (event !== 'INITIAL_SESSION') {
          handleAuthStateChange(event, session);
        }
      });
      subscription = authListener.data.subscription;
      initializeAuth();
    } catch (error) {
      console.error('Auth initialization error:', error);
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Clean up any stale auth and attempt a global sign out to avoid limbo
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // ignore errors here
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Barua pepe au nywila si sahihi. Tafadhali jaribu tena.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Barua pepe yako haijathibitishwa bado. Tafadhali kagua barua pepe yako na ubonyeze kiungo cha uthibitisho.');
        } else {
          throw new Error(error.message);
        }
      }

      // Force a clean reload into the app after successful login
      window.location.href = '/dashboard';
    } catch (error: any) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, businessName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
        },
        emailRedirectTo: `${window.location.origin}/`
      },
    });
    
    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('Barua pepe hii tayari imesajiliwa. Tafadhali jaribu kuingia au tumia barua pepe nyingine.');
      } else {
        throw new Error(error.message);
      }
    }
    
    if (data.user && !data.user.email_confirmed_at) {
      throw new Error('CONFIRMATION_REQUIRED');
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // ignore
      }
    } finally {
      setUserProfile(null);
      window.location.href = '/auth';
    }
  };

    const contextValue = useMemo(() => ({
      user,
      session,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
    }), [user, session, userProfile, loading, signIn, signUp, signOut, refreshProfile, updateProfile]);

    return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error('AuthProvider error:', error);
    // Return minimal provider to prevent crashes
    return (
      <AuthContext.Provider value={{
        user: null,
        session: null,
        userProfile: null,
        loading: false,
        signIn: async () => {},
        signUp: async () => {},
        signOut: async () => {},
        refreshProfile: async () => {},
        updateProfile: async () => ({})
      }}>
        {children}
      </AuthContext.Provider>
    );
  }
};

export const useAuth = () => {
  try {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  } catch (error) {
    console.warn('useAuth hook error:', error);
    // Return fallback context to prevent crashes
    return {
      user: null,
      session: null,
      userProfile: null,
      loading: false,
      signIn: async () => {},
      signUp: async () => {},
      signOut: async () => {},
      refreshProfile: async () => {},
      updateProfile: async () => ({})
    };
  }
};
