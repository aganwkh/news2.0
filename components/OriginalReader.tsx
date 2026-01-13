
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { RawArticle } from '../types';

interface OriginalReaderProps {
  isOpen: boolean;
  onClose: () => void;
  articles: RawArticle[];
}

export const OriginalReader: React.FC<OriginalReaderProps> = ({ isOpen, onClose, articles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset index when opened
  useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  // Handle scroll to update page number
  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      const index = Math.round(scrollLeft / width);
      setCurrentIndex(index);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-[60] bg-white flex flex-col"
      initial={{ x: '-100%' }}
      animate={{ x: '0%' }}
      exit={{ x: '-100%' }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* 1. Header Bar */}
      <div className="flex-shrink-0 h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-white/95 backdrop-blur safe-top">
        {/* Back Button */}
        <button 
          onClick={onClose}
          className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors py-2 pr-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">返回</span>
        </button>

        {/* Page Indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
             <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600 tabular-nums">
                {currentIndex + 1} / {articles.length}
             </div>
        </div>

        <div className="w-8"></div> {/* Spacer for balance */}
      </div>

      {/* 2. Horizontal Scroll Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide bg-slate-50"
        style={{ scrollBehavior: 'smooth' }}
      >
        {articles.length === 0 ? (
             <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                <p>暂无原文数据</p>
             </div>
        ) : (
            articles.map((article, index) => (
            <div 
                key={index} 
                className="w-full flex-shrink-0 snap-center h-full overflow-y-auto bg-white"
            >
                <div className="max-w-2xl mx-auto px-6 py-8 pb-20">
                {/* Article Header */}
                <div className="mb-8 pb-6 border-b border-slate-100">
                    <span className="inline-block px-2 py-1 mb-3 text-[10px] font-bold tracking-wider text-indigo-500 bg-indigo-50 rounded uppercase">
                        {article.sourceName}
                    </span>
                    <h1 className="text-2xl font-serif font-bold text-slate-900 leading-snug">
                    {article.title}
                    </h1>
                </div>

                {/* Article Body */}
                <article className="prose prose-slate prose-lg max-w-none">
                    {article.content.split('\n').map((para, i) => {
                        const trimmed = para.trim();
                        if (!trimmed) return null;
                        return (
                            <p key={i} className="text-slate-700 text-[17px] leading-8 mb-6 text-justify">
                            {trimmed}
                            </p>
                        );
                    })}
                </article>

                {/* End Marker */}
                <div className="mt-12 flex justify-center opacity-30">
                    <div className="w-16 h-1 bg-slate-300 rounded-full"></div>
                </div>
                </div>
            </div>
            ))
        )}
      </div>
    </motion.div>
  );
};
