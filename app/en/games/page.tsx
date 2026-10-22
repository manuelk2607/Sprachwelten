import {GuideIndex} from '@/components/game-guide';
import {indexMetadata} from '@/lib/seo';
export const metadata=indexMetadata('en');
export default function Page(){return <GuideIndex locale="en"/>;}
