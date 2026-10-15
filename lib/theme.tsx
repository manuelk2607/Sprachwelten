'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
type Theme='light'|'dark';
const ThemeContext=createContext({theme:'light' as Theme,toggleTheme:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}){
  const [theme,setTheme]=useState<Theme>('light');
  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const sync=()=>{const saved=localStorage.getItem('sprachwelten-theme');const next=saved==='light'||saved==='dark'?saved:media.matches?'dark':'light';setTheme(next);document.documentElement.dataset.theme=next;};
    sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);
  },[]);
  const toggleTheme=useCallback(()=>setTheme(current=>{const next=current==='dark'?'light':'dark';localStorage.setItem('sprachwelten-theme',next);document.documentElement.dataset.theme=next;return next;}),[]);
  return <ThemeContext.Provider value={{theme,toggleTheme}}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
