import {neon} from '@neondatabase/serverless';
const email=process.argv[2];if(!email?.includes('@'))throw new Error('Pass the existing account email.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
const users=await sql`SELECT id FROM neon_auth."user" WHERE lower(email)=lower(${email})`;
if(users.length!==1)throw new Error('Expected exactly one existing account; no permissions changed.');
await sql`INSERT INTO app_admins(user_id) VALUES (${users[0].id}) ON CONFLICT DO NOTHING`;
console.log('Existing account authorized for application administration.');
