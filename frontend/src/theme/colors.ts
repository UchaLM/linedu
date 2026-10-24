export interface Palette {
  background: string;
  card: string;
  cardLight: string;
  primary: string;
  primarySoft: string; // fondo translúcido del color primario
  primaryMedium: string;
  onPrimary: string; // texto o icono sobre un fondo primario
  text: string;
  textMuted: string;
  border: string;
  blockBackground: string;
  blockBorder: string;
  danger: string;
  dangerSoft: string;
}

export const darkColors: Palette = {
  background: '#0a0a0a',
  card: '#151515',
  cardLight: '#1f1f1f',
  primary: '#39FF14', // Neon Green
  primarySoft: 'rgba(57, 255, 20, 0.1)',
  primaryMedium: 'rgba(57, 255, 20, 0.4)',
  onPrimary: '#0a0a0a',
  text: '#ffffff',
  textMuted: '#888888',
  border: '#333333',
  blockBackground: '#1a1a1a',
  blockBorder: '#2a2a2a',
  danger: '#ff4d4d',
  dangerSoft: 'rgba(255, 77, 77, 0.1)',
};

// El verde neón no se lee sobre fondo claro: se usa una variante más oscura del mismo verde.
export const lightColors: Palette = {
  background: '#f4f5f7',
  card: '#ffffff',
  cardLight: '#e8eaee',
  primary: '#0b9a2b',
  primarySoft: 'rgba(11, 154, 43, 0.1)',
  primaryMedium: 'rgba(11, 154, 43, 0.4)',
  onPrimary: '#ffffff',
  text: '#111418',
  textMuted: '#5f6670',
  border: '#d3d7dd',
  blockBackground: '#ffffff',
  blockBorder: '#d3d7dd',
  danger: '#d92d20',
  dangerSoft: 'rgba(217, 45, 32, 0.1)',
};
