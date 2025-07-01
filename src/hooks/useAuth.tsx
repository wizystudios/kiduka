
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (!profile) {
        console.log('Profile not found, creating new profile...');
        // Get user data from current session
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              email: currentUser?.email || '',
              full_name: currentUser?.user_metadata?.full_name || '',
              business_name: currentUser?.user_metadata?.business_name || '',
              role: 'owner'
            }
          ])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          console.log('Profile created successfully:', newProfile);
          setUserProfile(newProfile);
        }
      } else {
        console.log('Profile fetched successfully:', profile);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && session.user.email_confirmed_at) {
          // Only fetch profile for confirmed users, with a delay to avoid deadlocks
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 100);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && session.user.email_confirmed_at) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 100);
      }
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Barua pepe yako haijathibitishwa bado. Tafadhali kagua barua pepe yako na ubonyeze kiungo cha uthibitisho kabla ya kuingia.');
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
        emailRedirectTo: `${window.location.origin}/verify-email`
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
