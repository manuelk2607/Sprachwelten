import {Home} from '@/components/home';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('Sprachen lernen · Sprachwelten','Vokabeln und Grammatik mit Lernkarten, Übungen und persönlichen Wiederholungen festigen.','/lernen','de',{de:'/lernen',en:'/en/learn'});
export default function Page(){return <Home area="learn"/>;}
