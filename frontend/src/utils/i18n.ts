import { useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'sw' | 'pt';

export interface Translations {
  // Navigation
  home: string;
  chat: string;
  dashboard: string;
  escrows: string;
  settings: string;

  // Common
  connect: string;
  disconnect: string;
  cancel: string;
  confirm: string;
  send: string;
  loading: string;
  error: string;
  success: string;
  balance: string;
  amount: string;
  recipient: string;

  // Chat
  chatWelcome: string;
  chatPlaceholder: string;
  aiTyping: string;
  sendPayment: string;
  createEscrow: string;
  viewEscrows: string;
  transactionHistory: string;

  // Payment
  paymentSuccessful: string;
  paymentFailed: string;
  insufficientBalance: string;
  approvalRequired: string;
  confirmPayment: string;
  platformFee: string;

  // Escrow
  milestones: string;
  totalAmount: string;
  releasedAmount: string;
  releaseMilestone: string;
  cancelEscrow: string;

  // Dashboard
  totalSent: string;
  totalSaved: string;
  paymentCount: string;
  recentPayments: string;

  // Errors
  walletNotConnected: string;
  transactionFailed: string;
  networkError: string;

  // Export
  exportCSV: string;
  exportPDF: string;
  analytics: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    home: 'Home',
    chat: 'Chat',
    dashboard: 'Dashboard',
    escrows: 'Escrows',
    settings: 'Settings',

    // Common
    connect: 'Connect Wallet',
    disconnect: 'Disconnect',
    cancel: 'Cancel',
    confirm: 'Confirm',
    send: 'Send',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    balance: 'Balance',
    amount: 'Amount',
    recipient: 'Recipient',

    // Chat
    chatWelcome: 'Welcome to AfriFlow! I\'m your AI payment assistant.',
    chatPlaceholder: 'Tell me what you\'d like to do...',
    aiTyping: 'AfriFlow AI is typing',
    sendPayment: 'Send Payment',
    createEscrow: 'Create Escrow',
    viewEscrows: 'View Escrows',
    transactionHistory: 'Transaction History',

    // Payment
    paymentSuccessful: 'Payment Successful!',
    paymentFailed: 'Payment Failed',
    insufficientBalance: 'Insufficient Balance',
    approvalRequired: 'Approval Required',
    confirmPayment: 'Confirm Payment',
    platformFee: 'Only 0.1% platform fee',

    // Escrow
    milestones: 'Milestones',
    totalAmount: 'Total Amount',
    releasedAmount: 'Released Amount',
    releaseMilestone: 'Release Milestone',
    cancelEscrow: 'Cancel Escrow',

    // Dashboard
    totalSent: 'Total Sent',
    totalSaved: 'Total Saved',
    paymentCount: 'Payments',
    recentPayments: 'Recent Payments',

    // Errors
    walletNotConnected: 'Please connect your wallet',
    transactionFailed: 'Transaction failed. Please try again.',
    networkError: 'Network error. Please check your connection.',

    // Export
    exportCSV: 'Export CSV',
    exportPDF: 'Export PDF',
    analytics: 'Analytics',
  },

  fr: {
    // Navigation
    home: 'Accueil',
    chat: 'Chat',
    dashboard: 'Tableau de bord',
    escrows: 'Séquestres',
    settings: 'Paramètres',

    // Common
    connect: 'Connecter le portefeuille',
    disconnect: 'Déconnecter',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    send: 'Envoyer',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    balance: 'Solde',
    amount: 'Montant',
    recipient: 'Destinataire',

    // Chat
    chatWelcome: 'Bienvenue sur AfriFlow ! Je suis votre assistant de paiement IA.',
    chatPlaceholder: 'Dites-moi ce que vous aimeriez faire...',
    aiTyping: 'AfriFlow IA tape',
    sendPayment: 'Envoyer un paiement',
    createEscrow: 'Créer un séquestre',
    viewEscrows: 'Voir les séquestres',
    transactionHistory: 'Historique des transactions',

    // Payment
    paymentSuccessful: 'Paiement réussi !',
    paymentFailed: 'Échec du paiement',
    insufficientBalance: 'Solde insuffisant',
    approvalRequired: 'Approbation requise',
    confirmPayment: 'Confirmer le paiement',
    platformFee: 'Seulement 0,1% de frais de plateforme',

    // Escrow
    milestones: 'Jalons',
    totalAmount: 'Montant total',
    releasedAmount: 'Montant libéré',
    releaseMilestone: 'Libérer le jalon',
    cancelEscrow: 'Annuler le séquestre',

    // Dashboard
    totalSent: 'Total envoyé',
    totalSaved: 'Total économisé',
    paymentCount: 'Paiements',
    recentPayments: 'Paiements récents',

    // Errors
    walletNotConnected: 'Veuillez connecter votre portefeuille',
    transactionFailed: 'Transaction échouée. Veuillez réessayer.',
    networkError: 'Erreur réseau. Vérifiez votre connexion.',

    // Export
    exportCSV: 'Exporter CSV',
    exportPDF: 'Exporter PDF',
    analytics: 'Analytique',
  },

  sw: {
    // Navigation
    home: 'Nyumbani',
    chat: 'Mazungumzo',
    dashboard: 'Dashibodi',
    escrows: 'Escrows',
    settings: 'Mipangilio',

    // Common
    connect: 'Unganisha Pochi',
    disconnect: 'Tenganisha',
    cancel: 'Ghairi',
    confirm: 'Thibitisha',
    send: 'Tuma',
    loading: 'Inapakia...',
    error: 'Kosa',
    success: 'Mafanikio',
    balance: 'Salio',
    amount: 'Kiasi',
    recipient: 'Mpokeaji',

    // Chat
    chatWelcome: 'Karibu AfriFlow! Mimi ni msaidizi wako wa malipo wa AI.',
    chatPlaceholder: 'Niambie unachotaka kufanya...',
    aiTyping: 'AfriFlow AI inaandika',
    sendPayment: 'Tuma Malipo',
    createEscrow: 'Unda Escrow',
    viewEscrows: 'Angalia Escrows',
    transactionHistory: 'Historia ya Miamala',

    // Payment
    paymentSuccessful: 'Malipo Yamefanikiwa!',
    paymentFailed: 'Malipo Yameshindwa',
    insufficientBalance: 'Salio Haitoshi',
    approvalRequired: 'Idhini Inahitajika',
    confirmPayment: 'Thibitisha Malipo',
    platformFee: 'Ada ya jukwaa 0.1% tu',

    // Escrow
    milestones: 'Hatua Muhimu',
    totalAmount: 'Jumla',
    releasedAmount: 'Kiasi Kilichotolewa',
    releaseMilestone: 'Toa Hatua',
    cancelEscrow: 'Ghairi Escrow',

    // Dashboard
    totalSent: 'Jumla Iliyotumwa',
    totalSaved: 'Jumla Iliyookoka',
    paymentCount: 'Malipo',
    recentPayments: 'Malipo ya Hivi Karibuni',

    // Errors
    walletNotConnected: 'Tafadhali unganisha pochi yako',
    transactionFailed: 'Muamala umeshindwa. Tafadhali jaribu tena.',
    networkError: 'Kosa la mtandao. Angalia muunganisho wako.',

    // Export
    exportCSV: 'Hamisha CSV',
    exportPDF: 'Hamisha PDF',
    analytics: 'Uchanganuzi',
  },

  pt: {
    // Navigation
    home: 'Início',
    chat: 'Chat',
    dashboard: 'Painel',
    escrows: 'Cauções',
    settings: 'Configurações',

    // Common
    connect: 'Conectar Carteira',
    disconnect: 'Desconectar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    send: 'Enviar',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    balance: 'Saldo',
    amount: 'Quantia',
    recipient: 'Destinatário',

    // Chat
    chatWelcome: 'Bem-vindo ao AfriFlow! Sou seu assistente de pagamento com IA.',
    chatPlaceholder: 'Diga-me o que você gostaria de fazer...',
    aiTyping: 'AfriFlow IA está digitando',
    sendPayment: 'Enviar Pagamento',
    createEscrow: 'Criar Caução',
    viewEscrows: 'Ver Cauções',
    transactionHistory: 'Histórico de Transações',

    // Payment
    paymentSuccessful: 'Pagamento Bem-sucedido!',
    paymentFailed: 'Falha no Pagamento',
    insufficientBalance: 'Saldo Insuficiente',
    approvalRequired: 'Aprovação Necessária',
    confirmPayment: 'Confirmar Pagamento',
    platformFee: 'Apenas 0,1% de taxa da plataforma',

    // Escrow
    milestones: 'Marcos',
    totalAmount: 'Quantia Total',
    releasedAmount: 'Quantia Liberada',
    releaseMilestone: 'Liberar Marco',
    cancelEscrow: 'Cancelar Caução',

    // Dashboard
    totalSent: 'Total Enviado',
    totalSaved: 'Total Economizado',
    paymentCount: 'Pagamentos',
    recentPayments: 'Pagamentos Recentes',

    // Errors
    walletNotConnected: 'Por favor, conecte sua carteira',
    transactionFailed: 'Transação falhou. Por favor, tente novamente.',
    networkError: 'Erro de rede. Verifique sua conexão.',

    // Export
    exportCSV: 'Exportar CSV',
    exportPDF: 'Exportar PDF',
    analytics: 'Análises',
  },
};

/**
 * Language Context and Hook
 */
class I18nManager {
  private currentLanguage: Language = 'en';
  private listeners: Array<() => void> = [];

  constructor() {
    // Load saved language from localStorage
    const saved = localStorage.getItem('afriflow_language') as Language;
    if (saved && translations[saved]) {
      this.currentLanguage = saved;
    }
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  setLanguage(language: Language) {
    if (translations[language]) {
      this.currentLanguage = language;
      localStorage.setItem('afriflow_language', language);
      this.notifyListeners();
    }
  }

  getTranslations(): Translations {
    return translations[this.currentLanguage];
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }
}

export const i18n = new I18nManager();

/**
 * React hook for translations
 */
export function useTranslation() {
  const [, forceUpdate] = useState({});

  // Subscribe to language changes
  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  return {
    t: i18n.getTranslations(),
    language: i18n.getLanguage(),
    setLanguage: (lang: Language) => i18n.setLanguage(lang),
  };
}

// Also export for non-React usage
export const t = () => i18n.getTranslations();
export const setLanguage = (lang: Language) => i18n.setLanguage(lang);
export const getLanguage = () => i18n.getLanguage();
