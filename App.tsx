
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Settings, Headphones, History as HistoryIcon, Library, X, Sparkles, Trash2, ArrowLeft, FileText } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app'; 
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, AppSettings, DEFAULT_SETTINGS, HistoryItem, RawArticle } from './types';
import { summarizeArticles, generateSpeech } from './services/aiService';
import { historyService } from './services/historyService';
import { ArticleInput } from './components/ArticleInput';
import { Player } from './components/Player';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { Logo } from './components/Logo';
import { SplashScreen } from './components/SplashScreen';
import { Bookshelf } from './components/Bookshelf';
import { ScrollReader } from './components/ScrollReader';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return new AudioContextClass({ sampleRate: 24000 });
};

const parseMarkdownBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return (
        <strong 
          key={i} 
          className="font-bold text-slate-900 px-1 mx-0.5 rounded-[2px]"
          style={{
            backgroundImage: 'linear-gradient(to bottom, transparent 60%, #e0e7ff 40%)',
            WebkitBoxDecorationBreak: 'clone',
            boxDecorationBreak: 'clone'
          }}
        >
          {content}
        </strong>
      );
    }
    return part;
  });
};

// 动画配置：iOS 风格的阻尼曲线
const TRANSITION_SPRING = { type: "spring", stiffness: 260, damping: 30 };
const TRANSITION_EASE = { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.5 };

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [rawArticles, setRawArticles] = useState<RawArticle[]>([]);
  const [selectedBookIndex, setSelectedBookIndex] = useState<number | null>(null);
  
  const [summary, setSummary] = useState('');
  const [lastSummarizedText, setLastSummarizedText] = useState(''); 
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  
  const isMobile = useIsMobile();
  // Check if the "Result" panel (Summary) is effectively open
  const isResultOpen = (appState === AppState.READY || appState === AppState.GENERATING_AUDIO) && !!summary;
  
  const hasCachedSummary = !!summary && textInput.trim() === lastSummarizedText.trim() && textInput.trim().length > 0;
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        setSettings({...DEFAULT_SETTINGS, ...JSON.parse(saved)});
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    } else {
        if (process.env.API_KEY) {
            setSettings(s => ({
                ...s,
                llm: { ...s.llm, apiKey: process.env.API_KEY || '' },
                tts: { ...s.tts, apiKey: process.env.API_KEY || '' }
            }));
        }
    }
    setIsSettingsLoaded(true);
  }, []);

  useEffect(() => {
    const handleBackButton = async () => {
        if (showSplash) return;
        if (selectedBookIndex !== null) {
            setSelectedBookIndex(null);
            return;
        }
        if (isSettingsOpen) {
            setIsSettingsOpen(false);
            return;
        }
        if (isHistoryOpen) {
            setIsHistoryOpen(false);
            return;
        }
        if (isResultOpen && isMobile) {
            handleBackToInput();
            return;
        }
        try {
            await CapacitorApp.exitApp();
        } catch (e) {
            console.warn('App exit not supported in browser');
        }
    };
    const backButtonListener = CapacitorApp.addListener('backButton', handleBackButton);
    return () => {
        backButtonListener.then(handler => handler.remove());
    };
  }, [isSettingsOpen, isHistoryOpen, isResultOpen, isMobile, selectedBookIndex, showSplash]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  const handleGenerateSummary = async () => {
    if (!textInput.trim()) return;
    if (hasCachedSummary) {
        setAppState(AppState.READY);
        return;
    }
    try {
      setErrorDetails('');
      setAppState(AppState.GENERATING_SUMMARY);
      setSummary(''); 
      setAudioBuffer(null);
      const summaryText = await summarizeArticles(textInput, settings);
      setSummary(summaryText);
      setLastSummarizedText(textInput); 
      setAppState(AppState.READY); 
      historyService.saveHistoryItem(textInput, summaryText);
    } catch (error: any) {
      handleError(error);
    }
  };

  const handleGenerateAudio = async () => {
    if (!summary) return;
    if (!audioContextRef.current) audioContextRef.current = getAudioContext();
    try {
      setAppState(AppState.GENERATING_AUDIO);
      const buffer = await generateSpeech(summary, audioContextRef.current, settings);
      setAudioBuffer(buffer);
      setAppState(AppState.READY);
    } catch (error: any) {
      handleError(error);
    }
  };

  const handleBackToInput = () => {
      setAppState(AppState.IDLE);
      if (audioContextRef.current) audioContextRef.current.suspend();
  };

  const handleSelectHistory = (item: HistoryItem) => {
      setTextInput(item.originalText);
      setSummary(item.summary);
      setLastSummarizedText(item.originalText);
      setAudioBuffer(null);
      setRawArticles([]);
      setAppState(AppState.READY);
      setIsHistoryOpen(false);
  };

  const handleError = (error: any) => {
      console.error(error);
      setAppState(AppState.ERROR);
      let msg = error.message || String(error);
      if (msg.includes('SAFETY')) {
        msg = settings.language === 'zh-CN' ? "内容被安全过滤器拦截。" : "Content blocked by safety filters.";
      }
      setErrorDetails(msg);
  };

  const handleArticlesFetched = (articles: RawArticle[]) => {
      setRawArticles(articles);
  };

  const handleBookClick = (article: RawArticle, index: number) => {
      setSelectedBookIndex(index);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent bubbling issues
    setTimeout(() => {
        if (window.confirm('确定清空书架并返回吗？')) {
            setRawArticles([]);
            setTextInput('');
            setAppState(AppState.IDLE);
        }
    }, 10);
  };

  const isConfigMissing = !settings.llm.apiKey;
  const t = settings.language === 'zh-CN' ? {
    title: '万象志',
    summaryTitle: '今日简报',
    generateAudio: '生成语音播报',
    generatingSummary: 'AI 正在阅读...',
  } : {
    title: 'Wanxiang Journal',
    summaryTitle: 'Today\'s Briefing',
    generateAudio: 'Generate Audio',
    generatingSummary: 'Reading articles...',
  };

  if (!isSettingsLoaded) return null;

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      
      {/* 
         ROOT CONTAINER: Changed to BLACK to provide depth when cards scale down. 
         This is crucial for the "Stacked" feel. 
      */}
      <div className="min-h-screen font-sans selection:bg-amber-200 selection:text-amber-900 overflow-hidden bg-black">
        
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
        />

        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelect={handleSelectHistory}
          language={settings.language}
        />

        {/* Scroll Reader Overlay */}
        <AnimatePresence>
          {selectedBookIndex !== null && rawArticles[selectedBookIndex] && (
            <ScrollReader 
               key="reader"
               article={rawArticles[selectedBookIndex]} 
               index={selectedBookIndex}
               layoutId={`scroll-${selectedBookIndex}`} 
               onClose={() => setSelectedBookIndex(null)}
            />
          )}
        </AnimatePresence>

        {/* =======================
            MOBILE LAYOUT (STACKING LOGIC)
           ======================= */}
        {isMobile ? (
            <>
                {/* 
                   LAYER 1: HOME CARD (Input + Bookshelf)
                   Behavior: Scales down, fades out, and pushes back when Result is open.
                */}
                <motion.div 
                    className="h-screen bg-stone-50 overflow-hidden flex flex-col relative z-0 origin-top"
                    initial={{ scale: 1, borderRadius: 0, opacity: 1 }}
                    animate={isResultOpen ? { 
                        scale: 0.92, 
                        borderRadius: 24, 
                        opacity: 0.5,
                        y: 10,
                        filter: "brightness(0.7)"
                    } : { 
                        scale: 1, 
                        borderRadius: 0, 
                        opacity: 1,
                        y: 0,
                        filter: "brightness(1)"
                    }}
                    transition={TRANSITION_EASE}
                    style={{ willChange: 'transform, opacity, filter' }} // Performance optimization
                >
                    {/* Header is now INSIDE the scaling container for mobile */}
                    <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-stone-200/60 shadow-sm safe-top h-14 flex items-center justify-between px-4 sm:px-6 relative z-30">
                        <div className="flex items-center gap-2.5">
                            <Logo className="w-8 h-8 shadow-sm rounded-lg" />
                            <h1 className="font-serif font-bold text-xl tracking-[0.2em] text-slate-900 ml-1">{t.title}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                <HistoryIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
                                <Settings className="w-5 h-5" />
                                {isConfigMissing && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                            </button>
                        </div>
                    </header>

                    {/* Scrollable Main Area */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative z-0">
                        <div className="px-4 py-4">
                            <ArticleInput 
                                value={textInput}
                                onChange={setTextInput}
                                onGenerateSummary={handleGenerateSummary}
                                isGeneratingSummary={appState === AppState.GENERATING_SUMMARY}
                                disabled={isConfigMissing}
                                hasCachedSummary={hasCachedSummary}
                                onArticlesFetched={handleArticlesFetched}
                                hasArticles={rawArticles.length > 0}
                            />
                            {appState === AppState.GENERATING_SUMMARY && (
                                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                    <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-2xl">
                                        <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
                                        <p className="text-stone-800 font-serif text-lg">{t.generatingSummary}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pb-32 min-h-[50vh]">
                            {rawArticles.length > 0 ? (
                                <div className="min-h-full">
                                    <Bookshelf 
                                        articles={rawArticles} 
                                        onBookClick={handleBookClick}
                                    />
                                    {/* Floating Action Bar */}
                                    <div className="fixed bottom-6 left-0 right-0 z-20 flex flex-col items-center gap-3 pointer-events-none">
                                        <button
                                            onClick={handleGenerateSummary}
                                            disabled={appState === AppState.GENERATING_SUMMARY}
                                            className={`pointer-events-auto group text-white shadow-xl transition-all hover:scale-105 active:scale-95 px-8 py-3.5 rounded-full flex items-center gap-2.5 font-bold text-base backdrop-blur-sm border 
                                                ${hasCachedSummary 
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/50 border-indigo-500/20' 
                                                    : 'bg-amber-700 hover:bg-amber-800 shadow-amber-900/50 border-amber-500/20'
                                                }`}
                                        >
                                            {hasCachedSummary ? (
                                                <FileText className="w-5 h-5 text-indigo-200" />
                                            ) : (
                                                <Sparkles className="w-5 h-5 group-hover:animate-pulse text-amber-200" />
                                            )}
                                            <span>{hasCachedSummary ? '查看 AI 简报' : '生成 AI 简报'}</span>
                                        </button>
                                        
                                        <button 
                                            onClick={handleReset}
                                            className="pointer-events-auto text-stone-400 text-xs font-medium hover:text-white bg-black/50 backdrop-blur px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-white/10 active:bg-black/70 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>清空书架</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 pb-20 pt-10">
                                    <Library className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="font-serif text-sm">暂无卷宗</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* 
                   LAYER 2: SUMMARY CARD (Slides Over) 
                   Behavior: Slides from bottom/right with huge shadow, creating parallax depth.
                */}
                <AnimatePresence>
                    {isResultOpen && (
                        <motion.div 
                            className="fixed inset-0 z-40 bg-stone-50 flex flex-col h-full overflow-hidden"
                            // Start from 100% height (bottom) or width (right) - Right feels more like a navigation
                            initial={{ x: '100%' }}
                            animate={{ x: '0%' }}
                            exit={{ x: '100%' }}
                            transition={TRANSITION_EASE}
                            style={{ 
                                boxShadow: '-30px 0px 60px -15px rgba(0,0,0,0.5)', // Deep shadow for separation
                                willChange: 'transform' 
                            }}
                        >
                             {/* Header */}
                            <div className="flex-shrink-0 h-14 bg-white/95 backdrop-blur border-b border-stone-200/80 px-4 flex items-center justify-between safe-top shadow-sm z-10">
                                <button onClick={handleBackToInput} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2 py-1 -ml-2 rounded-lg active:bg-slate-100 transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                    <span className="font-medium">返回</span>
                                </button>
                                <div className="font-serif font-bold text-slate-800 text-lg">{t.summaryTitle}</div>
                                <div className="w-8"></div> 
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto bg-stone-50 p-4 pb-24">
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
                                    <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                                        <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-wide">AI BRIEF</div>
                                        <div className="flex-shrink-0">
                                            {audioBuffer ? (
                                                <Player audioBuffer={audioBuffer} context={audioContextRef.current!} />
                                            ) : (
                                                <button 
                                                    onClick={handleGenerateAudio}
                                                    disabled={appState === AppState.GENERATING_AUDIO}
                                                    className="bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
                                                >
                                                    {appState === AppState.GENERATING_AUDIO ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Headphones className="w-3.5 h-3.5"/>}
                                                    {t.generateAudio}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <article className="p-6">
                                        {summary.split('\n').map((para, i) => para.trim() && (
                                            <p key={i} className="font-serif text-[16px] leading-8 text-slate-700 mb-6 text-justify">
                                                {parseMarkdownBold(para)}
                                            </p>
                                        ))}
                                    </article>
                                    <div className="px-6 pb-8 pt-2 flex justify-center opacity-30">
                                        <div className="w-16 h-1 bg-slate-200 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        ) : (
            /* =======================
                DESKTOP LAYOUT (Unchanged logic, just restored the wrapper)
               ======================= */
            <div className="bg-stone-50 min-h-screen flex flex-col">
                 <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200/60 shadow-sm safe-top transition-all h-14">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                        <Logo className="w-8 h-8 shadow-sm rounded-lg" />
                        <h1 className="font-serif font-bold text-xl tracking-[0.2em] text-slate-900 ml-1">{t.title}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-full transition-colors">
                                <HistoryIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-full transition-colors relative">
                                <Settings className="w-5 h-5" />
                                {isConfigMissing && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                            </button>
                        </div>
                    </div>
                </header>

                <main className="pt-14 h-[calc(100vh)] relative max-w-6xl mx-auto w-full grid grid-cols-12 gap-10">
                     {/* Desktop Input Column */}
                     <div className="col-span-4 px-6 py-6 h-full overflow-y-auto">
                          <ArticleInput 
                            value={textInput}
                            onChange={setTextInput}
                            onGenerateSummary={handleGenerateSummary}
                            isGeneratingSummary={appState === AppState.GENERATING_SUMMARY}
                            disabled={isConfigMissing}
                            hasCachedSummary={hasCachedSummary}
                            onArticlesFetched={handleArticlesFetched}
                            hasArticles={rawArticles.length > 0}
                          />
                          {appState === AppState.GENERATING_SUMMARY && (
                             <div className="mt-4 flex items-center justify-center gap-2 text-amber-600">
                                 <Loader2 className="w-5 h-5 animate-spin" />
                                 <span>{t.generatingSummary}</span>
                             </div>
                          )}
                     </div>
    
                     {/* Desktop Display Column */}
                     <div className="col-span-8 h-full overflow-hidden relative">
                        {isResultOpen && summary ? (
                           <div className="h-full py-6 pr-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 relative">
                                    <button onClick={handleBackToInput} className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-20 text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="bg-white border-b border-slate-100 px-10 py-8 flex items-center justify-between sticky top-0 z-10 rounded-t-3xl">
                                        <div>
                                            <h2 className="font-serif font-bold text-3xl text-slate-800 mb-2">{t.summaryTitle}</h2>
                                            <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit uppercase tracking-wider">AI Generated Brief</div>
                                        </div>
                                        <div className="flex-shrink-0 mr-12">
                                            {audioBuffer ? (
                                                <Player audioBuffer={audioBuffer} context={audioContextRef.current!} />
                                            ) : (
                                                <button 
                                                onClick={handleGenerateAudio}
                                                disabled={appState === AppState.GENERATING_AUDIO}
                                                className="bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-5 py-2.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
                                                >
                                                    {appState === AppState.GENERATING_AUDIO ? <Loader2 className="w-4 h-4 animate-spin"/> : <Headphones className="w-4 h-4"/>}
                                                    {t.generateAudio}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <article className="p-10 px-12">
                                        {summary.split('\n').map((para, i) => para.trim() && (
                                            <p key={i} className="font-serif text-lg leading-9 text-slate-700 mb-8 text-justify">
                                                {parseMarkdownBold(para)}
                                            </p>
                                        ))}
                                    </article>
                                </div>
                           </div>
                        ) : (
                            rawArticles.length > 0 ? (
                                <div className="h-full relative py-6 pr-6">
                                    <div className="h-full overflow-y-auto">
                                        <Bookshelf 
                                            articles={rawArticles} 
                                            onBookClick={handleBookClick}
                                        />
                                    </div>
                                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3">
                                        <button
                                            onClick={handleGenerateSummary}
                                            disabled={appState === AppState.GENERATING_SUMMARY}
                                            className={`group text-white shadow-xl transition-all hover:scale-105 active:scale-95 px-8 py-3.5 rounded-full flex items-center gap-2.5 font-bold text-base border
                                                ${hasCachedSummary 
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/50 border-indigo-500/20' 
                                                    : 'bg-amber-700 hover:bg-amber-800 shadow-amber-900/50 border-amber-500/20'
                                                }`}
                                        >
                                            {hasCachedSummary ? (
                                                <FileText className="w-5 h-5 text-indigo-200" />
                                            ) : (
                                                <Sparkles className="w-5 h-5 group-hover:animate-pulse text-amber-200" />
                                            )}
                                            <span>{hasCachedSummary ? '查看 AI 简报' : '生成 AI 简报'}</span>
                                        </button>
                                        <button 
                                            onClick={handleReset}
                                            className="text-stone-400 hover:text-white bg-black/50 border border-white/10 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-sm transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            清空
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 p-10 m-6 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <Library className="w-20 h-20 mb-6 opacity-40" />
                                    <p className="font-serif text-xl mb-2">书架空空如也</p>
                                    <p className="text-slate-400">从左侧选择一个新闻源开始</p>
                                </div>
                            )
                        )}
                     </div>
                </main>
            </div>
        )}
      </div>
    </>
  );
}
