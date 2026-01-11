
import React, { useState, useRef, useEffect } from 'react';
import { Radio, Loader2, AlertCircle, Settings, BookOpen, Headphones, Play, ArrowLeft } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app'; 
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, AppSettings, DEFAULT_SETTINGS } from './types';
import { summarizeArticles, generateSpeech } from './services/aiService';
import { ArticleInput } from './components/ArticleInput';
import { Player } from './components/Player';
import { SettingsModal } from './components/SettingsModal';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Helper hook to detect mobile view for conditional animations
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

export default function App() {
  const [textInput, setTextInput] = useState('');
  
  // State for result persistence
  const [summary, setSummary] = useState('');
  const [lastSummarizedText, setLastSummarizedText] = useState(''); // Cache key: the text that generated the current summary
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  
  const isMobile = useIsMobile();

  // Helper to determine if we are showing the result "page"
  const isResultOpen = appState === AppState.READY || appState === AppState.GENERATING_AUDIO;

  // Determine if the current input matches the cached summary
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

  // --- Hardware Back Button Logic (Android) ---
  useEffect(() => {
    const handleBackButton = async () => {
        // If settings modal is open, close it
        if (isSettingsOpen) {
            setIsSettingsOpen(false);
            return;
        }

        // If result page is open (and we are on mobile), go back to input
        // On desktop, the result is side-by-side, so "back" might mean exit app or do nothing.
        // Assuming "Back" logic primarily for mobile view navigation.
        if (isResultOpen && isMobile) {
            handleBackToInput();
            return;
        }

        // Otherwise, use default behavior (minimize/exit)
        try {
            const info = await CapacitorApp.getInfo();
            CapacitorApp.exitApp();
        } catch (e) {
            console.warn('App exit not supported in browser');
        }
    };

    // Add Listener
    const backButtonListener = CapacitorApp.addListener('backButton', handleBackButton);

    // Cleanup
    return () => {
        backButtonListener.then(handler => handler.remove());
    };
  }, [isSettingsOpen, isResultOpen, isMobile]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  const handleGenerateSummary = async () => {
    if (!textInput.trim()) return;

    // --- Caching Logic ---
    // If the input text hasn't changed and we have a summary, just show it.
    if (hasCachedSummary) {
        setAppState(AppState.READY);
        return;
    }

    try {
      setErrorDetails('');
      setAppState(AppState.GENERATING_SUMMARY);
      
      // Only clear previous results if we are actually generating new content
      setSummary(''); 
      setAudioBuffer(null);

      const summaryText = await summarizeArticles(textInput, settings);
      
      setSummary(summaryText);
      setLastSummarizedText(textInput); // Update cache key
      setAppState(AppState.READY); 
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
      // Return to IDLE state to show Input view
      // Note: We DO NOT clear summary or audioBuffer here, allowing persistence.
      setAppState(AppState.IDLE);
      
      // Optional: Suspend audio context to save battery/stop playing
      if (audioContextRef.current) {
          audioContextRef.current.suspend();
      }
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

  const isConfigMissing = !settings.llm.apiKey;
  
  const t = settings.language === 'zh-CN' ? {
    title: '通勤简报',
    configMissing: '请点击设置图标配置 API Key',
    summaryTitle: '今日简报',
    readTime: 'AI 深度总结',
    generateAudio: '生成语音播报',
    generatingAudioBtn: '正在合成语音...',
    generatingSummary: 'AI 正在阅读...',
    prepare: '准备就绪',
    prepareDesc: '在左侧粘贴内容，我们将为您提炼重点。',
    back: '返回'
  } : {
    title: 'Daily Briefing',
    configMissing: 'Please configure API Key',
    summaryTitle: 'Today\'s Briefing',
    readTime: 'AI Summary',
    generateAudio: 'Generate Audio',
    generatingAudioBtn: 'Synthesizing...',
    generatingSummary: 'Reading articles...',
    prepare: 'Ready',
    prepareDesc: 'Paste content to start.',
    back: 'Back'
  };

  if (!isSettingsLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Global Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm safe-top transition-all h-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Radio className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800">{t.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-full transition-colors relative"
            >
              <Settings className="w-5 h-5" />
              {isConfigMissing && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-14 h-[calc(100vh)] relative">
        <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-12 lg:gap-10">
          
          {/* --- VIEW 1: Input Column --- */}
          <motion.div 
            key="input-view"
            className="lg:col-span-4 h-full overflow-y-auto px-4 sm:px-6 py-6 scrollbar-hide"
            // Parallax Effect: Only on mobile, slide left and dim when result is open
            animate={isMobile ? {
              x: isResultOpen ? '-20%' : '0%', 
              opacity: isResultOpen ? 0.8 : 1,
              filter: isResultOpen ? 'brightness(0.95)' : 'brightness(1)',
              scale: isResultOpen ? 0.98 : 1
            } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col gap-4 min-h-full">
                <ArticleInput 
                  value={textInput}
                  onChange={setTextInput}
                  onGenerateSummary={handleGenerateSummary}
                  isGeneratingSummary={appState === AppState.GENERATING_SUMMARY}
                  disabled={isConfigMissing}
                  hasCachedSummary={hasCachedSummary}
                />
                
                {!isConfigMissing && appState === AppState.IDLE && (
                    <div className="mt-4 p-4 bg-white/50 border border-slate-200/50 rounded-2xl text-xs text-slate-400 text-center">
                        <p>{t.prepareDesc}</p>
                    </div>
                )}
                
                {/* Loading State Overlay */}
                {appState === AppState.GENERATING_SUMMARY && (
                   <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                      <p className="text-slate-500 font-medium animate-pulse">{t.generatingSummary}</p>
                   </div>
                )}
            </div>
          </motion.div>

          {/* --- VIEW 2: Output Column (Result View) --- */}
          {/* Using AnimatePresence to handle the slide-in/slide-out lifecycle */}
          <AnimatePresence>
            {(isResultOpen || !isMobile) && (
              // On desktop (!isMobile), we always render this column.
              // On mobile (isMobile), we only render if isResultOpen is true.
              // However, AnimatePresence works best when the component unmounts.
              // To support desktop split-view without animation and mobile with animation, we use conditional rendering logic.
              
              <div className={`
                 ${isMobile ? 'fixed inset-0 z-40' : 'lg:col-span-8 h-full'}
                 ${!isResultOpen && !isMobile ? 'hidden lg:block lg:opacity-50 lg:pointer-events-none' : ''} 
                 /* Above line hides/dims column on desktop if no result, but keeps layout structure */
              `}>
                  {(!isMobile || isResultOpen) && (
                      <motion.div 
                        key="result-panel"
                        className={`bg-slate-50 flex flex-col h-full w-full shadow-2xl lg:shadow-none lg:bg-transparent`}
                        // Mobile Animation: Slide in from right (100% -> 0)
                        initial={isMobile ? { x: '100%' } : { opacity: 0 }} 
                        animate={isMobile ? { x: '0%' } : { opacity: 1 }}
                        exit={isMobile ? { x: '100%' } : { opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                      >
                        
                        {/* Mobile Header with Back Button */}
                        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3 lg:hidden safe-top">
                            <button 
                               onClick={handleBackToInput}
                               className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="font-bold text-slate-800 text-sm">{t.summaryTitle}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
                            {/* Error State */}
                            {(appState === AppState.ERROR || errorDetails) && (
                              <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl text-sm flex items-start gap-3 mb-6">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                   <span className="font-semibold block mb-1">Error</span>
                                   <span className="opacity-90 leading-snug">{errorDetails}</span>
                                </div>
                              </div>
                            )}

                            {/* Content Card */}
                            {summary ? (
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[50vh]">
                                    
                                    {/* Reader Header */}
                                    <div className="bg-white border-b border-slate-100 px-6 sm:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-10">
                                        <div>
                                            <h2 className="font-serif font-bold text-lg text-slate-800 leading-tight">{t.summaryTitle}</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded tracking-wide uppercase">AI BRIEF</span>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{t.readTime}</span>
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0">
                                            {audioBuffer ? (
                                               <div className="animate-in fade-in zoom-in duration-300 origin-right">
                                                  <Player audioBuffer={audioBuffer} context={audioContextRef.current!} />
                                               </div>
                                            ) : (
                                               <button 
                                                 onClick={handleGenerateAudio}
                                                 disabled={appState === AppState.GENERATING_AUDIO}
                                                 className={`
                                                    group flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-medium border transition-all duration-300
                                                    ${appState === AppState.GENERATING_AUDIO
                                                       ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                                       : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm'
                                                    }
                                                 `}
                                               >
                                                 {appState === AppState.GENERATING_AUDIO ? (
                                                   <Loader2 className="w-4 h-4 animate-spin" />
                                                 ) : (
                                                   <div className="bg-white text-indigo-600 rounded-full p-1 shadow-sm group-hover:bg-white/20 group-hover:text-white transition-colors">
                                                      <Headphones className="w-3 h-3" />
                                                   </div>
                                                 )}
                                                 <span>
                                                    {appState === AppState.GENERATING_AUDIO ? t.generatingAudioBtn : t.generateAudio}
                                                 </span>
                                               </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <article className="p-6 sm:p-12">
                                      <div className="prose prose-slate prose-lg max-w-none 
                                        prose-headings:font-serif prose-headings:font-bold prose-headings:text-slate-800 
                                        prose-p:font-serif prose-p:text-slate-600 prose-p:leading-8 prose-p:mb-6 
                                        first-letter:text-5xl first-letter:font-bold first-letter:text-indigo-600 first-letter:mr-3 first-letter:float-left first-letter:leading-none">
                                        {summary.split('\n').map((para, i) => {
                                            const trimmed = para.trim();
                                            if (!trimmed) return null;
                                            return <p key={i}>{trimmed}</p>;
                                        })}
                                      </div>
                                      
                                      <div className="mt-16 pt-8 border-t border-slate-100 flex justify-center">
                                         <div className="flex gap-2">
                                            {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300" />)}
                                         </div>
                                      </div>
                                    </article>
                                </div>
                            ) : (
                                /* Desktop Placeholder when empty */
                                !isMobile && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 p-10 border-2 border-dashed border-slate-200 rounded-3xl">
                                        <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                                        <p>Select content to view summary</p>
                                    </div>
                                )
                            )}
                        </div>
                      </motion.div>
                  )}
              </div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
