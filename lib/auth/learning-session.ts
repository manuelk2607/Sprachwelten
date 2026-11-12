import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { database } from "@/db/repository";
import { getAuth } from "./server";
import { createWorldsConfig } from "./worlds";
import {resolveProjectIdentity,requireProjectUser} from "./project-identity";
import {loadManagedOwner} from './managed-owner';
import type {AuthConfig} from '@worlds-hub/auth';
import {managedTransitionIdentity} from './managed-transition';
import {worldsSessionEventKey} from './session-events';

export const worldsQuery: PgQuery = async (text, values) => database().query(text, values);
export const worldsConfig = () => createWorldsConfig(process.env, worldsQuery);
export const projectManagedOwner=(request:Request,config:AuthConfig)=>loadManagedOwner(request,
 {origin:config.origin,issuer:process.env.NEON_AUTH_BASE_URL!,cookieSecret:process.env.NEON_AUTH_COOKIE_SECRET!},worldsQuery);

export async function projectIdentity(request:Request){
  const config=worldsConfig();
  return resolveProjectIdentity(request,config,worldsQuery,async()=>{
    if(config)return managedTransitionIdentity(request,{origin:config.origin,issuer:process.env.NEON_AUTH_BASE_URL!,cookieSecret:process.env.NEON_AUTH_COOKIE_SECRET!},worldsQuery,worldsSessionEventKey(process.env)?config.issuer:undefined);
    const {data,error}=await getAuth().getSession();
    return {user:data?.user,error};
  });
}
// Existing learning callers use the same resolver as contributions and administration.
export const learningIdentity=projectIdentity;
export async function requireLearningUser(request:Request){return requireProjectUser(await projectIdentity(request));}
