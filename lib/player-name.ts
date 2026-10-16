import {playerName} from './content';
import {getAuth} from './auth/server';
import {GameError} from './game';
export async function resolvePlayerName(value?:string){if(value?.trim())return playerName.parse(value);const {data}=await getAuth().getSession();const name=data?.user?.name?.trim().slice(0,24);if(!name)throw new GameError('Bitte einen Spielnamen eingeben oder anmelden.',422);return playerName.parse(name);}
