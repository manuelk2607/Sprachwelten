import type {Locale} from '../translations';
export function worldsLoginHref(locale:Locale){
 return '/auth/start?'+new URLSearchParams({next:locale==='en'?'/auth/worlds-en':'/auth/worlds',ui_locales:locale});
}
