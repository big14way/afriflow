import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  LayoutDashboard,
  FileText,
  Wallet,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { useWalletStore } from '../hooks/useWallet';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Home', icon: Globe },
  { path: '/chat', label: 'Send Money', icon: MessageSquare },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/escrows', label: 'Escrows', icon: FileText },
];

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { address, isConnected, connect, disconnect } = useWalletStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Ambient background */}
      <div className="fixed inset-0 bg-mesh-gradient opacity-50 dark:opacity-20 pointer-events-none" />
      
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 dark:shadow-slate-900/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-afri-500 to-afri-600 flex items-center justify-center shadow-lg shadow-afri-500/30 group-hover:shadow-afri-500/50 transition-shadow">
                  <span className="text-white font-display font-bold text-lg">A</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-prosperity-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                  AfriFlow
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">
                  Payments for Africa
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? 'text-afri-600 dark:text-afri-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-afri-500/10 dark:bg-afri-500/20 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-slate-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-600" />
                )}
              </button>

              {/* Wallet connection */}
              {isConnected ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 bg-prosperity-500/10 dark:bg-prosperity-500/20 text-prosperity-600 dark:text-prosperity-400 rounded-xl font-medium text-sm hover:bg-prosperity-500/20 dark:hover:bg-prosperity-500/30 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-prosperity-500 animate-pulse" />
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">{truncateAddress(address!)}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={disconnect}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="btn-primary text-sm py-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="px-4 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                        isActive
                          ? 'bg-afri-500/10 text-afri-600 dark:text-afri-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main content */}
      <main className="relative pt-16 lg:pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative mt-20 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-afri-500 to-afri-600 flex items-center justify-center">
                  <span className="text-white font-display font-bold text-lg">A</span>
                </div>
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  AfriFlow
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Building the financial infrastructure Africa deserves.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li><Link to="/chat" className="hover:text-afri-500">Send Money</Link></li>
                <li><Link to="/escrows" className="hover:text-afri-500">Escrow</Link></li>
                <li><a href="#" className="hover:text-afri-500">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Corridors</h4>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li>🇳🇬 Nigeria</li>
                <li>🇰🇪 Kenya</li>
                <li>🇿🇦 South Africa</li>
                <li>🇬🇭 Ghana</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Built With</h4>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li>⚡ Cronos x402</li>
                <li>🤖 Crypto.com AI SDK</li>
                <li>🔗 Cronos EVM</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © 2025 AfriFlow. Built for Cronos x402 Paytech Hackathon.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-afri-500 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-afri-500 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
