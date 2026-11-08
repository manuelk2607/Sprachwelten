import {account} from './http';
import {database} from '@/db/repository';
import {GameError} from './game';
export async function isAdministrator(id:string){
 return (await database()`SELECT user_id FROM app_admins WHERE user_id=${id}::uuid`).length===1;
}
export async function requireAdministrator(request:Request){
 const user=await account(request);
 if(!await isAdministrator(user.id))throw new GameError('Dieser Bereich ist nur für die Administration freigegeben.',403);
 return user.id;
}
