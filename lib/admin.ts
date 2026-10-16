import {getAuth} from './auth/server';
import {database} from '@/db/repository';
import {GameError} from './game';
export async function isAdministrator(id:string){
 return (await database()`SELECT user_id FROM app_admins WHERE user_id=${id}::uuid`).length===1;
}
export async function requireAdministrator(){
 const {data,error}=await getAuth().getSession();
 if(error||!data?.user)throw new GameError('Bitte melde dich an, um den Admin-Bereich zu öffnen.',401);
 if(!await isAdministrator(data.user.id))throw new GameError('Dieser Bereich ist nur für die Administration freigegeben.',403);
 return data.user.id;
}
