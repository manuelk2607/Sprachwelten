export async function audioBucket():Promise<R2Bucket|undefined>{
  try{const {env}=await import('cloudflare:workers');return (env as Cloudflare.Env&{AUDIO?:R2Bucket}).AUDIO;}catch{return undefined;}
}
