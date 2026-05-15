import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Shield, Lock, Eye, CreditCard, QrCode, ArrowRight, Timer } from 'lucide-react';
import { io } from 'socket.io-client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeUsers, setActiveUsers] = useState<number>(12);
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [formData, setFormData] = useState({ contact: '' });
  const [telegramLink, setTelegramLink] = useState('');
  const [timeLeft, setTimeLeft] = useState(2 * 3600 + 45 * 60 + 12); // Initial time 02:45:12
  const [discountTimeLeft, setDiscountTimeLeft] = useState(10 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
      setDiscountTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMinSec = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Only connect socket if running in browser
    if (typeof window !== 'undefined') {
      const socket = io();
      socket.on('active_users', (count: number) => {
        setActiveUsers(count);
      });
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) return;

    setStep('processing');
    
    // Simulate real API call to our backend
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, paymentMethod })
      });
      const data = await res.json();
      if (data.success) {
        setTelegramLink(data.link);
        setStep('success');
      }
    } catch (err) {
      console.error(err);
      setStep('checkout'); // Silent fail for prototype
    }
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] bg-[#050505] text-[#e5e7eb] font-sans selection:bg-red-600 selection:text-white flex flex-col overflow-y-auto no-scrollbar lg:overflow-hidden">
      {/* Top Header matching Elegant Dark */}
      <header className="hidden sm:flex w-full py-6 px-6 lg:px-12 border-b border-white/5 justify-between items-center bg-[#080808]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.4em] font-medium text-zinc-400 uppercase">Acesso VIP</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest border border-zinc-800 px-2 py-1">Acesso Privado</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row w-full lg:overflow-hidden">
        
        {/* Left Column / Header Content */}
        <div className="w-full lg:w-1/2 px-4 pt-6 pb-2 sm:p-8 lg:p-16 flex flex-col justify-center relative shrink-0">
          <div className="hidden lg:block absolute top-20 left-0 w-64 h-64 bg-red-900/10 rounded-full blur-[100px]"></div>
          
          <header className="text-left w-full flex flex-col items-center sm:items-start relative text-center sm:text-left">
            <div className="hidden sm:flex w-12 h-12 lg:w-16 lg:h-16 rounded-full overflow-hidden mb-4 lg:mb-6 border border-zinc-800 shadow-[0_0_20px_rgba(220,38,38,0.15)] items-center justify-center bg-[#0c0c0c]">
              <span className="text-red-600 font-sans font-bold italic text-lg lg:text-xl">M</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-light tracking-tight leading-tight mb-1 sm:mb-4">
              Entre para o meu <br className="hidden lg:block" /><span className="font-medium italic text-red-600">VIP exclusivo</span> <br className="hidden lg:block" />no Telegram
            </h1>
            <p className="hidden sm:block text-zinc-400 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md mt-2">
              Conteúdos exclusivos, bastidores e fotos que não publico em nenhum outro lugar.
            </p>

            <div className="inline-flex items-center justify-center space-x-2 border border-red-600/20 bg-red-600/5 rounded-full px-3 lg:px-4 py-1.5 lg:py-2 mt-3 sm:mt-6 lg:mt-8">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[10px] lg:text-[10px] sm:text-xs uppercase tracking-widest font-bold text-red-600">
                {activeUsers} PESSOAS NA PÁGINA AGORA
              </span>
            </div>
            
            <div className="hidden sm:flex pt-6 lg:pt-8 flex-wrap items-center gap-2">
              <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Verificado 18+</span>
              <span className="text-[10px] lg:text-[11px] text-zinc-500 uppercase tracking-widest">Ao assinar você confirma sua maioridade</span>
            </div>

            <div className="mt-12 w-full max-w-md hidden sm:block">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Membros VIP</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Lucas M.", text: "Melhor investimento. Os conteúdos de bastidores são incríveis e a atualização é quase todo dia." },
                  { name: "Rafael T.", text: "Sensacional! As mídias +18 são absurdas e o grupo é muito bem organizado. Recomendo demais!" },
                ].map((testimonial, i) => (
                  <div key={i} className="bg-zinc-900/20 border border-zinc-800/50 p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                          <span className="text-[10px] font-bold text-zinc-500">{testimonial.name.charAt(0)}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-300">{testimonial.name}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg key={star} className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 font-light italic leading-relaxed">"{testimonial.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </header>
        </div>

        {/* Right Column / Interaction Area */}
        <div className="w-full lg:w-1/2 px-4 py-2 sm:py-8 lg:p-12 flex items-start lg:items-center justify-center sm:bg-[#080808] border-t lg:border-t-0 lg:border-l border-white/5 lg:overflow-y-auto no-scrollbar">
          <div className="w-full max-w-[420px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {step === 'checkout' && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3 sm:space-y-6"
                >
                  {/* Product Card / Form Container */}
                  <div className="bg-[#0c0c0c] border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl relative w-full mt-2 sm:mt-0">
                    <AnimatePresence mode="wait">
                      {discountTimeLeft > 0 ? (
                        <motion.div
                          key="discount"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold uppercase px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg shadow-red-900/20 flex items-center gap-2"
                        >
                          <Timer className="w-3 h-3" />
                          <span>20% de desconto em {formatMinSec(discountTimeLeft)}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="standard"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] sm:text-[10px] font-bold uppercase px-4 py-1 rounded-full whitespace-nowrap"
                        >
                          Acesso Liberado Automaticamente
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="text-center mb-4 sm:mb-8 pt-4">
                      {discountTimeLeft > 0 && (
                        <div className="text-red-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1 sm:mb-2 animate-pulse">
                          Garanta seu desconto agora!
                        </div>
                      )}
                      <h2 className="text-zinc-400 uppercase text-[10px] tracking-widest mb-0 sm:mb-1">Acesso VIP Telegram</h2>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg sm:text-2xl font-light text-zinc-500">R$</span>
                        <span className="text-3xl sm:text-5xl font-medium tracking-tighter text-white">19,90</span>
                        <span className="text-[10px] sm:text-sm font-light text-zinc-500 ml-1">/mês</span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 sm:space-y-4 mb-4 sm:mb-8">
                      {[
                        "Acesso imediato após o pagamento",
                        "Conteúdo exclusivo +18",
                        "+500 mídias das modelos mais famosas",
                        "Grupo privado no Telegram",
                      ].map((benefit, i) => (
                        <li key={i} className="flex items-center text-[10px] sm:text-sm font-medium text-zinc-300 leading-tight">
                          <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-600 mr-2 sm:mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    {/* Checkout Form */}
                    <form onSubmit={handleCheckout} className="space-y-3 sm:space-y-5">
                      
                      <div className="space-y-2 sm:space-y-4">
                        <div className="space-y-1 text-center sm:text-left">
                          <label className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-500 ml-1 leading-tight block">
                            Contato Telegram/WhatsApp <span className="normal-case italic tracking-normal text-zinc-400 hidden sm:inline">(somente para mandar o link 🔞)</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.contact}
                            onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            placeholder="@usuario ou (00) 00000-0000"
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-600/50 transition-colors placeholder:text-zinc-600 text-center sm:text-left"
                          />
                        </div>
                      </div>

                      {/* Payment Methods */}
                      <div className="pt-1 sm:pt-2">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('pix')}
                            className={cn(
                              "flex items-center justify-center gap-2 py-2 sm:py-3.5 rounded-lg sm:rounded-xl transition-all border",
                              paymentMethod === 'pix' 
                                ? "bg-red-600/10 border-red-600 text-white" 
                                : "bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                            )}
                          >
                            <QrCode className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", paymentMethod === 'pix' ? "text-red-600" : "")} />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Pix</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('credit')}
                            className={cn(
                              "flex items-center justify-center gap-2 py-2 sm:py-3.5 rounded-lg sm:rounded-xl transition-all border",
                              paymentMethod === 'credit' 
                                ? "bg-red-600/10 border-red-600 text-white" 
                                : "bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                            )}
                          >
                            <CreditCard className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", paymentMethod === 'credit' ? "text-red-600" : "")} />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Cartão</span>
                          </button>
                        </div>
                      </div>

                      {/* 18+ Checkbox */}
                      <label className="flex items-center justify-center sm:justify-start cursor-pointer group mt-1 sm:mt-2 py-1 sm:py-2 px-1">
                        <div className={cn(
                          "w-4 h-4 sm:w-4 sm:h-4 border rounded mt-0 flex flex-shrink-0 items-center justify-center transition-colors",
                          ageConfirmed ? "bg-red-600 border-red-600" : "border-zinc-700 bg-zinc-900/50 group-hover:border-zinc-500"
                        )}>
                          {ageConfirmed && <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={ageConfirmed}
                          onChange={(e) => setAgeConfirmed(e.target.checked)}
                        />
                        <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs font-medium leading-tight text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          Confirmar maioridade (18+ anos)
                        </span>
                      </label>

                      {/* Submit Area */}
                      <div className="pt-1 sm:pt-2">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-4 bg-red-900/10 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border border-red-900/20">
                          <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                          <span className="text-[9px] sm:text-xs font-bold text-red-500 uppercase tracking-widest">
                            {discountTimeLeft > 0 
                              ? `Oferta encerra em: ${formatTime(timeLeft)}` 
                              : "Vagas quase esgotadas"}
                          </span>
                        </div>
                        <button
                          type="submit"
                          disabled={!ageConfirmed || !formData.contact}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 sm:py-4 rounded-lg sm:rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center uppercase tracking-widest sm:tracking-[0.2em] text-[11px] sm:text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Liberar meu acesso agora
                        </button>
                        
                        <p className="text-center text-[9px] sm:text-[10px] text-zinc-500 leading-tight px-1 sm:px-4 mt-2 sm:mt-4">
                          Após a confirmação do pagamento, você receberá o link privado do grupo automaticamente.
                        </p>
                      </div>
                    </form>
                  </div>
                  
                  {/* Trust Badges below card */}
                  <div className="flex justify-center gap-4 mt-3 sm:mt-6">
                    <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest leading-snug">
                      <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-600 flex-shrink-0" />
                      Compra segura
                    </div>
                    <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest leading-snug">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-600 flex-shrink-0" />
                      Acesso pessoal
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-[420px] bg-[#0c0c0c] border border-zinc-800 rounded-3xl p-12 shadow-2xl flex flex-col items-center justify-center text-center mx-auto"
                >
                  <div className="w-12 h-12 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin mb-6" />
                  <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Processando...</h2>
                  <p className="text-zinc-500 text-sm">Validando pagamento de forma segura.</p>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[420px] space-y-6 mx-auto"
                >
                  <div className="bg-[#0c0c0c] border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-600/10 border border-red-600/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(220,38,38,0.2)]">
                      <Check className="w-8 h-8 text-red-600" />
                    </div>
                    
                    <div className="space-y-3 mb-8">
                      <h2 className="text-2xl font-light text-white">Pagamento Aprovado</h2>
                      <p className="text-zinc-400 text-sm leading-relaxed max-w-[240px] mx-auto">
                        Seu acesso VIP foi liberado com sucesso. Tudo pronto para você entrar!
                      </p>
                    </div>

                    <div className="w-full space-y-4">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Seu Acesso Único</p>
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-[#0088cc] hover:bg-[#0099e6] text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-[#0088cc]/20 uppercase tracking-widest text-sm"
                      >
                        Entrar no VIP (Telegram)
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                      
                      <div className="pt-6 mt-4 border-t border-zinc-800 text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider italic">
                        Link pessoal vinculado ao e-mail. Não compartilhe com terceiros.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="hidden sm:flex w-full py-4 px-6 lg:px-12 border-t border-white/5 bg-[#050505] flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800 rounded flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-zinc-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Pagamento 100% Seguro</span>
          </div>
        </div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-widest italic">
          Acesso individual e intransferível • Proibido compartilhamento
        </div>
      </footer>
    </div>
  );
}
