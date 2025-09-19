import React from 'react';
import { SunIcon, MoonIcon } from './Icons';

interface ThemeSwitcherProps {
    isDarkMode: boolean;
    onToggle: () => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ isDarkMode, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-base-300 transition-colors duration-200"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
    );
};