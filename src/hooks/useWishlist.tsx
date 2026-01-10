import { useState, useEffect } from 'react';

const WISHLIST_KEY = 'sokoni_wishlist';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  owner_business_name?: string;
  addedAt: string;
}

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage whenever wishlist changes
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  }, [wishlist]);

  const addToWishlist = (item: Omit<WishlistItem, 'addedAt'>) => {
    setWishlist(prev => {
      // Check if already in wishlist
      if (prev.some(w => w.id === item.id)) {
        return prev;
      }
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(item => item.id !== productId));
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.id === productId);
  };

  const toggleWishlist = (item: Omit<WishlistItem, 'addedAt'>) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
      return false;
    } else {
      addToWishlist(item);
      return true;
    }
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    clearWishlist,
    wishlistCount: wishlist.length,
  };
};
