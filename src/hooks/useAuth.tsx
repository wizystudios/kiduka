
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
  updateProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      if (!profile) {
        console.log('No profile found, creating one...');
        const newProfile = await createProfile(
          userId, 
          user?.email || '',
          user?.user_metadata?.full_name,
          user?.user_metadata?.business_name
        );
        return newProfile;
      }
      
      console.log('Profile fetched successfully:', profile);
      return profile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  }, [user?.id, fetchUserProfile]);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) {
          setUserProfile(profile);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string) => {
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
