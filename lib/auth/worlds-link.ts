import type {Locale} from '../translations';
export const worldsReturnPaths=['/auth/worlds','/auth/worlds-en','/','/en','/me','/admin','/profile','/lernen','/en/learn'];
export function worldsLoginHref(locale:Locale,next?:string){
 return '/auth/start?'+new URLSearchParams({next:next&&worldsReturnPaths.includes(next)?next:locale==='en'?'/auth/worlds-en':'/auth/worlds',ui_locales:locale});
}

export function worldsProjectReturn(locale:Locale,next?:string|null){
 return next&&worldsReturnPaths.includes(next)&&!next.startsWith('/auth/')?next:locale==='en'?'/en/learn':'/lernen';
}
export function worldsAccountHref(locale:Locale,next?:string){
 return (locale==='en'?'/auth/worlds-en':'/auth/worlds')+'?'+new URLSearchParams({next:worldsProjectReturn(locale,next)});
}
