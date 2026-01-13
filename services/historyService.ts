
import { HistoryItem } from "../types";

const HISTORY_KEY = 'commute_brief_history';
const MAX_HISTORY_ITEMS = 50;

export const historyService = {
  getHistory: (): HistoryItem[] => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  },

  saveHistoryItem: (originalText: string, summary: string): HistoryItem | null => {
    try {
      const items = historyService.getHistory();
      
      // Basic logic to extract a title from the original text (First non-empty line)
      const firstLine = originalText.split('\n').find(line => line.trim().length > 0)?.trim() || 'Untitled Summary';
      const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;

      // Duplicate check (simple check based on timestamp or identical text to avoid spamming)
      // Check if the most recent item is identical
      if (items.length > 0 && items[0].originalText === originalText) {
          return null; // Already saved recently
      }

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title,
        originalText,
        summary,
        timestamp: Date.now()
      };

      const updatedItems = [newItem, ...items].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedItems));
      return newItem;
    } catch (e) {
      console.error("Failed to save history", e);
      return null;
    }
  },

  deleteHistoryItem: (id: string): HistoryItem[] => {
    try {
      const items = historyService.getHistory();
      const updatedItems = items.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedItems));
      return updatedItems;
    } catch (e) {
      console.error("Failed to delete history item", e);
      return [];
    }
  },

  clearHistory: () => {
    localStorage.removeItem(HISTORY_KEY);
  }
};
