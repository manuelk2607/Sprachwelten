import {notFound} from 'next/navigation';
import {privateMetadata} from '@/lib/seo';
import {worldsConfig} from '@/lib/auth/learning-session';
import {WorldsRecovery} from '@/components/worlds-recovery';
export const metadata={...privateMetadata,referrer:'strict-origin' as const};
export default function Page(){
 if(!worldsConfig())notFound();
 return <WorldsRecovery/>;
}
