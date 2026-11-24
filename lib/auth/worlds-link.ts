import type {Locale} from '../translations';
export const worldsManagedLinkPaths=['/auth/worlds/link','/auth/worlds/confirm'];
export const worldsReturnPaths=['/auth/worlds','/auth/worlds-en','/','/en','/me','/me?area=learn','/admin','/profile','/lernen','/en/learn'];
export function worldsRoomReturn(next?:string|null):next is `/room/${string}` {
 return typeof next==='string'&&next.length===12&&/^\/room\/[A-Z0-9]{6}$/.test(next);
}
export function isWorldsProjectReturn(next?:string|null):next is string {
 return worldsRoomReturn(next)||typeof next==='string'&&worldsReturnPaths.includes(next)&&!next.startsWith('/auth/');
}
export function worldsLoginHref(locale:Locale,next?:string){
 const destination=next&&(worldsReturnPaths.includes(next)||worldsRoomReturn(next))?next:locale==='en'?'/auth/worlds-en':'/auth/worlds';
 return '/auth/start?'+new URLSearchParams({next:destination,ui_locales:locale});
}

export function worldsProjectReturn(locale:Locale,next?:string|null){
 return isWorldsProjectReturn(next)?next:locale==='en'?'/en/learn':'/lernen';
}
export function worldsAccountHref(locale:Locale,next?:string){
 return (locale==='en'?'/auth/worlds-en':'/auth/worlds')+'?'+new URLSearchParams({next:worldsProjectReturn(locale,next)});
}
export function worldsRecoveryHref(locale:Locale,next?:string){
 return '/worlds-migration?'+new URLSearchParams({lang:locale,next:worldsProjectReturn(locale,next)});
}
