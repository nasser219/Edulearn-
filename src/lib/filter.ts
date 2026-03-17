const blocklist = [
  // Common offensive Arabic words (placeholders for real ones)
  'شتم', 'سب', 'بذيء', 'قذر', 'سافل', 'حيوان', 'كلب', 'حمار', 'غبي',
  // Common offensive English words
  'badword1', 'badword2', 'idiot', 'stupid', 'curse'
];

/**
 * Checks if the content contains any blocked words.
 * Returns true if the content is clean, false if it contains offensive language.
 */
export const filterContent = (text: string): boolean => {
  if (!text) return true;
  
  const lowerText = text.toLowerCase();
  return !blocklist.some(word => lowerText.includes(word.toLowerCase()));
};
