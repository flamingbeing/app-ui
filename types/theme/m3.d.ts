/** @param {string} h @returns {[number, number, number]}  OKLCH of a hex colour: lightness, chroma, hue (degrees) */
export function oklch(h: string): [number, number, number];
/** @param {string} h @returns {number}  a colour's tone: its CIELAB L* */
export function toneOf(h: string): number;
/**
 * The colour of a hue and chroma at a tone: chroma brought down (never the tone) until it fits in sRGB.
 * @param {number} hue  OKLCH degrees @param {number} chroma  OKLCH chroma @param {number} tone  0 to 100 @returns {string}
 */
export function toneColour(hue: number, chroma: number, tone: number): string;
/** @param {string} seed @returns {Record<'primary' | 'secondary' | 'tertiary' | 'neutral' | 'variant' | 'error', TonalPalette>} */
export function tonalPalettes(seed: string): Record<"primary" | "secondary" | "tertiary" | "neutral" | "variant" | "error", TonalPalette>;
/**
 * Every Material 3 colour role for a seed, as a map role -> hex (primary, on-primary, primary-container,
 * on-primary-container and the same for secondary, tertiary and error; the surfaces and their containers; outline;
 * the inverse colours).
 * @param {string} seed @param {boolean} dark @returns {Record<string, string>}
 */
export function roles(seed: string, dark: boolean): Record<string, string>;
/**
 * The page palette (colour.js's tokens) in Material's roles, plus every role as an m3-* token for android.css: the page
 * is a surface container with lists and cards on the lightest surface (light) or a raised one (dark), text on-surface,
 * the accent primary, selection the secondary container. OLED: black page, the lowest container for cards.
 * Status colours ok / warn stay the kit's (Material has none).
 * @param {string} seed @param {{ dark?: boolean, oled?: boolean, status: Record<string, string> }} opts
 * @returns {Record<string, string>}
 */
export function m3Palette(seed: string, { dark, oled, status }: {
    dark?: boolean;
    oled?: boolean;
    status: Record<string, string>;
}): Record<string, string>;
export function tonal(hue: number, chroma: number): TonalPalette;
export type TonalPalette = (tone: number) => string;
