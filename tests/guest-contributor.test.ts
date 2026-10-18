import test from 'node:test';
import assert from 'node:assert/strict';
import {guestCredential,withGuestCredential} from '../lib/guest-contributor';
const token='a'.repeat(64);
test('guest credentials accept only an opaque token and never take account IDs from input',()=>{
  for(const value of ['guest:someone','account-id','a'.repeat(63),'A'.repeat(64),'a'.repeat(65)])assert.equal(guestCredential(new Request('https://example.com/api/audio',{headers:{cookie:'sprachwelten_contributor='+value}})),undefined);
  assert.equal(guestCredential(new Request('https://example.com/api/audio',{headers:{cookie:'unrelated=1; sprachwelten_contributor='+token}})),token);
});
test('guest audio credentials stay private, same-site and secure without refreshing on each request',()=>{
  const request=new Request('https://example.com/api/entries'),response=withGuestCredential(new Response(),request,token),cookie=response.headers.get('set-cookie')!;
  for(const flag of ['HttpOnly','SameSite=Strict','Secure','Path=/api','Max-Age=2592000'])assert.ok(cookie.includes(flag));
  assert.equal(withGuestCredential(new Response(),new Request(request,{headers:{cookie:'sprachwelten_contributor='+token}}),token).headers.get('set-cookie'),null);
  assert.equal(withGuestCredential(new Response(),request).headers.get('set-cookie'),null);
});
