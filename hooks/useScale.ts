// hooks/useScale.ts
import { useSettings } from '@/context/settingsContext';

export const useScale = () => {
  const { largeText } = useSettings();

  // This function handles font sizes
  const sText = (normalSize: number, scaleFactor = 1.18) => {
    return largeText ? Math.round(normalSize * scaleFactor) : normalSize;
  };

  // This function handles icon sizes
  const sIcon = (normalSize: number, scaleFactor = 1.12) => {
    return largeText ? Math.round(normalSize * scaleFactor) : normalSize;
  };

  return { sText, sIcon, isLarge: largeText };
};