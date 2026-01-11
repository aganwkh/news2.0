
import React, { useState } from 'react';
import { FileText, Sparkles, Rss, Loader2, Trash2, ChevronRight, Globe, Link as LinkIcon, Shuffle, Eye } from 'lucide-react';

// --- API Configuration ---
// 您的公网地址 (Cpolar) - Python Backend for RSS Fetching ONLY
const API_ENDPOINT = 'https://48f63395.r36.cpolar.top/fetch_feed';

interface ArticleInputProps {
  value: string;
  onChange: (val: string) => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  disabled: boolean;
  hasCachedSummary?: boolean; // New prop to indicate if a summary exists for current text
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

export const ArticleInput: React.FC<ArticleInputProps> = ({ 
  value, 
  onChange, 
  onGenerateSummary, 
  isGeneratingSummary, 
  disabled,
  hasCachedSummary = false
}) => {
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('');
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string>("");

  const handleClear = () => {
    if (confirm('Clear input?')) onChange('');
  };

  const fetchFeed = async (url: string, sourceName: string) => {
    if (isFetchingNews) return;
    setIsFetchingNews(true);
    setFetchStatus(`Connecting to Server...`);
    
    try {
      // 使用您指定的公网地址 /fetch_feed
      // 参数名: rss_url
      const SERVER_API = `${API_ENDPOINT}?rss_url=${encodeURIComponent(url)}`;
      
      console.log("Fetching RSS from:", SERVER_API);

      const response = await fetch(SERVER_API, {
        method: 'GET',
        headers: { 
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true' // 防止某些隧道服务的警告页拦截
        }
      });

      if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();

      if (!data) throw new Error('Empty response');

      let contentToDisplay = "";

      // 逻辑修正：后端只负责爬取 RSS，返回的是文章列表 (Array) 或 纯文本
      // 不再检查 data.summary，因为后端不进行 AI 总结
      if (Array.isArray(data)) {
          // Case 1: 返回了文章列表
          if (data.length === 0) throw new Error('No articles found');
          // 将爬取到的文章拼接成文本，放入输入框，供前端 AI 总结使用
          contentToDisplay = `【Source: ${sourceName}】\n\n` + data.slice(0, 5).map((a: any, i: number) => 
            `# Article ${i + 1}: ${a.title}\n\n${a.content?.trim() || 'Content not available.'}`
          ).join('\n\n---\n\n');
      } else if (typeof data === 'string') {
          // Case 2: 返回纯文本
           contentToDisplay = data;
      } else {
          // Case 3: 未知结构，尝试提取内容
          contentToDisplay = JSON.stringify(data, null, 2);
      }

      onChange(contentToDisplay);
      setFetchStatus('');
    } catch (e: any) {
      console.error("Fetch Error:", e);
      setFetchStatus('Failed to fetch');
      // 显示具体错误信息以便调试 (可选)
      onChange(`Error fetching content: ${e.message}\nCheck if the server is running at ${API_ENDPOINT}`);
      setTimeout(() => setFetchStatus(''), 4000);
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleSelectSource = (url: string) => {
      setSelectedSourceUrl(url);
      if (url) {
          const source = SOURCES.find(s => s.url === url);
          if (source) fetchFeed(url, source.name);
      }
  };

  const handleRandomSource = () => {
      const otherSources = SOURCES.filter(s => s.url !== selectedSourceUrl);
      const randomSource = otherSources[Math.floor(Math.random() * otherSources.length)] || SOURCES[0];
      setSelectedSourceUrl(randomSource.url);
      fetchFeed(randomSource.url, randomSource.name);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full transition-shadow hover:shadow-md overflow-hidden relative">
      
      {/* 1. Top Bar: Source Selection */}
      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600 flex-shrink-0">
            <Rss className="w-4 h-4" />
          </div>
          <select
            value={selectedSourceUrl}
            onChange={(e) => handleSelectSource(e.target.value)}
            disabled={isFetchingNews || disabled}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full cursor-pointer hover:text-indigo-600 transition-colors truncate pr-4"
          >
            <option value="">选择订阅源 / Select Source...</option>
            {SOURCES.map((s) => (
              <option key={s.url} value={s.url}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
           {/* Random Button */}
           <button
             onClick={handleRandomSource}
             disabled={isFetchingNews || disabled}
             className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-md text-slate-600 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
             title="Random Source"
           >
              {isFetchingNews ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">随机</span>
           </button>
           
           {value && (
            <button onClick={handleClear} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Clear">
                <Trash2 className="w-4 h-4" />
            </button>
           )}
        </div>
      </div>

      {/* 2. Main Input Area */}
      <div className="flex-1 relative group">
        <textarea
          className="w-full h-full p-6 resize-none outline-none text-slate-600 text-base leading-relaxed font-mono placeholder:text-slate-300 bg-transparent"
          placeholder="在此粘贴文章内容，或点击上方“随机”按钮..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        
        {/* Helper Overlay when empty */}
        {!value && !isFetchingNews && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                <FileText className="w-16 h-16 text-slate-200" />
            </div>
        )}
        
        {/* Status Toast */}
        {fetchStatus && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-10">
                {fetchStatus === 'Failed to fetch' ? <LinkIcon className="w-3 h-3"/> : <Loader2 className="w-3 h-3 animate-spin"/>}
                {fetchStatus}
            </div>
        )}
      </div>

      {/* 3. Action Footer */}
      <div className="p-4 bg-white border-t border-slate-50">
        <button
          onClick={onGenerateSummary}
          disabled={!value.trim() || isGeneratingSummary || disabled}
          className={`
            w-full h-12 rounded-xl flex items-center justify-center gap-2.5 font-semibold text-[15px] transition-all duration-300
            ${!value.trim() || isGeneratingSummary || disabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : hasCachedSummary 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-[1.01]' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.98]'
            }
          `}
        >
          {isGeneratingSummary ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>正在阅读并生成摘要...</span>
            </>
          ) : hasCachedSummary ? (
            <>
              <Eye className="w-5 h-5" />
              <span>查看已有摘要</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>开始生成摘要</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
