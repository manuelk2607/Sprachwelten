import type {Locale} from '../translations';
export const worldsReturnPaths=['/auth/worlds','/auth/worlds-en','/','/en','/me','/admin','/profile','/lernen','/en/learn'];
export function worldsLoginHref(locale:Locale,next?:string){
 return '/auth/start?'+new URLSearchParams({next:next&&worldsReturnPaths.includes(next)?next:locale==='en'?'/auth/worlds-en':'/auth/worlds',ui_locales:locale});
}
