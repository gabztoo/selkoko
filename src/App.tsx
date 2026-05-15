import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Shield, Lock, QrCode, ArrowRight, Timer } from 'lucide-react';
import { io } from 'socket.io-client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeUsers, setActiveUsers] = useState<number>(12);
  const [step, setStep] = useState<'checkout' | 'processing' | 'success' | 'pending' | 'failed'>('checkout');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [formData, setFormData] = useState({ contact: '' });
  const [telegramLink, setTelegramLink] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [timeLeft, setTimeLeft] = useState(2 * 3600 + 45 * 60 + 12); // Initial time 02:45:12
  const [discountTimeLeft, setDiscountTimeLeft] = useState(10 * 60);
  const [showMobileStickyCta, setShowMobileStickyCta] = useState(true);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const link = params.get('link');
    const checkoutFromQuery = params.get('checkout_id');
    const checkoutFromStorage = window.localStorage.getItem('lastCheckoutId');
    const checkout = checkoutFromQuery || checkoutFromStorage;

    if (checkout) setCheckoutId(checkout);
    if (link) setTelegramLink(link);
    if (payment === 'approved') setStep('pending');
    if (payment === 'pending') setStep('pending');
    if (payment === 'failed') setStep('failed');
  }, []);

  useEffect(() => {
    if (step !== 'pending' || !checkoutId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout-status/${checkoutId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') {
          if (data.link) setTelegramLink(data.link);
          window.localStorage.removeItem('lastCheckoutId');
          setStep('success');
        } else if (data.status === 'failed') {
          window.localStorage.removeItem('lastCheckoutId');
          setStep('failed');
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [step, checkoutId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !submitButtonRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMobileStickyCta(!entry.isIntersecting);
      },
      { threshold: 0.35 }
    );
    observer.observe(submitButtonRef.current);
    return () => observer.disconnect();
  }, [step]);

  const handleStickyCtaClick = () => {
    contactInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => contactInputRef.current?.focus(), 250);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) return;

    setStep('processing');

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, paymentMethod: 'pix' }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Checkout request failed: ${res.status}`);
      }
      const data = await res.json().catch(() => null);
      if (data.success && data.redirectUrl) {
        if (data.checkoutId) {
          window.localStorage.setItem('lastCheckoutId', String(data.checkoutId));
        }
        window.location.assign(data.redirectUrl);
        return;
      }
      throw new Error('Checkout response missing redirectUrl');
    } catch (err) {
      console.error(err);
      setStep('failed');
    }
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] bg-white text-zinc-900 font-sans selection:bg-[#0088cc] selection:text-white flex flex-col overflow-y-auto no-scrollbar lg:overflow-hidden">
      {/* Top Header matching Elegant Dark */}
      <header className="hidden sm:flex w-full py-6 px-6 lg:px-12 border-b border-zinc-100 justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#0088cc] rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.4em] font-medium text-zinc-500 uppercase">Acesso VIP</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest border border-zinc-200 px-2 py-1">Acesso Privado</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row w-full lg:overflow-hidden">

        {/* Left Column / Header Content */}
        <div className="w-full lg:w-1/2 px-4 pt-6 pb-2 sm:p-8 lg:px-16 lg:py-10 flex flex-col justify-center relative shrink-0">
          <div className="hidden lg:block absolute top-20 left-0 w-64 h-64 bg-[#0088cc]/10 rounded-full blur-[100px]"></div>

          <header className="w-full flex flex-col items-center relative text-center">
            <div className="flex items-center justify-center mb-3 sm:mb-6">
              <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-2 border-[#0088cc]/30 shadow-[0_0_30px_rgba(0,136,204,0.1)] flex items-center justify-center bg-white shrink-0 relative z-20">
                <img
                  src="/profile.png"
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=300&auto=format&fit=crop";
                  }}
                />
              </div>
              <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-2 border-[#0088cc]/30 shadow-[0_0_30px_rgba(0,136,204,0.1)] flex items-center justify-center bg-white shrink-0 relative z-10 -ml-6 sm:-ml-8 lg:-ml-10 opacity-90 transition-all hover:z-30 hover:opacity-100">
                <img
                  src="/imagem1.png"
                  alt="Profile 1"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=300&auto=format&fit=crop";
                  }}
                />
              </div>
              <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-2 border-[#0088cc]/30 shadow-[0_0_30px_rgba(0,136,204,0.1)] flex items-center justify-center bg-white shrink-0 relative z-0 -ml-6 sm:-ml-8 lg:-ml-10 opacity-80 transition-all hover:z-30 hover:opacity-100">
                <img
                  src="/imgagem2.png"
                  alt="Profile 2"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=300&auto=format&fit=crop";
                  }}
                />
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-light tracking-tight leading-tight mb-1 sm:mb-4">
              Entre para o meu <br className="hidden lg:block" /><span className="font-medium italic text-[#0088cc]">VIP exclusivo</span> <br className="hidden lg:block" />no Telegram
            </h1>
            <p className="hidden sm:block text-zinc-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md mt-2">
              Conteúdos exclusivos, bastidores e fotos que não publico em nenhum outro lugar.
            </p>

            <div className="inline-flex items-center justify-center space-x-2 border border-[#0088cc]/20 bg-[#0088cc]/5 rounded-full px-3 lg:px-4 py-1.5 lg:py-2 mt-3 sm:mt-6 lg:mt-8">
              <div className="w-2 h-2 rounded-full bg-[#0088cc] animate-pulse" />
              <span className="text-[10px] lg:text-[10px] sm:text-xs uppercase tracking-widest font-bold text-[#0088cc]">
                {activeUsers} PESSOAS NA PÁGINA AGORA
              </span>
            </div>

            <div className="hidden sm:block mt-6 sm:mt-8 lg:mt-6 w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-200/50 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
              <img
                src="/flyer.png?t=1"
                alt="Flyer Promocional"
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 relative z-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            <div className="hidden sm:flex pt-6 lg:pt-8 flex-wrap items-center justify-center gap-2">
              <span className="px-2 py-1 bg-gray-100 border border-gray-200 text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">Verificado 18+</span>
              <span className="text-[10px] lg:text-[11px] text-zinc-500 uppercase tracking-widest">Ao assinar você confirma sua maioridade</span>
            </div>

            <div className="mt-12 w-full max-w-md hidden sm:block mx-auto text-left">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent"></div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Membros VIP</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent"></div>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Anônimo 5091", text: "Melhor investimento. Só tem as mais rabuda que gosto" },
                  { name: "Anônimo 2840", text: "Sensacional! Só tem gostosa kkk" },
                ].map((testimonial, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                          <span className="text-[10px] font-bold text-zinc-500">{testimonial.name.charAt(0)}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-800">{testimonial.name}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg key={star} className="w-3 h-3 text-[#0088cc]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 font-light italic leading-relaxed">"{testimonial.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </header>
        </div>

        {/* Right Column / Interaction Area */}
        <div className="w-full lg:w-1/2 px-4 py-2 sm:py-8 lg:p-12 flex items-start lg:items-center justify-center sm:bg-gray-50 border-t lg:border-t-0 lg:border-l border-zinc-100 lg:h-full">
          <div className="w-full max-w-[460px] flex flex-col justify-center">
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
                  <div className="bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl relative w-full mt-2 sm:mt-0">
                    <AnimatePresence mode="wait">
                      {discountTimeLeft > 0 ? (
                        <motion.div
                          key="discount"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0088cc] text-white text-[10px] font-bold uppercase px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg shadow-[#0088cc]/20 flex items-center gap-2"
                        >
                          <Timer className="w-3 h-3" />
                          <span>20% de desconto em {formatMinSec(discountTimeLeft)}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="standard"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-100 text-zinc-600 border border-gray-200 text-[9px] sm:text-[10px] font-bold uppercase px-4 py-1 rounded-full whitespace-nowrap"
                        >
                          Acesso Liberado Automaticamente
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="text-center mb-4 sm:mb-8 pt-4">
                      {discountTimeLeft > 0 && (
                        <div className="text-[#0088cc] font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1 sm:mb-2 animate-pulse">
                          Garanta seu desconto agora!
                        </div>
                      )}
                      <h2 className="text-zinc-500 uppercase text-[10px] tracking-widest mb-0 sm:mb-1">Acesso VIP Telegram</h2>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg sm:text-2xl font-medium text-zinc-500">R$</span>
                        <span className="text-3xl sm:text-5xl font-semibold tracking-tighter text-zinc-900">19,90</span>
                        <span className="text-[10px] sm:text-sm font-medium text-zinc-500 ml-1">/mês</span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 sm:space-y-4 mb-4 sm:mb-8">
                      {[
                        "Acesso imediato após o pagamento",
                        "Conteúdo exclusivo +18",
                        "+500 mídias das modelos mais famosas",
                        "Grupo privado no Telegram",
                      ].map((benefit, i) => (
                        <li key={i} className="flex items-center text-[10px] sm:text-sm font-medium text-zinc-700 leading-tight">
                          <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#0088cc] mr-2 sm:mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    {/* Checkout Form */}
                    <form onSubmit={handleCheckout} className="space-y-3 sm:space-y-5">

                      <div className="space-y-2 sm:space-y-4">
                        <div className="space-y-1 text-center sm:text-left">
                          <label className="text-[10px] sm:text-[10px] uppercase tracking-wider text-zinc-500 ml-1 leading-tight block">
                            Contato Telegram/WhatsApp <span className="normal-case italic tracking-normal text-zinc-500 hidden sm:inline">(somente para mandar o link 🔞)</span>
                          </label>
                          <input
                            ref={contactInputRef}
                            required
                            type="text"
                            value={formData.contact}
                            onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            placeholder="@usuario ou (00) 00000-0000"
                            className="w-full bg-white border border-zinc-300 shadow-sm rounded-lg sm:rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3.5 text-sm sm:text-sm text-zinc-900 focus:outline-none focus:border-[#0088cc] transition-colors placeholder:text-zinc-400 text-center sm:text-left"
                          />
                        </div>
                      </div>

                      {/* Payment Method (PIX only) */}
                      <div className="pt-1 sm:pt-2">
                        <div className="flex items-center justify-center gap-2 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border bg-[#0088cc]/10 border-[#0088cc] text-[#0088cc]">
                          <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Pagamento via Pix</span>
                        </div>
                      </div>

                      {/* 18+ Checkbox */}
                      <label className="flex items-center justify-center sm:justify-start cursor-pointer group mt-1 sm:mt-2 py-1 sm:py-2 px-1">
                        <div className={cn(
                          "w-4 h-4 sm:w-4 sm:h-4 border rounded mt-0 flex flex-shrink-0 items-center justify-center transition-colors",
                          ageConfirmed ? "bg-[#0088cc] border-[#0088cc]" : "border-zinc-300 bg-white group-hover:border-zinc-400"
                        )}>
                          {ageConfirmed && <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={ageConfirmed}
                          onChange={(e) => setAgeConfirmed(e.target.checked)}
                        />
                        <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs font-medium leading-tight text-zinc-600 group-hover:text-zinc-800 transition-colors">
                          Confirmar maioridade (18+ anos)
                        </span>
                      </label>

                      {/* Submit Area */}
                      <div className="pt-1 sm:pt-2">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-4 bg-[#0088cc]/10 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border border-[#0088cc]/20">
                          <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0088cc]" />
                          <span className="text-[9px] sm:text-xs font-bold text-[#0088cc] uppercase tracking-widest">
                            {discountTimeLeft > 0
                              ? `Oferta encerra em: ${formatTime(timeLeft)}`
                              : "Vagas quase esgotadas"}
                          </span>
                        </div>
                        <button
                          ref={submitButtonRef}
                          type="submit"
                          disabled={!ageConfirmed || !formData.contact}
                          className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-2.5 sm:py-4 rounded-lg sm:rounded-xl shadow-lg shadow-[#0088cc]/20 flex items-center justify-center uppercase tracking-widest sm:tracking-[0.2em] text-[11px] sm:text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Liberar meu acesso agora
                        </button>

                        <p className="text-center text-[10px] sm:text-[10px] text-zinc-500 leading-tight px-1 sm:px-4 mt-2 sm:mt-4">
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
                  className="w-full max-w-[460px] bg-white border border-zinc-200 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col items-center justify-center text-center mx-auto"
                >
                  <div className="w-12 h-12 border-2 border-[#0088cc]/20 border-t-[#0088cc] rounded-full animate-spin mb-6" />
                  <h2 className="text-lg font-bold text-zinc-900 mb-2 uppercase tracking-wide">Gerando pagamento...</h2>
                  <p className="text-zinc-600 text-sm">Aguarde enquanto abrimos seu checkout com seguranca.</p>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[460px] space-y-6 mx-auto"
                >
                  <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,136,204,0.2)]">
                      <Check className="w-8 h-8 text-[#0088cc]" />
                    </div>

                    <div className="space-y-3 mb-8">
                      <h2 className="text-2xl font-semibold text-zinc-900">Pagamento Aprovado</h2>
                      <p className="text-zinc-600 text-sm leading-relaxed max-w-[240px] mx-auto">
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

                      <div className="pt-6 mt-4 border-t border-zinc-200 text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider italic">
                        Link pessoal vinculado ao e-mail. Não compartilhe com terceiros.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'pending' && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[460px] space-y-6 mx-auto"
                >
                  <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
                    <h2 className="text-2xl font-semibold text-zinc-900">Aguardando confirmacao final</h2>
                    <p className="text-zinc-600 text-sm leading-relaxed max-w-[280px] mx-auto mt-3">
                      Seu pagamento foi aprovado. Aguarde: seu link chegara em poucos instantes no contato cadastrado.
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">Atualizando status automaticamente...</p>
                    {checkoutId && <p className="text-xs text-zinc-500 mt-4">Pedido: {checkoutId}</p>}
                  </div>
                </motion.div>
              )}

              {step === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[460px] space-y-6 mx-auto"
                >
                  <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
                    <h2 className="text-2xl font-semibold text-zinc-900">Pagamento não aprovado</h2>
                    <p className="text-zinc-600 text-sm leading-relaxed max-w-[280px] mx-auto mt-3">
                      Tente novamente com outro método de pagamento.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep('checkout')}
                      className="mt-6 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-3 px-6 rounded-xl uppercase tracking-widest text-xs"
                    >
                      Voltar ao checkout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="sm:hidden w-full px-4 pb-20">
          <div className="w-full max-w-[460px] mx-auto rounded-2xl overflow-hidden border border-zinc-200/50 shadow-xl">
            <img
              src="/flyer.png?t=1"
              alt="Flyer Promocional"
              className="w-full max-h-[360px] object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="hidden sm:flex w-full py-4 px-6 lg:px-12 border-t border-zinc-200 bg-white flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-zinc-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Pagamento 100% Seguro</span>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest italic">
          Acesso individual e intransferível • Proibido compartilhamento
        </div>
      </footer>

      {step === 'checkout' && showMobileStickyCta && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur px-3 py-2">
          <div className="max-w-[460px] mx-auto flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Acesso VIP por</div>
              <div className="text-sm font-bold text-zinc-900">R$ 19,90</div>
              <div className="text-[10px] font-semibold text-[#0088cc] uppercase">
                {discountTimeLeft > 0 ? `Encerra em ${formatMinSec(discountTimeLeft)}` : 'Ultimas vagas'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleStickyCtaClick}
              className="shrink-0 bg-[#0088cc] text-white text-[11px] font-bold uppercase tracking-wide px-4 py-3 rounded-xl"
            >
              Liberar acesso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
