import {Home} from '@/components/home';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata('Learn languages · Sprachwelten','Practise vocabulary and grammar with flashcards, exercises and personal spaced repetition.','/en/learn','en',{de:'/lernen',en:'/en/learn'});
export default function Page(){return <Home area="learn"/>;}
