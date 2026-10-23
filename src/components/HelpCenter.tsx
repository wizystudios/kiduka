import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';
export const HelpCenter = () => {
 const navigate=useNavigate();
 return <div className="py-6"><Button onClick={()=>navigate('/servicehub')}><Headphones className="h-4 w-4"/>ServiceHUB</Button></div>;
};
