// theme.ts

/**
 * --- Primary Colors ---
 * Central hub for all application-wide color constants.
 */

// Base Colors
export const WHITE: string = '#FFFFFF';
export const BLACK: string = '#000000';
export const BACKGROUND_LIGHT: string = '#f5f5f5'; // Used for screen background
export const CARD_INNER_BACKGROUND: string = WHITE; // Used for inner content cards
export const TEXT_DARK: string = '#333333';
export const TEXT_MEDIUM: string = '#666666';

// Primary Brand Color (Slightly darker, modern blue)
export const BLUE_PRIMARY: string = '#0066CC'; 

// --- Gradient Definitions ---

/**
 * Gradient used for primary call-to-action buttons (e.g., "Start Voice Control")
 */
export const BUTTON_GRADIENT_INACTIVE: string[] = [
    '#004C99', // Darker blue start
    '#00264D', // Even darker blue end
];

/**
 * Gradient used for active/listening state (Green)
 */
export const BUTTON_GRADIENT_ACTIVE: string[] = [
    '#4CAF50', 
    '#388E3C',
];

/**
 * Gradient used for decorative borders around cards/list items (More realistic blue-grey tone)
 */
export const BORDER_GRADIENT: string[] = [
    '#4A8BBF', // Deeper light blue start
    '#2B618E', // Mid-tone blue end
];

// --- Other Component Colors ---

// Color for the mic circle background
export const MIC_CIRCLE_BG: string = '#e6f0fa';

export const Colors = {
    light: {
        text: TEXT_DARK,
        background: WHITE,
        tint: BLUE_PRIMARY,
        icon: TEXT_MEDIUM,
        tabIconDefault: TEXT_MEDIUM,
        tabIconSelected: BLUE_PRIMARY,
    },
    dark: {
        text: WHITE,
        background: BLACK,
        tint: WHITE,
        icon: '#CCCCCC',
        tabIconDefault: '#CCCCCC',
        tabIconSelected: WHITE,
    },
};
