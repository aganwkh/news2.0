
import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { RawArticle } from '../types';

interface BookReaderProps {
  article: RawArticle;
  index: number;
  onClose: () => void;
  layoutId: string;
}

export const BookReader: React.FC<BookReaderProps> = ({ article, index, onClose, layoutId }) => {
  return (
    <motion.div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      onClick={onClose} // Click outside to close
    >
      {/* 
         这里是“飞出来”的那本书。
         layoutId 必须与书架上的书一致。
         animate 控制它展开为全屏书本。
      */}
      <motion.div
        layoutId={layoutId}
        className="relative bg-[#fffcf5] w-full max-w-3xl h-full md:h-[90vh] md:rounded-r-xl shadow-2xl overflow-hidden flex flex-col md:flex-row origin-center"
        onClick={(e) => e.stopPropagation()} // Prevent click through
        style={{ 
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        // 定义打开动画
        initial={{ borderRadius: '2px 4px 4px 2px' }}
        animate={{ 
            borderRadius: '0px',
            transition: { type: 'spring', stiffness: 300, damping: 30 }
        }}
      >
        {/* 左侧：模拟封面翻开后的内页或侧边栏 (Desktop only) */}
        <div className="hidden md:block w-16 bg-[#f0e6d2] border-r border-stone-300 relative shadow-inner flex-shrink-0">
             <div className="absolute inset-y-0 right-0 w-[4px] bg-gradient-to-l from-black/10 to-transparent"></div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            
            {/* Header / Top Page Margin */}
            <div className="h-16 flex items-center justify-between px-6 md:px-10 border-b border-stone-200/50 bg-[#fffcf5]/80 sticky top-0 z-10">
                <span className="font-serif text-xs text-stone-400 tracking-widest uppercase">{article.sourceName}</span>
                <button 
                    onClick={onClose}
                    className="p-2 -mr-2 text-stone-400 hover:text-stone-800 transition-colors rounded-full hover:bg-stone-100"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 scrollbar-hide">
                <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <h1 className="font-serif font-bold text-3xl md:text-4xl text-stone-900 mb-8 leading-tight">
                        {article.title}
                    </h1>

                    <article className="prose prose-stone prose-lg max-w-none">
                         {article.content.split('\n').map((para, i) => {
                             if (!para.trim()) return null;
                             return (
                                 <p key={i} className="mb-6 text-justify leading-loose text-stone-800 font-serif">
                                     {para}
                                 </p>
                             );
                         })}
                    </article>

                    <div className="mt-16 flex justify-center pb-8 opacity-40">
                         <div className="text-xl font-serif text-stone-400">The End</div>
                    </div>
                </motion.div>
            </div>
            
            {/* Bottom Page Number */}
            <div className="h-12 flex items-center justify-center text-stone-400 font-serif text-sm border-t border-stone-100">
                — {index + 1} —
            </div>
        </div>
        
        {/* 中缝阴影 (Gutter Shadow for Skeuomorphism) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none md:left-16"></div>

      </motion.div>
    </motion.div>
  );
};
