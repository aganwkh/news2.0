
import React from 'react';
import { motion } from 'framer-motion';
import { RawArticle } from '../types';

interface ScrollItemProps {
  article: RawArticle;
  index: number;
  onClick: () => void;
  layoutId: string;
}

// 宣纸纹理
const PAPER_TEXTURE = `url("https://www.transparenttextures.com/patterns/cream-paper.png")`;

export const ScrollItem: React.FC<ScrollItemProps> = ({ article, index, onClick, layoutId }) => {
  return (
    <div className="relative group w-full max-w-md mx-auto mb-2 px-1">
      {/* 
        Compact Mini Scroll
        Wrapper handles the "Slide In" entrance animation independently.
        This prevents the 'x' transform from conflicting with the layoutId morphing when ScrollReader closes.
      */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ 
            delay: index * 0.1, 
            type: "spring", 
            stiffness: 100, 
            damping: 20 
        }}
        className="relative z-10"
      >
        <motion.div
            layoutId={layoutId}
            onClick={onClick}
            className="relative flex flex-col cursor-pointer origin-top"
            whileTap={{ scale: 0.98 }}
        >
            
            {/* === 1. Top Hanging Rod (Very thin) === */}
            <motion.div 
                layoutId={`${layoutId}-top-rod`}
                className="h-1 w-[96%] mx-auto rounded-full bg-stone-700/80 shadow-sm z-10"
            />

            {/* === 2. Exposed Paper Strip === */}
            <motion.div
            layoutId={`${layoutId}-paper`}
            className="relative w-[92%] mx-auto bg-[#fdfbf7] shadow-sm overflow-hidden border-x border-stone-300/30 flex items-center mt-[-1px]"
            style={{ 
                backgroundImage: PAPER_TEXTURE,
                height: '46px', // Fixed height for compact look
            }}
            >
                {/* Content Container */}
                <motion.div 
                    layoutId={`${layoutId}-content-wrapper`}
                    className="w-full px-3 flex items-center justify-between gap-3"
                >
                    {/* Left: Source & Title */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <motion.div 
                            layoutId={`${layoutId}-source`}
                            className="shrink-0 px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded-[2px] text-[9px] text-stone-600 font-serif tracking-tight whitespace-nowrap"
                        >
                            {article.sourceName.slice(0, 4)}
                        </motion.div>
                        
                        <motion.h3 
                            layoutId={`${layoutId}-title`}
                            className="text-[14px] font-bold text-stone-800 leading-none truncate pt-0.5"
                            style={{ fontFamily: '"KaiTi", "STKaiti", "Georgia", serif' }}
                        >
                            {article.title}
                        </motion.h3>
                    </div>
                    
                    {/* Right: Index */}
                    <div className="text-stone-300 text-[10px] font-serif font-bold tracking-widest shrink-0 select-none">
                        {['壹','贰','叁','肆','伍','陆','柒','捌','玖','拾'][index % 10]}
                    </div>
                </motion.div>
                
                {/* Bottom Shadow Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
            </motion.div>

            {/* === 3. Bottom Roller (The main cylinder) === */}
            <motion.div 
                layoutId={`${layoutId}-bottom-rod`}
                className="relative h-6 w-full rounded-full shadow-md z-20 flex items-center justify-center mt-[-1px]"
                style={{
                    background: 'linear-gradient(to bottom, #5d4037 0%, #8d6e63 50%, #4e342e 100%)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                }}
            >
                <div className="absolute top-[2px] bottom-[2px] left-2 right-2 bg-white/10 rounded-full blur-[0.5px]"></div>
                
                {/* End Caps */}
                <div className="absolute left-[-2px] top-0 bottom-0 w-3 rounded-l-sm bg-[#3e2723] border-r border-[#3e2723]/50"></div>
                <div className="absolute right-[-2px] top-0 bottom-0 w-3 rounded-r-sm bg-[#3e2723] border-l border-[#3e2723]/50"></div>
            </motion.div>

        </motion.div>
      </motion.div>
    </div>
  );
};
