import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
import {privateMetadata} from '@/lib/seo';
import {worldsConfig} from '@/lib/auth/learning-session';
import {WorldsRecovery} from '@/components/worlds-recovery';
import {translate} from '@/lib/translations';
export async function generateMetadata(){
 const locale=(await headers()).get('x-sprachwelten-locale')==='en'?'en':'de';
 return {...privateMetadata,referrer:'strict-origin' as const,title:translate('Bisheriges Konto übernehmen',locale)};
}
export default function Page(){
 if(!worldsConfig())notFound();
 return <WorldsRecovery/>;
}
