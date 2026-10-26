import {neon} from '@neondatabase/serverless';
import {maintainAudio} from './audio-maintenance';

export async function maintainDatabase(databaseUrl:string){
  const sql=neon(databaseUrl);
  // Bounded batches protect scheduled Worker limits. Presence follows the room FK.
  const [rooms,limits,attempts]=await sql.transaction([
    sql`DELETE FROM game_rooms WHERE code IN (SELECT code FROM game_rooms WHERE expires_at<=now() ORDER BY expires_at LIMIT 1000) RETURNING code`,
    sql`DELETE FROM request_limits WHERE key IN (SELECT key FROM request_limits WHERE expires_at<now()-interval '1 day' ORDER BY expires_at LIMIT 1000) RETURNING key`,
    sql`DELETE FROM learning_attempts WHERE id IN (SELECT id FROM learning_attempts WHERE expires_at<now() ORDER BY expires_at LIMIT 1000) RETURNING id`,
  ]);
  return {expiredRooms:rooms.length,expiredLimits:limits.length,expiredLearningAttempts:attempts.length};
}

export async function maintainApplication(databaseUrl:string,bucket:R2Bucket){
  const database=await maintainDatabase(databaseUrl);
  return {...database,audio:await maintainAudio(databaseUrl,bucket)};
}
