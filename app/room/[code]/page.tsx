import {privateMetadata} from '@/lib/seo';
export const metadata=privateMetadata;
import { notFound } from 'next/navigation';
import { GameRoom } from '@/components/game-room';
export default async function RoomPage({params}:{params:Promise<{code:string}>}) { const {code}=await params; if(!/^[A-Z0-9]{6}$/.test(code))notFound();return <GameRoom code={code}/>; }
