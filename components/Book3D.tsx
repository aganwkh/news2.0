
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { RawArticle } from '../types';

interface Book3DProps {
  article: RawArticle;
  index: number;
  onClick: () => void;
  layoutId: string;
}

// 莫兰迪色系 (Morandi Palette)
const MORANDI_PALETTE = [
  { bg: '#3F4E4F', text: '#E7F6F2' }, // 墨绿灰
  { bg: '#8D7B68', text: '#F1E9D7' }, // 褐土
  { bg: '#5F7161', text: '#EFEAD8' }, // 橄榄灰
  { bg: '#6D6875', text: '#E5989B' }, // 灰紫
  { bg: '#B5838D', text: '#FFCDB2' }, // 干枯玫瑰
  { bg: '#778DA9', text: '#E0E1DD' }, // 雾霾蓝
  { bg: '#CB997E', text: '#FFE8D6' }, // 陶土色
];

// 噪点纹理
const NOISE_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`;

export const Book3D: React.FC<Book3DProps> = ({ article, index, onClick, layoutId }) => {
  
  const theme = useMemo(() => MORANDI_PALETTE[index % MORANDI_PALETTE.length], [index]);
  // 尺寸调整：稍微缩小一点，更精致
  const thickness = useMemo(() => Math.max(16, Math.min(28, 16 + article.content.length / 400)), [article.content]);

  return (
    <div className="relative flex flex-col items-center group perspective-[800px]">
      <motion.div
        layoutId={layoutId}
        // 关键修改：w-full 但限制 max-w，让它在网格里更像书而不是大方块
        className="relative cursor-pointer w-full aspect-[2/3] max-w-[130px] sm:max-w-[140px]"
        onClick={onClick}
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateY: 0, rotateX: 0 }}
        whileHover={{ 
            translateY: -8, 
            rotateY: -10, 
            rotateX: 5,
            transition: { duration: 0.3, ease: "easeOut" } 
        }}
        whileTap={{ scale: 0.96 }}
      >
        {/* === 3D BOOK STRUCTURE === */}
        
        {/* 1. Spine (Left Edge) */}
        <div 
            className="absolute top-0 bottom-0 left-0 origin-right"
            style={{
                width: thickness,
                backgroundColor: theme.bg,
                transform: `translateX(-${thickness}px) rotateY(-90deg)`,
                transformOrigin: 'right',
                filter: 'brightness(0.85)', // 稍微提亮一点
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.15), transparent)',
            }}
        />

        {/* 2. Pages (Right Edge) - 修复 Gap 问题 */}
        <div
            className="absolute top-0 bottom-0 right-0 bg-[#fdfbf7] origin-left border-l border-black/5"
            style={{
                width: thickness - 1, // 微调宽度以防溢出
                transform: `translateX(${thickness}px) rotateY(-90deg) translateZ(${thickness - 2}px)`,
                transformOrigin: 'left',
                backgroundImage: `repeating-linear-gradient(90deg, #e5e5e5 0px, #e5e5e5 1px, transparent 1px, transparent 3px)`,
                boxShadow: 'inset 3px 0 6px -3px rgba(0,0,0,0.1)'
            }}
        />

        {/* 3. Front Cover - 移除引起白线的 border-t */}
        <div 
            className="absolute inset-0 shadow-xl rounded-r-[2px] rounded-l-[1px] overflow-hidden flex flex-col"
            style={{
                backgroundColor: theme.bg,
                transform: 'translateZ(0)',
            }}
        >
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay" style={{ backgroundImage: NOISE_TEXTURE }}></div>
            <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none"></div>

            {/* 移除了 border-t 和 border-r，解决白线问题 */}
            <div className="relative z-10 flex-1 p-3 flex flex-col justify-between h-full">
                {/* Source Tag */}
                <div className="flex items-start">
                    <span 
                        className="text-[8px] font-bold tracking-wider uppercase px-1 py-0.5 border border-white/20 rounded-[2px]"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                    >
                        {article.sourceName.slice(0, 8)}
                    </span>
                </div>

                {/* Title */}
                <div className="mt-1 mb-auto pt-2">
                    <h3 
                        className="font-serif font-bold text-[13px] leading-tight line-clamp-4 drop-shadow-sm"
                        style={{ color: theme.text }}
                    >
                        {article.title}
                    </h3>
                </div>

                {/* Footer Decor */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between opacity-50">
                    <span className="text-[8px] text-white font-serif">{index + 1}</span>
                    <div className="w-1 h-1 bg-white rounded-full" />
                </div>
            </div>

            {/* Gloss - 稍微调淡，避免边缘发白 */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
        </div>

        {/* 4. Shadow */}
        <div 
            className="absolute -bottom-3 left-1 right-1 h-3 bg-black/30 blur-md rounded-[50%]"
            style={{ transform: 'rotateX(90deg) translateZ(-8px)' }}
        ></div>

      </motion.div>

      {/* Shelf Line */}
      <div className="absolute -bottom-[16px] left-[-15%] right-[-15%] h-[4px] bg-gradient-to-b from-stone-400/20 to-transparent rounded-full blur-[1px]"></div>
    </div>
  );
};
