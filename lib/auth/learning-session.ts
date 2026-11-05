import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { readCookie, SESSION_COOKIE } from "@worlds-hub/auth";
import { database } from "@/db/repository";
import { GameError } from "@/lib/game";
import { getAuth } from "./server";
import { createWorldsConfig, hasManagedSessionCookie, mappedLearningUser } from "./worlds";

export const worldsQuery: PgQuery = async (text, values) => database().query(text, values);
export const worldsConfig = () => createWorldsConfig(process.env, worldsQuery);

export async function learningIdentity(request: Request) {
  const config = worldsConfig();
  if (config && readCookie(request, SESSION_COOKIE) && !hasManagedSessionCookie(request))
    return {user: await mappedLearningUser(request, config, worldsQuery), error: null};
  const {data, error} = await getAuth().getSession();
  return {user: data?.user, error};
}

export async function requireLearningUser(request: Request) {
  const {user, error} = await learningIdentity(request);
  if (!user || error) throw new GameError("Bitte melde dich an, um diese Funktion zu nutzen.", 401);
  return user;
}
