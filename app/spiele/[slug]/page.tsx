import {notFound} from 'next/navigation';
import {GameGuide} from '@/components/game-guide';
import {findGuide,guideMetadata} from '@/lib/seo';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const game=findGuide((await params).slug,'de');if(!game)notFound();return guideMetadata(game,'de');}
export default async function Page({params}:Props){const game=findGuide((await params).slug,'de');if(!game)notFound();return <GameGuide game={game} locale="de"/>;}
