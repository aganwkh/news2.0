
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { RawArticle } from '../types';

interface ScrollReaderProps {
  article: RawArticle;
  index: number;
  onClose: () => void;
  layoutId: string;
}

// 基础宣纸纹理
const PAPER_TEXTURE = `url("https://www.transparenttextures.com/patterns/cream-paper.png")`;

// 锦缎纹理：模拟织物经纬线
const SILK_PATTERN = `
repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px),
repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)
`;

// 洒金点缀：模拟金箔碎片
const GOLD_FLECKS = `
radial-gradient(circle at 10% 20%, rgba(212, 175, 55, 0.4) 1px, transparent 1.5px),
radial-gradient(circle at 90% 80%, rgba(212, 175, 55, 0.3) 1.5px, transparent 2px),
radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.2) 1px, transparent 1.5px),
radial-gradient(circle at 30% 70%, rgba(212, 175, 55, 0.3) 2px, transparent 2.5px)
`;

// 辅助组件：宫灯形青玉轴头
const JadeCap = ({ side }: { side: 'left' | 'right' }) => (
    <div 
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-6 md:w-5 md:h-8 shadow-md z-50
            ${side === 'left' ? '-left-3 md:-left-4' : '-right-3 md:-right-4'}
        `}
        style={{
            // 宫灯造型：利用圆角差异
            borderRadius: side === 'left' ? '4px 2px 2px 4px' : '2px 4px 4px 2px',
            // 青玉材质
            background: 'radial-gradient(circle at 30% 20%, #e0f2f1 0%, #4db6ac 40%, #00695c 100%)',
            boxShadow: 'inset 0 0 2px rgba(255,255,255,0.5), 0 4px 6px rgba(0,0,0,0.4)'
        }}
    >
        {/* 顶部装饰扣 (金色) */}
        <div className={`absolute top-[10%] ${side === 'left' ? 'right-0' : 'left-0'} w-[2px] h-[80%] bg-[#b8860b] opacity-80`}></div>
        {/* 高光点 */}
        <div className="absolute top-[20%] left-[20%] w-[3px] h-[3px] bg-white rounded-full blur-[1px] opacity-90"></div>
    </div>
);

export const ScrollReader: React.FC<ScrollReaderProps> = ({ article, index, onClose, layoutId }) => {
  return (
    <motion.div 
        className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-8"
        initial={{ backgroundColor: "rgba(0,0,0,0)" }}
        animate={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        exit={{ backgroundColor: "rgba(0,0,0,0)", transition: { duration: 0.2 } }}
        onClick={onClose}
    >
      <motion.div
        layoutId={layoutId}
        className="relative w-full max-w-3xl h-full md:h-[95vh] flex flex-col z-50"
        onClick={(e) => e.stopPropagation()}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
      >
        
        {/* === 1. 上方天杆 (Top Rod) === */}
        <motion.div 
             layoutId={`${layoutId}-top-rod`}
             className="flex-shrink-0 h-3 w-[100%] mx-auto rounded-full z-40 relative flex items-center justify-center"
             style={{
                 background: 'linear-gradient(to bottom, #3e2723 0%, #5d4037 45%, #271c19 100%)',
                 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
             }}
        >
             <JadeCap side="left" />
             <JadeCap side="right" />
             
             {/* 轴杆高光 */}
             <div className="absolute top-[1px] left-2 right-2 h-[1px] bg-white/20 rounded-full"></div>
             
             {/* 挂绳 */}
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="absolute left-1/2 -top-[100vh] bottom-1 w-[2px] bg-stone-800/80 -translate-x-1/2"
             />
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="absolute left-1/2 top-[-4px] w-6 h-3 border-t-[3px] border-stone-800 rounded-full -translate-x-1/2"
             />
        </motion.div>

        {/* === 2. 卷轴主体 (Body) === */}
        <motion.div
           layoutId={`${layoutId}-paper`}
           className="flex-1 w-full mx-auto relative overflow-hidden flex flex-row shadow-2xl mt-[-6px] pt-[6px]"
           style={{ backgroundColor: 'transparent' }}
        >
            {/* 
               左侧锦缎装裱 (Left Silk Border) 
               颜色：深青 (Dark Cyan) + 纹理
            */}
            <div 
                className="w-3 md:w-4 flex-shrink-0 h-full relative z-20 border-r border-black/10"
                style={{
                    backgroundColor: '#263238', // Blue Grey
                    backgroundImage: SILK_PATTERN,
                    boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3)' 
                }}
            ></div>

            {/* 
               中间宣纸 (Main Paper) 
               材质：米黄 + 洒金 + 纸纹
            */}
            <div 
                className="flex-1 bg-[#fdfbf7] relative flex flex-col overflow-hidden"
                style={{ 
                    backgroundImage: `${GOLD_FLECKS}, ${PAPER_TEXTURE}`,
                    backgroundSize: '200px 200px, auto',
                    // 物理阴影：纸张稍微凹陷于锦缎之下，或锦缎压在纸上
                    boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.1), inset -2px 0 6px rgba(0,0,0,0.1)' 
                }}
            >
                {/* 顶部阴影，模拟天杆压痕 */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/15 to-transparent pointer-events-none z-10"></div>

                {/* Close Button */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                    transition={{ delay: 0.3 }}
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-stone-400 hover:text-red-900 transition-colors z-40 rounded-full hover:bg-stone-100/50"
                >
                    <X className="w-6 h-6" />
                </motion.button>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto scrollbar-hide relative z-0 pb-8">
                    <div className="p-6 md:p-12 min-h-full">
                        {/* Header Info */}
                        <div className="mb-10 text-center border-b border-stone-300 pb-8 border-dashed relative">
                            
                            {/* 来源标签 */}
                            <motion.div 
                                layoutId={`${layoutId}-source`}
                                className="inline-block px-3 py-1 text-xs text-stone-500 font-serif tracking-widest border border-stone-300 rounded-sm mb-4"
                            >
                                {article.sourceName}
                            </motion.div>

                            {/* 标题区域 + 朱文印章 */}
                            <div className="relative inline-block w-full">
                                <motion.h1 
                                    layoutId={`${layoutId}-title`}
                                    className="text-2xl md:text-4xl font-bold text-stone-900 leading-snug px-4 inline-block relative z-10"
                                    style={{ fontFamily: '"KaiTi", "STKaiti", "Georgia", serif' }}
                                >
                                    {article.title}
                                </motion.h1>

                                {/* 
                                   朱文印章 (Red Seal)
                                   "御览" (Imperial Inspection)
                                */}
                                <motion.div 
                                    initial={{ opacity: 0, scale: 1.5, rotate: 10 }}
                                    animate={{ opacity: 0.8, scale: 1, rotate: 4 }}
                                    transition={{ delay: 0.4, type: 'spring' }}
                                    className="absolute -right-2 -bottom-2 md:-right-8 md:-bottom-4 w-12 h-12 md:w-16 md:h-16 border-[3px] border-red-800/60 rounded-sm flex items-center justify-center pointer-events-none mix-blend-multiply select-none"
                                    style={{
                                        // 模拟印泥不均匀
                                        background: 'radial-gradient(circle, rgba(185, 28, 28, 0.1) 0%, transparent 80%)',
                                        maskImage: 'url("https://www.transparenttextures.com/patterns/grunge-wall.png")', 
                                        WebkitMaskImage: 'url("https://www.transparenttextures.com/patterns/grunge-wall.png")'
                                    }}
                                >
                                    <div className="grid grid-cols-2 gap-0.5 p-1 w-full h-full">
                                        {/* 模拟篆书：御览 */}
                                        <div className="border-r border-b border-red-800/50 flex items-center justify-center text-red-900 font-serif text-xs md:text-sm font-bold">御</div>
                                        <div className="border-b border-red-800/50 flex items-center justify-center text-red-900 font-serif text-xs md:text-sm font-bold">览</div>
                                        <div className="border-r border-red-800/50 flex items-center justify-center text-red-900 font-serif text-xs md:text-sm font-bold">之</div>
                                        <div className="flex items-center justify-center text-red-900 font-serif text-xs md:text-sm font-bold">宝</div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Article Body */}
                        <motion.article 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5, transition: { duration: 0.1 } }} 
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="prose prose-stone prose-lg max-w-none"
                        >
                             {article.content.split('\n').map((para, i) => {
                                 if (!para.trim()) return null;
                                 return (
                                     <p key={i} className="mb-6 text-justify leading-loose text-stone-800 font-serif text-lg">
                                         {para}
                                     </p>
                                 );
                             })}
                        </motion.article>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            transition={{ delay: 0.5 }}
                            className="mt-20 flex flex-col items-center justify-center opacity-60 gap-2"
                        >
                             <div className="w-1 h-16 bg-gradient-to-b from-stone-300 to-transparent"></div>
                             <div className="text-sm font-serif text-stone-400">万象志 · 珍藏</div>
                        </motion.div>
                    </div>
                </div>

                {/* 纸张底部连接处阴影 */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0, transition: { duration: 0.1 } }} 
                    className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
                    style={{
                        background: 'linear-gradient(to bottom, transparent 0%, rgba(62, 39, 35, 0.05) 50%, rgba(40, 20, 10, 0.25) 90%, rgba(0,0,0,0.5) 100%)',
                    }}
                >
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black/40"></div>
                </motion.div>
            </div>

            {/* 
               右侧锦缎装裱 (Right Silk Border) 
            */}
            <div 
                className="w-3 md:w-4 flex-shrink-0 h-full relative z-20 border-l border-black/10"
                style={{
                    backgroundColor: '#263238', 
                    backgroundImage: SILK_PATTERN,
                    boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.3)'
                }}
            ></div>

        </motion.div>

        {/* === 3. 底部卷轴 (Bottom Rod) === */}
        <motion.div 
             layoutId={`${layoutId}-bottom-rod`}
             className="flex-shrink-0 h-4 w-[100%] mx-auto rounded-full z-30 relative flex items-center justify-center"
             style={{
                 background: 'linear-gradient(to bottom, #3e2723 0%, #5d4037 45%, #271c19 100%)',
                 boxShadow: '0 4px 10px -1px rgba(0, 0, 0, 0.6)'
             }}
        >
             <JadeCap side="left" />
             <JadeCap side="right" />

             {/* 光影高光 */}
             <div className="absolute top-[1px] left-2 right-2 h-[1px] bg-white/20 rounded-full"></div>
        </motion.div>

      </motion.div>
    </motion.div>
  );
};
