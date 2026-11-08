import {inboxCount} from '@/db/community-repository';
import {projectIdentity} from '@/lib/auth/learning-session';
import {isAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
export const GET=(request:Request)=>safe(async()=>{
 const {user,error}=await projectIdentity(request);
 if(error)throw error;
 const isAdmin=!!user&&await isAdministrator(user.id);
 return respond({isAdmin,unreadCount:isAdmin?await inboxCount(user!.id):0});
});
