
import React from 'react';
import { RawArticle } from '../types';
import { ScrollItem } from './ScrollItem';
import { AnimatePresence } from 'framer-motion';

interface BookshelfProps {
  articles: RawArticle[];
  onBookClick: (article: RawArticle, index: number) => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({ articles, onBookClick }) => {
  return (
    <div className="w-full px-2 pt-2 pb-24">
      <div className="flex flex-col items-center max-w-md mx-auto">
        <AnimatePresence mode='popLayout'>
          {articles.map((article, index) => (
             <ScrollItem 
                key={index} 
                article={article} 
                index={index} 
                onClick={() => onBookClick(article, index)}
                layoutId={`scroll-${index}`}
              />
          ))}
        </AnimatePresence>
        
        {/* End of list decoration */}
        {articles.length > 0 && (
            <div className="mt-6 opacity-20 flex flex-col items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                <div className="w-1 h-1 rounded-full bg-stone-500"></div>
            </div>
        )}
      </div>
    </div>
  );
};
