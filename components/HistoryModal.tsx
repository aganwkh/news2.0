
import React, { useEffect, useState } from 'react';
import { X, Clock, Calendar, Trash2, ChevronRight, FileText } from 'lucide-react';
import { HistoryItem } from '../types';
import { historyService } from '../services/historyService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  language: 'zh-CN' | 'en-US';
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelect, language }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(historyService.getHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(language === 'zh-CN' ? '确定删除这条记录吗？' : 'Delete this item?')) {
        const updated = historyService.deleteHistoryItem(id);
        setHistory(updated);
    }
  };

  const handleClearAll = () => {
      if (confirm(language === 'zh-CN' ? '确定清空所有阅历吗？' : 'Clear all history?')) {
          historyService.clearHistory();
          setHistory([]);
      }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    // Within 24 hours show relative time or time string
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const t = language === 'zh-CN' ? {
      title: '阅历',
      empty: '暂无阅读记录',
      clear: '清空',
      read: '阅读'
  } : {
      title: 'History',
      empty: 'No history yet',
      clear: 'Clear All',
      read: 'Read'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            {t.title}
          </h2>
          <div className="flex items-center gap-2">
             {history.length > 0 && (
                 <button onClick={handleClearAll} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                     <Trash2 className="w-4 h-4" />
                 </button>
             )}
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
           {history.length === 0 ? (
               <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
                   <Calendar className="w-8 h-8 opacity-20" />
                   <p className="text-sm">{t.empty}</p>
               </div>
           ) : (
               history.map(item => (
                   <div 
                     key={item.id}
                     onClick={() => onSelect(item)}
                     className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
                   >
                       <div className="flex justify-between items-start gap-4">
                           <div className="flex-1 min-w-0">
                               <h3 className="font-bold text-slate-800 text-sm line-clamp-1 mb-1">{item.title}</h3>
                               <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.summary.replace(/\n/g, ' ')}</p>
                               <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                                   <Clock className="w-3 h-3" />
                                   <span>{formatDate(item.timestamp)}</span>
                               </div>
                           </div>
                           <button 
                              onClick={(e) => handleDelete(e, item.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                           >
                               <Trash2 className="w-4 h-4" />
                           </button>
                       </div>
                   </div>
               ))
           )}
        </div>
        
      </div>
    </div>
  );
};
