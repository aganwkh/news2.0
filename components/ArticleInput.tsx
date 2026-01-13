
import React, { useState, useEffect } from 'react';
import { FileText, Rss, Loader2, Trash2, ChevronDown, RefreshCw, Edit3, ChevronUp, AlertCircle } from 'lucide-react';
import { cleanArticleContent } from '../services/contentCleaner';
import { RawArticle } from '../types';

// --- API Configuration ---
// Python Backend for RSS Fetching
const API_ENDPOINT = 'https://www.wanxiangzhi.xyz:8443/fetch_feed';

interface ArticleInputProps {
  value: string;
  onChange: (val: string) => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  disabled: boolean;
  hasCachedSummary?: boolean;
  onArticlesFetched: (articles: RawArticle[]) => void; 
  hasArticles: boolean;
}

const SOURCES = [
  { name: "IT之家 (科技)", url: "https://www.ithome.com/rss/" },
  { name: "36Kr (商业)", url: "https://36kr.com/feed" },
  { name: "少数派 (生活)", url: "https://sspai.com/feed" },
  { name: "Solidot (极客)", url: "http://solidot.org/index.rss" },
  { name: "The Verge (科技评论)", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Wired (深度前瞻)", url: "https://www.wired.com/feed/rss" },
  { name: "TechCrunch (创投风向)", url: "https://techcrunch.com/feed/" },
  { name: "Teslarati (马斯克/SpaceX)", url: "https://www.teslarati.com/feed/" },
  { name: "Ars Technica (深度科技)", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "MIT Tech Review (AI前沿)", url: "https://www.technologyreview.com/feed/" },
  { name: "Tom's Hardware (英伟达/硬件)", url: "https://www.tomshardware.com/feeds/all" }
];

const SEEN_URLS_KEY = 'commute_brief_seen_urls';
const MAX_SEEN_URLS = 1000;
const MAX_RETRIES_RANDOM = 5;
const BATCH_SIZE = 6; 

const isUrlSeen = (url: string): boolean => {
  try {
    const seenList = JSON.parse(localStorage.getItem(SEEN_URLS_KEY) || '[]');
    return seenList.includes(url);
  } catch (e) {
    return false;
  }
};

const addToSeenList = (url: string) => {
  try {
    let seenList = JSON.parse(localStorage.getItem(SEEN_URLS_KEY) || '[]');
    if (!seenList.includes(url)) {
      seenList.push(url);
      if (seenList.length > MAX_SEEN_URLS) {
        seenList = seenList.slice(seenList.length - MAX_SEEN_URLS);
      }
      localStorage.setItem(SEEN_URLS_KEY, JSON.stringify(seenList));
    }
  } catch (e) {
    console.error("Failed to save seen url", e);
  }
};

const getArticleId = (article: any): string => {
    return article.link || article.url || article.guid || article.title || '';
};

export const ArticleInput: React.FC<ArticleInputProps> = ({ 
  value, 
  onChange, 
  onGenerateSummary, 
  isGeneratingSummary, 
  disabled,
  hasCachedSummary = false,
  onArticlesFetched,
  hasArticles
}) => {
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('');
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string>(""); 
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-collapse when articles are fetched
  useEffect(() => {
    if (hasArticles) {
        setIsExpanded(false);
    } else {
        setIsExpanded(true);
    }
  }, [hasArticles]);

  const handleClear = () => {
    if (confirm('确定清空书架内容吗？')) {
        onChange('');
        onArticlesFetched([]); 
    }
  };

  const fetchRSSData = async (url: string) => {
      const SERVER_API = `${API_ENDPOINT}?rss_url=${encodeURIComponent(url)}`;
      const response = await fetch(SERVER_API, {
        method: 'GET',
        headers: { 
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      return await response.json();
  };

  const fetchAndDisplayBatch = async (sourceUrl: string, sourceName: string): Promise<number> => {
      try {
          const data = await fetchRSSData(sourceUrl);
          if (!data) return 0;
          let articles = [];
          if (Array.isArray(data)) articles = data;
          else if (typeof data === 'object' && data.entries) articles = data.entries;
          if (articles.length === 0) return 0;

          const unseenArticles = articles.filter((a: any) => {
              const id = getArticleId(a);
              return id && !isUrlSeen(id);
          });
          if (unseenArticles.length === 0) return 0;

          const batch = unseenArticles.slice(0, BATCH_SIZE);
          const rawArticlesPayload: RawArticle[] = [];
          
          const formattedStrings = batch.map((article: any, index: number) => {
              addToSeenList(getArticleId(article));
              const rawContent = article.content || article.description || article.summary || '';
              const cleanBody = cleanArticleContent(rawContent);
              const finalBody = cleanBody.length > 50 ? cleanBody : (cleanArticleContent(article.title) || '内容提取失败');

              rawArticlesPayload.push({
                  title: article.title || 'Untitled',
                  content: finalBody,
                  sourceName: sourceName
              });
              return `### 第 ${index + 1} 篇：${article.title}\n\n${finalBody}`;
          });

          onArticlesFetched(rawArticlesPayload);
          const header = `【今日简报源: ${sourceName}】\n共获取到 ${batch.length} 篇新文章\n`;
          const separator = `\n\n${'-'.repeat(20)}\n\n`;
          const contentToDisplay = header + separator + formattedStrings.join(separator);
          onChange(contentToDisplay);
          return batch.length;
      } catch (e) {
          console.warn(`Error fetching ${sourceName}:`, e);
          return 0;
      }
  };

  const handleFetchNext = async () => {
      if (isFetchingNews || disabled) return;
      setIsFetchingNews(true);
      setFetchStatus('正在连接...');
      onArticlesFetched([]); 

      try {
          if (selectedSourceUrl) {
              const source = SOURCES.find(s => s.url === selectedSourceUrl);
              const name = source?.name || '未知源';
              setFetchStatus(`正在获取: ${name}`);
              const count = await fetchAndDisplayBatch(selectedSourceUrl, name);
              
              if (count > 0) {
                  setFetchStatus(`获取成功 (${count}篇)`);
                  setTimeout(() => setFetchStatus(''), 2500);
              } else {
                  setFetchStatus('没有新文章了');
                  alert('这个栏目的新文章都看完了，换个源试试吧！');
              }
          } else {
              let attempts = 0;
              let count = 0;
              while (attempts < MAX_RETRIES_RANDOM && count === 0) {
                  attempts++;
                  const randomSource = SOURCES[Math.floor(Math.random() * SOURCES.length)];
                  setFetchStatus(`[探索 ${attempts}/${MAX_RETRIES_RANDOM}] ${randomSource.name}...`);
                  count = await fetchAndDisplayBatch(randomSource.url, randomSource.name);
                  if (count === 0) await new Promise(r => setTimeout(r, 500));
              }
              if (count > 0) {
                  setFetchStatus(`发现 ${count} 篇新内容！`);
                  setTimeout(() => setFetchStatus(''), 2500);
              } else {
                  setFetchStatus('暂无新内容');
                  alert('连续尝试了多个订阅源，似乎没有新文章了。');
              }
          }
      } catch (e: any) {
          console.error(e);
          setFetchStatus('网络或服务器异常');
          onChange(`错误信息: ${e.message}`);
      } finally {
          setIsFetchingNews(false);
      }
  };

  return (
    <div 
        className={`flex flex-col transition-all duration-500 overflow-hidden relative border
            ${isExpanded 
                ? 'bg-white rounded-3xl shadow-sm border-slate-200/60' 
                : 'bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/50 mb-2'
            }
        `}
    >
      
      {/* 1. Compact Top Bar */}
      <div className={`pl-4 pr-3 py-3 flex items-center justify-between gap-3 transition-colors ${isExpanded ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}>
        
        {/* Source Dropdown */}
        <div className="flex-1 min-w-0 relative group">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors">
             <Rss className="w-4 h-4" />
          </div>
          <select
            value={selectedSourceUrl}
            onChange={(e) => setSelectedSourceUrl(e.target.value)}
            disabled={isFetchingNews || disabled}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer appearance-none pl-6 pr-8 py-1.5 rounded-lg hover:bg-slate-100 transition-colors truncate"
          >
            <option value="">🎲 随便看看 (随机推荐)</option>
            <hr />
            {SOURCES.map((s) => (
              <option key={s.url} value={s.url}>{s.name}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
             <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 border-l border-slate-200 pl-3">
           <button
             onClick={handleFetchNext}
             disabled={isFetchingNews || disabled}
             className="flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-indigo-700 font-bold hover:bg-indigo-100 hover:border-indigo-200 transition-all shadow-sm active:scale-95 active:bg-indigo-200"
           >
              {isFetchingNews ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isFetchingNews ? '获取' : (hasArticles ? '换一批' : '获取')}</span>
           </button>
           
           {/* Toggle Expand/Collapse */}
           {hasArticles && (
               <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                title={isExpanded ? "收起文本" : "查看/编辑原始文本"}
               >
                   {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
               </button>
           )}

           {value && isExpanded && (
            <button 
                onClick={handleClear} 
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                title="清空"
            >
                <Trash2 className="w-4 h-4" />
            </button>
           )}
        </div>
      </div>

      {/* 2. Collapsible Text Area with Grid Transition */}
      <div 
         className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
         <div className="overflow-hidden min-h-0">
            <div className="relative group bg-slate-50/10 h-full">
                <textarea
                className="w-full h-full min-h-[300px] p-6 resize-none outline-none text-slate-600 text-base leading-relaxed font-mono placeholder:text-slate-300 bg-transparent scrollbar-hide"
                placeholder={selectedSourceUrl ? "点击上方“获取”..." : "点击上方“获取”..."}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                />
                
                {!value && !isFetchingNews && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-4 opacity-40">
                        <div className="bg-slate-100 p-4 rounded-full">
                        <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-400 font-serif tracking-widest text-sm">万象待启，静候良言</p>
                    </div>
                )}
            </div>
         </div>
      </div>
      
        {/* Status Toast */}
        {fetchStatus && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-20 whitespace-nowrap">
                {fetchStatus.includes('失败') || fetchStatus.includes('没有') ? <AlertCircle className="w-3 h-3"/> : <Loader2 className="w-3 h-3 animate-spin"/>}
                {fetchStatus}
            </div>
        )}
    </div>
  );
};
