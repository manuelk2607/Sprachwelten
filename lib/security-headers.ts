export function securityHeaders(response:Response){
  const secured=new Response(response.body,response);
  secured.headers.set('X-Content-Type-Options','nosniff');
  secured.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  if(secured.headers.get('Content-Type')?.includes('text/html')){
    // Deliberately scoped to embedding and object/base navigation. The framework
    // and managed auth keep their existing script/connect policies.
    secured.headers.append('Content-Security-Policy',"frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  }
  return secured;
}
