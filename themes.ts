import { Theme } from './types';

export const THEMES: Theme[] = [
    {
        name: 'Default',
        colors: {
            light: {
                primary: '47 159 208',      // Victor E. Blue
                secondary: '0 166 156',     // Lake LaSalle
                base100: '243 244 246',     // Tailwind gray-100
                base200: '255 255 255',     // White
                base300: '228 228 228',     // Baird Point
                textPrimary: '0 47 86',     // Harriman Blue
                textSecondary: '102 102 102'// Putnam Gray
            },
            dark: {
                primary: '47 159 208',      // Victor E. Blue
                secondary: '0 166 156',     // Lake LaSalle
                base100: '0 47 86',         // Harriman Blue
                base200: '0 77 122',        // Lighter Harriman Blue
                base300: '0 101 112',       // Niagara Whirlpool
                textPrimary: '228 228 228', // Baird Point
                textSecondary: '156 163 175'// Tailwind gray-400
            }
        }
    },
    {
        name: 'Ocean Depths',
        colors: {
            light: {
                primary: '0 119 182',
                secondary: '0 180 216',
                base100: '240 247 255',
                base200: '255 255 255',
                base300: '202 240 248',
                textPrimary: '3 4 94',
                textSecondary: '144 224 239'
            },
            dark: {
                primary: '144 224 239',
                secondary: '0 180 216',
                base100: '3 4 94',
                base200: '0 29 61',
                base300: '0 53 102',
                textPrimary: '240 247 255',
                textSecondary: '123 195 208'
            }
        }
    },
    {
        name: 'Sunset',
        colors: {
            light: {
                primary: '255 107 107',
                secondary: '255 166 0',
                base100: '255 243 224',
                base200: '255 255 255',
                base300: '255 224 178',
                textPrimary: '96 46 46',
                textSecondary: '191 112 55'
            },
            dark: {
                primary: '255 138 101',
                secondary: '255 183 77',
                base100: '69 21 21',
                base200: '96 46 46',
                base300: '142 68 68',
                textPrimary: '255 236 217',
                textSecondary: '255 204 128'
            }
        }
    },
    {
        name: 'Forest',
        colors: {
            light: {
                primary: '76 175 80',
                secondary: '139 195 74',
                base100: '232 245 233',
                base200: '255 255 255',
                base300: '200 230 201',
                textPrimary: '27 94 32',
                textSecondary: '85 139 47'
            },
            dark: {
                primary: '129 199 132',
                secondary: '174 213 129',
                base100: '12 50 16',
                base200: '27 94 32',
                base300: '56 142 60',
                textPrimary: '232 245 233',
                textSecondary: '197 225 165'
            }
        }
    },
    {
        name: 'Monochrome',
        colors: {
            light: {
                primary: '33 33 33',
                secondary: '97 97 97',
                base100: '250 250 250',
                base200: '255 255 255',
                base300: '245 245 245',
                textPrimary: '0 0 0',
                textSecondary: '117 117 117'
            },
            dark: {
                primary: '224 224 224',
                secondary: '158 158 158',
                base100: '33 33 33',
                base200: '66 66 66',
                base300: '97 97 97',
                textPrimary: '255 255 255',
                textSecondary: '189 189 189'
            }
        }
    }
];

export const DEFAULT_THEME = THEMES[0];