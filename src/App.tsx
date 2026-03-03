/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, TrendingDown, TrendingUp, Bell, ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, ShoppingCart, Heart, Trash2, HeartOff, Smartphone, Headphones, Laptop, Watch, ShoppingBag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Label } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Product {
  id: number;
  name: string;
  category: string;
  image_url?: string;
}

interface WishlistItem extends Product {
  current_price: number;
  avg_price: number;
  initial_price: number;
}

interface PriceEntry {
  id: number;
  product_id: number;
  platform: string;
  price: number;
  date: string;
  product_name: string;
}

interface HistoryEntry {
  date: string;
  avg_price: number;
}

interface Alert {
  id: number;
  product_id: number;
  target_price: number;
  user_email: string;
  product_name: string;
  current_price: number;
}

interface User {
  id: number;
  username: string;
  email: string;
}

const getProductImage = (product: Product) => {
  if (product.image_url) return product.image_url;
  const seed = `${product.category}-${product.name}`.toLowerCase().replace(/\s+/g, '-');
  return `https://picsum.photos/seed/${seed}/400/400`;
};

const categoryConfig: Record<string, { color: string, icon: React.ReactNode }> = {
  'Electronics': { color: 'bg-gradient-to-br from-blue-500 to-blue-600', icon: <Smartphone className="w-6 h-6" /> },
  'Audio': { color: 'bg-gradient-to-br from-purple-500 to-purple-600', icon: <Headphones className="w-6 h-6" /> },
  'Footwear': { color: 'bg-gradient-to-br from-orange-500 to-orange-600', icon: <ShoppingBag className="w-6 h-6" /> },
  'Laptops': { color: 'bg-gradient-to-br from-emerald-500 to-emerald-600', icon: <Laptop className="w-6 h-6" /> },
  'Accessories': { color: 'bg-gradient-to-br from-pink-500 to-pink-600', icon: <Watch className="w-6 h-6" /> }
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smartprice_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [view, setView] = useState<'search' | 'wishlist' | 'deals' | 'alerts'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceData, setPriceData] = useState<{ latestPrices: PriceEntry[], history: HistoryEntry[] } | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [deals, setDeals] = useState<WishlistItem[]>([]);
  const [userAlerts, setUserAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setUserEmail(user.email);
      fetchWishlist();
      fetchDeals();
      fetchAlerts();
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/wishlist?userId=${user.id}`);
      const data = await res.json();
      setWishlist(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setUserAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveAlert = async (alertId: number) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSearchQuery(category);
    // The useEffect for searchQuery will trigger the search
  };

  const handleAddToWishlist = async (productId: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId })
      });
      if (res.ok) {
        fetchWishlist();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromWishlist = async (productId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/wishlist/${productId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchWishlist();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isInWishlist = (productId: number) => {
    return wishlist.some(item => item.id === productId);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('smartprice_user', JSON.stringify(data.user));
      } else {
        setAuthError(data.error);
      }
    } catch (err) {
      setAuthError('Connection failed');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smartprice_user');
    setSelectedProduct(null);
  };

  useEffect(() => {
    if (searchQuery.length > 1) {
      const delayDebounceFn = setTimeout(() => {
        fetchProducts();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductSelect = async (product: Product) => {
    setLoading(true);
    setSelectedProduct(product);
    try {
      const res = await fetch(`/api/products/${product.id}/prices`);
      const data = await res.json();
      setPriceData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lowestPriceEntry = useMemo(() => {
    if (!priceData?.latestPrices.length) return null;
    return [...priceData.latestPrices].sort((a, b) => a.price - b.price)[0];
  }, [priceData]);

  const averagePrice = useMemo(() => {
    if (!priceData?.latestPrices.length) return 0;
    const sum = priceData.latestPrices.reduce((acc, curr) => acc + curr.price, 0);
    return sum / priceData.latestPrices.length;
  }, [priceData]);

  const recommendation = useMemo(() => {
    if (!lowestPriceEntry) return null;
    if (lowestPriceEntry.price < averagePrice * 0.95) {
      return {
        status: 'Buy Now',
        color: 'text-emerald-700 bg-emerald-100 border-emerald-300 shadow-emerald-100',
        icon: <TrendingDown className="w-6 h-6" />,
        message: 'The current lowest price is significantly below average. Great time to buy!'
      };
    } else if (lowestPriceEntry.price > averagePrice * 1.05) {
      return {
        status: 'Wait for Price Drop',
        color: 'text-amber-700 bg-amber-100 border-amber-300 shadow-amber-100',
        icon: <TrendingUp className="w-6 h-6" />,
        message: 'Prices are currently higher than usual. We recommend waiting for a sale.'
      };
    } else {
      return {
        status: 'Fair Price',
        color: 'text-indigo-700 bg-indigo-100 border-indigo-300 shadow-indigo-100',
        icon: <ShoppingCart className="w-6 h-6" />,
        message: 'The price is stable and close to the market average.'
      };
    }
  }, [lowestPriceEntry, averagePrice]);

  const overallAverage = useMemo(() => {
    if (!priceData?.history.length) return 0;
    const sum = priceData.history.reduce((acc, curr) => acc + curr.avg_price, 0);
    return sum / priceData.history.length;
  }, [priceData]);

  const priceChange = useMemo(() => {
    if (!priceData?.history.length || priceData.history.length < 2) return 0;
    const first = priceData.history[0].avg_price;
    const last = priceData.history[priceData.history.length - 1].avg_price;
    return ((last - first) / first) * 100;
  }, [priceData]);

  const handleSetAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          targetPrice: parseFloat(targetPrice),
          email: userEmail
        })
      });
      if (res.ok) {
        setAlertSuccess(true);
        setTimeout(() => {
          setAlertModalOpen(false);
          setAlertSuccess(false);
          setTargetPrice('');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-100">
              <TrendingDown className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">DealNow</h1>
            <p className="text-slate-500">Your personal shopping assistant</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="johndoe"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={authData.username}
                  onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="john@example.com"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={authData.password}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-2"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {selectedProduct ? (
            <button 
              onClick={() => { setSelectedProduct(null); setPriceData(null); }}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">DealNow</h1>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 hidden sm:block">Hi, {user.username}</span>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              title="Logout"
            >
              <ShoppingCart className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {view === 'wishlist' && !selectedProduct ? (
            <motion.div
              key="wishlist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">My Wishlist</h2>
                <p className="text-slate-500">Tracked products and price drops.</p>
              </div>

              {wishlist.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <HeartOff className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">Your wishlist is empty.</p>
                  <button 
                    onClick={() => setView('search')}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Start searching for products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {wishlist.map((item, idx) => {
                    const isPriceDrop = item.current_price < item.avg_price;
                    return (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -5, shadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                        className={cn(
                          "group relative bg-white border rounded-3xl overflow-hidden shadow-sm transition-all duration-300",
                          isPriceDrop ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-100"
                        )}
                      >
                        <div className="flex p-4 gap-4">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-50">
                            <img 
                              src={getProductImage(item)} 
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div 
                                className="cursor-pointer flex-1"
                                onClick={() => handleProductSelect(item)}
                              >
                                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{item.name}</h3>
                                <p className="text-xs text-slate-500">{item.category}</p>
                              </div>
                              <button 
                                onClick={() => handleRemoveFromWishlist(item.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-end justify-between mt-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-black text-slate-900">₹{item.current_price.toLocaleString()}</span>
                                  {isPriceDrop && (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                      <TrendingDown className="w-3 h-3" />
                                      Drop
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Market Avg</p>
                                <p className="text-xs font-semibold text-slate-600">₹{Math.round(item.avg_price).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : view === 'deals' && !selectedProduct ? (
            <motion.div
              key="deals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Best Deals</h2>
                <p className="text-slate-500">Top price drops across all categories.</p>
              </div>

              <div className="space-y-4">
                {deals.map((item, idx) => {
                  const dropAmount = item.avg_price - item.current_price;
                  const dropPercent = (dropAmount / item.avg_price) * 100;
                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                      className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-emerald-100 transition-all duration-300 flex items-center group relative"
                    >
                      <div 
                        className="flex-1 flex items-center cursor-pointer min-w-0"
                        onClick={() => handleProductSelect(item)}
                      >
                        <div className="w-24 h-24 bg-slate-50 flex-shrink-0 overflow-hidden">
                          <img 
                            src={getProductImage(item)} 
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">{item.name}</h3>
                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-lg shadow-emerald-200 animate-pulse">
                              {Math.abs(dropPercent).toFixed(0)}% OFF
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{item.category}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-slate-900">₹{item.current_price.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 line-through">₹{Math.round(item.avg_price).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pr-4 flex flex-col items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWishlist(item.id) ? handleRemoveFromWishlist(item.id) : handleAddToWishlist(item.id);
                          }}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isInWishlist(item.id) 
                              ? "text-rose-500 bg-rose-50" 
                              : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                          )}
                        >
                          <Heart className={cn("w-5 h-5", isInWishlist(item.id) && "fill-current")} />
                        </button>
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                          <TrendingDown className="text-emerald-600 w-5 h-5" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : view === 'alerts' && !selectedProduct ? (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Price Alerts</h2>
                <p className="text-slate-500">Manage your active price notifications.</p>
              </div>

              {userAlerts.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Bell className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">No active alerts.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userAlerts.map((alert) => (
                    <div key={alert.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900">{alert.product_name}</h3>
                          <p className="text-xs text-slate-500">Target: ₹{alert.target_price.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveAlert(alert.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monitoring</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">Current: ₹{alert.current_price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : !selectedProduct ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Find the best deals</h2>
                <p className="text-slate-500">Compare prices across Amazon, Flipkart, Myntra & more.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for products (e.g. iPhone 15)"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {searchResults.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="w-full flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-2xl hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300 text-left group relative"
                    >
                      <div 
                        className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                          <img 
                            src={getProductImage(product)} 
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{product.name}</h3>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            isInWishlist(product.id) ? handleRemoveFromWishlist(product.id) : handleAddToWishlist(product.id);
                          }}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isInWishlist(product.id) 
                              ? "text-rose-500 bg-rose-50" 
                              : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                          )}
                        >
                          <Heart className={cn("w-5 h-5", isInWishlist(product.id) && "fill-current")} />
                        </button>
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                      </div>
                    </motion.div>
                ))}
                {searchQuery.length > 1 && searchResults.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No products found matching "{searchQuery}"</p>
                  </div>
                )}
                {searchQuery.length <= 1 && (
                  <>
                    <div className="pt-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Popular Categories</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(categoryConfig).map(([cat, config], idx) => (
                        <motion.button 
                          key={cat} 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.05, y: -5, boxSharp: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCategoryClick(cat)}
                          className={cn(
                            "p-6 rounded-3xl text-white font-black text-lg shadow-lg flex flex-col items-center gap-3 transition-all relative overflow-hidden group",
                            config.color
                          )}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm relative z-10 group-hover:scale-110 transition-transform">
                            {config.icon}
                          </div>
                          <span className="relative z-10">{cat}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {deals.length > 0 && (
                    <div className="pt-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Trending Now</h3>
                        <button 
                          onClick={() => setView('deals')}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="space-y-3">
                        {deals.slice(0, 4).map((item, idx) => (
                          <motion.div 
                            key={`trending-${item.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 group relative"
                          >
                            <div 
                              className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                              onClick={() => handleProductSelect(item)}
                            >
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                                <img 
                                  src={getProductImage(item)} 
                                  alt={item.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-emerald-600">₹{item.current_price.toLocaleString()}</span>
                                  <span className="text-[10px] text-slate-400 line-through">₹{Math.round(item.avg_price).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                isInWishlist(item.id) ? handleRemoveFromWishlist(item.id) : handleAddToWishlist(item.id);
                              }}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                isInWishlist(item.id) 
                                  ? "text-rose-500 bg-rose-50" 
                                  : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                              )}
                            >
                              <Heart className={cn("w-4 h-4", isInWishlist(item.id) && "fill-current")} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium">Analyzing market prices...</p>
                </div>
              ) : priceData && (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="w-full aspect-square rounded-3xl overflow-hidden bg-white border border-slate-100 mb-4 shadow-sm">
                        <img 
                          src={getProductImage(selectedProduct)} 
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900">{selectedProduct.name}</h2>
                      <p className="text-slate-500 font-medium">{selectedProduct.category} • Market Analysis</p>
                    </div>
                    <button 
                      onClick={() => isInWishlist(selectedProduct.id) ? handleRemoveFromWishlist(selectedProduct.id) : handleAddToWishlist(selectedProduct.id)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all",
                        isInWishlist(selectedProduct.id) 
                          ? "bg-rose-50 border-rose-200 text-rose-500" 
                          : "bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200"
                      )}
                    >
                      <Heart className={cn("w-6 h-6", isInWishlist(selectedProduct.id) && "fill-current")} />
                    </button>
                  </div>

                  {/* Recommendation Card */}
                  {recommendation && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn("p-5 rounded-3xl border-2 flex gap-4 items-start shadow-lg", recommendation.color)}
                    >
                      <div className="mt-1 p-2 bg-white/50 rounded-xl backdrop-blur-sm">{recommendation.icon}</div>
                      <div>
                        <h4 className="font-black text-xl uppercase tracking-tight">{recommendation.status}</h4>
                        <p className="text-sm font-medium opacity-90">{recommendation.message}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Price Trend Graph */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Price Trend (30 Days)</h3>
                      <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        priceChange < 0 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {priceChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        <span>{priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceData.history}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            hide 
                          />
                          <YAxis 
                            hide 
                            domain={['dataMin - 1000', 'dataMax + 1000']} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <ReferenceLine 
                            y={overallAverage} 
                            stroke="#94a3b8" 
                            strokeDasharray="3 3" 
                            label={{ 
                              value: 'Avg', 
                              position: 'right', 
                              fill: '#94a3b8', 
                              fontSize: 10,
                              fontWeight: 'bold'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="avg_price" 
                            stroke="#4f46e5" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Platforms List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Compare Platforms</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Prices</span>
                    </div>
                    {priceData.latestPrices.map((entry) => {
                      const isLowest = entry.id === lowestPriceEntry?.id;
                      const platformUrl = `https://www.${entry.platform.toLowerCase()}.com/search?q=${encodeURIComponent(selectedProduct.name)}`;
                      
                      return (
                        <div 
                          key={entry.id}
                          className={cn(
                            "group relative flex items-center justify-between p-4 bg-white border rounded-2xl transition-all duration-300",
                            isLowest 
                              ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl shadow-indigo-500/10 scale-[1.02]" 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          {isLowest && (
                            <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full shadow-lg z-10 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Best Deal
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors",
                              isLowest ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
                            )}>
                              {entry.platform[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{entry.platform}</h4>
                              <p className="text-xs text-slate-400 font-medium">In Stock</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <p className={cn(
                                "text-xl font-black",
                                isLowest ? "text-indigo-600" : "text-slate-900"
                              )}>
                                ₹{entry.price.toLocaleString()}
                              </p>
                            </div>
                            <button 
                              onClick={() => window.open(platformUrl, '_blank', 'noopener,noreferrer')}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95",
                                isLowest 
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200" 
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Alert Button */}
                  <button 
                    onClick={() => setAlertModalOpen(true)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                  >
                    <Bell className="w-5 h-5" />
                    Set Price Alert
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Alert Modal */}
      <AnimatePresence>
        {alertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 sm:hidden" />
              
              {alertSuccess ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold">Alert Set Successfully!</h3>
                  <p className="text-slate-500">We'll notify you as soon as the price drops below ₹{targetPrice}.</p>
                </div>
              ) : (
                <form onSubmit={handleSetAlert} className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Set Price Alert</h3>
                    <p className="text-slate-500 text-sm">Get notified when {selectedProduct?.name} hits your target price.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Target Price (₹)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="e.g. 75000"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Your Email</label>
                      <input 
                        type="email" 
                        required
                        placeholder="alex@example.com"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setAlertModalOpen(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-2 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                      Notify Me
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      {!selectedProduct && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <button 
              onClick={() => setView('search')}
              className={cn("flex flex-col items-center gap-1 transition-colors", view === 'search' ? "text-indigo-600" : "text-slate-400")}
            >
              <Search className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Search</span>
            </button>
            <button 
              onClick={() => setView('deals')}
              className={cn("flex flex-col items-center gap-1 transition-colors", view === 'deals' ? "text-emerald-600" : "text-slate-400")}
            >
              <TrendingDown className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Deals</span>
            </button>
            <button 
              onClick={() => setView('wishlist')}
              className={cn("flex flex-col items-center gap-1 transition-colors", view === 'wishlist' ? "text-rose-500" : "text-slate-400")}
            >
              <Heart className={cn("w-6 h-6", view === 'wishlist' && "fill-current")} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Wishlist</span>
            </button>
            <button 
              onClick={() => setView('alerts')}
              className={cn("flex flex-col items-center gap-1 transition-colors", view === 'alerts' ? "text-amber-600" : "text-slate-400")}
            >
              <Bell className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Alerts</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
