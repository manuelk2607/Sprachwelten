import {playerName} from './content';
import {projectIdentity} from './auth/learning-session';
import {GameError} from './game';
export async function resolvePlayerName(request:Request,value?:string){if(value?.trim())return playerName.parse(value);const {user,error}=await projectIdentity(request);if(error)throw new GameError('Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.',503);const name=user?.name?.trim().slice(0,24);if(!name)throw new GameError('Bitte einen Spielnamen eingeben oder anmelden.',422);return playerName.parse(name);}
