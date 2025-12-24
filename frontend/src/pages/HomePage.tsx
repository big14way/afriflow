import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Shield,
  Globe,
  TrendingDown,
  Clock,
  Users,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

const stats = [
  { value: '0.1%', label: 'Transaction Fees', icon: TrendingDown },
  { value: '<1s', label: 'Settlement Time', icon: Clock },
  { value: '10+', label: 'African Countries', icon: Globe },
  { value: '24/7', label: 'AI Support', icon: MessageSquare },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Natural Language Payments',
    description: 'Just tell AfriFlow what you want: "Send $500 to my supplier in Lagos" and let AI handle the rest.',
    color: 'from-afri-500 to-afri-600',
  },
  {
    icon: Zap,
    title: 'Instant Settlement',
    description: 'Powered by Cronos x402 rails, your payments settle in under 1 second. No more waiting days.',
    color: 'from-ocean-500 to-ocean-600',
  },
  {
    icon: Shield,
    title: 'Smart Escrow',
    description: 'Protect B2B transactions with milestone-based escrow. Release payments as work gets done.',
    color: 'from-prosperity-500 to-prosperity-600',
  },
  {
    icon: Globe,
    title: 'Pan-African Coverage',
    description: 'Send money to Nigeria, Kenya, Ghana, South Africa, and more. All major corridors supported.',
    color: 'from-purple-500 to-purple-600',
  },
];

const corridors = [
  { flag: '🇳🇬', name: 'Nigeria', code: 'NGN' },
  { flag: '🇰🇪', name: 'Kenya', code: 'KES' },
  { flag: '🇿🇦', name: 'South Africa', code: 'ZAR' },
  { flag: '🇬🇭', name: 'Ghana', code: 'GHS' },
  { flag: '🇹🇿', name: 'Tanzania', code: 'TZS' },
  { flag: '🇺🇬', name: 'Uganda', code: 'UGX' },
  { flag: '🇪🇬', name: 'Egypt', code: 'EGP' },
  { flag: '🇲🇦', name: 'Morocco', code: 'MAD' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background elements */}
        <div className="absolute inset-0 african-pattern opacity-30 dark:opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-afri-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ocean-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-afri-500/10 dark:bg-afri-500/20 border border-afri-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-afri-500" />
              <span className="text-sm font-medium text-afri-600 dark:text-afri-400">
                Built for Cronos x402 Paytech Hackathon
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-slate-900 dark:text-white mb-6 text-balance"
            >
              AI-Powered Payments
              <br />
              <span className="gradient-text">For Africa</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 text-balance"
            >
              Send money across Africa instantly. Just tell our AI what you need—
              it handles currency conversion, routing, and settlement on Cronos.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/chat" className="btn-primary text-lg px-8 py-4">
                <MessageSquare className="w-5 h-5" />
                Start Sending Money
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#how-it-works" className="btn-secondary text-lg px-8 py-4">
                See How It Works
              </a>
            </motion.div>

            {/* Demo preview */}
            <motion.div
              variants={itemVariants}
              className="mt-16 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent z-10 h-1/3 bottom-0 top-auto" />
              <div className="glass rounded-3xl p-2 shadow-2xl shadow-slate-300/50 dark:shadow-slate-900/50 max-w-4xl mx-auto">
                <div className="bg-slate-900 rounded-2xl p-6 text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-sm text-slate-500">AfriFlow Chat</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-afri-500 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-sm">
                        Send $500 to my supplier in Lagos, release half now and half when they ship
                      </div>
                    </div>
                    <div className="flex">
                      <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-md">
                        <p className="mb-2">📋 <strong>Escrow Payment Created</strong></p>
                        <p className="text-sm text-slate-400">
                          💰 Total: $500 USD<br />
                          📍 To: Lagos, Nigeria<br />
                          📌 Milestone 1: $250 (Release now)<br />
                          📌 Milestone 2: $250 (On shipping)<br />
                          💸 Fee: $0.50 (0.1%)
                        </p>
                        <p className="mt-2 text-prosperity-400">⚡ Settlement: Instant via Cronos x402</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 bg-slate-900 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-afri-500/20 mb-4">
                  <stat.icon className="w-6 h-6 text-afri-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-4">
              Built for the Way Africa Moves Money
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              AfriFlow combines AI intelligence with blockchain speed to make cross-border
              payments as easy as sending a text message.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card p-8 group hover:border-afri-500/30"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-display font-semibold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Corridors Section */}
      <section className="relative py-24 bg-slate-100 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-4">
              Supported Corridors
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Send money across Africa and beyond with instant settlement
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {corridors.map((corridor, index) => (
              <motion.div
                key={corridor.code}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="card-interactive p-6 text-center"
              >
                <span className="text-4xl mb-3 block">{corridor.flag}</span>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {corridor.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {corridor.code}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8 text-slate-600 dark:text-slate-400"
          >
            + International corridors: 🇺🇸 USA • 🇬🇧 UK • 🇪🇺 EU • 🇦🇪 UAE • 🇨🇳 China
          </motion.p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-afri-500 to-afri-700 p-12 text-center shadow-2xl shadow-afri-500/30"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 african-pattern opacity-10" />
            
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
                Ready to Transform How You Send Money?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Join thousands of Africans who are already saving on fees and time
                with AfriFlow's AI-powered payment agent.
              </p>
              <Link to="/chat" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-afri-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-lg">
                <MessageSquare className="w-5 h-5" />
                Try AfriFlow Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
