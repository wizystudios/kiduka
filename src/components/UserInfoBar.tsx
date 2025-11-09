import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { User } from 'lucide-react';

export const UserInfoBar = () => {
  const { user, userProfile } = useAuth();

  const getUserInitials = () => {
    const displayName = userProfile?.full_name || 
                       user?.user_metadata?.full_name || 
                       user?.email?.split('@')[0] || 
                       'User';
    
    return displayName
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getDisplayName = () => {
    return userProfile?.full_name || 
           user?.user_metadata?.full_name || 
           user?.email?.split('@')[0] || 
           'User';
  };

  const getUserRole = () => {
    const role = userProfile?.role || 'owner';
    switch (role) {
      case 'owner': return 'Mmiliki';
      case 'assistant': return 'Msaidizi';
      case 'super_admin': return 'Msimamizi Mkuu';
      default: return 'Mtumiaji';
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
      <Card className="rounded-none border-0 bg-gradient-to-r from-emerald-50/50 via-blue-50/50 to-purple-50/50">
        <CardContent className="p-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {getDisplayName()}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge 
                    variant={userProfile?.role === 'owner' ? 'default' : 'secondary'}
                    className="text-[10px] h-4 px-1.5"
                  >
                    {getUserRole()}
                  </Badge>
                  {userProfile?.business_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {userProfile.business_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
              {new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
