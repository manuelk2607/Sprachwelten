import {notFound,permanentRedirect} from 'next/navigation';
import {GameGuide} from '@/components/game-guide';
import {findGuide,guideMetadata} from '@/lib/seo';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const game=findGuide((await params).slug,'en');if(!game)notFound();return guideMetadata(game,'en');}
export default async function Page({params}:Props){const slug=(await params).slug;const game=findGuide(slug,'en');if(!game)notFound();if(slug!==game.en)permanentRedirect('/en/games/'+game.en);return <GameGuide game={game} locale="en"/>;}
