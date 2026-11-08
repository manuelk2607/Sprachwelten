import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { database } from "@/db/repository";
import { getAuth } from "./server";
import { createWorldsConfig } from "./worlds";
import {resolveProjectIdentity,requireProjectUser} from "./project-identity";

export const worldsQuery: PgQuery = async (text, values) => database().query(text, values);
export const worldsConfig = () => createWorldsConfig(process.env, worldsQuery);

export async function projectIdentity(request:Request){
  return resolveProjectIdentity(request,worldsConfig(),worldsQuery,async()=>{
    const {data,error}=await getAuth().getSession();
    return {user:data?.user,error};
  });
}
// Existing learning callers use the same resolver as contributions and administration.
export const learningIdentity=projectIdentity;
export async function requireLearningUser(request:Request){return requireProjectUser(await projectIdentity(request));}
