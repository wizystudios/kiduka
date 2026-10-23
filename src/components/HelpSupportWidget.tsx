import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export const HelpSupportWidget = ({open,onClose}:{open:boolean;onClose:()=>void}) => {
 const navigate=useNavigate();
 useEffect(()=>{if(open){onClose();navigate('/servicehub#mawasiliano');}},[open,navigate,onClose]);
 return null;
};
