import {GuideIndex} from '@/components/game-guide';
import {indexMetadata} from '@/lib/seo';
export const metadata=indexMetadata('de');
export default function Page(){return <GuideIndex locale="de"/>;}
