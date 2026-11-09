import {worldsAccountHref,worldsProjectReturn,worldsRecoveryHref} from '../lib/auth/worlds-link';
import {worldsLoginHref} from '../lib/auth/worlds-link';
import {test} from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {Header} from '../components/header';import {AuthProvider} from '../lib/auth/provider';import {I18nProvider} from '../lib/i18n';
import {AuthDialog} from '../components/auth-dialog';
test('Worlds mode offers a direct sign-in link in both languages; legacy mode keeps existing authentication',()=>{
 const emptyChildren={children:null};
 for(const locale of ['de','en'] as const){
  const view=(enabled:boolean)=>renderToStaticMarkup(createElement(AuthProvider,{...emptyChildren,worldsEnabled:enabled},createElement(I18nProvider,{...emptyChildren,initialLocale:locale},createElement(Header,{onLogin:()=>{}}))));
  const central=view(true);assert.match(central,/href="\/auth\/start\?/);assert.match(central,new RegExp('ui_locales='+locale));assert.doesNotMatch(central,/<button[^>]*login-button/);
  assert.match(view(false),/<button[^>]*login-button/);
 }
});

test('return links preserve known private screens and reject arbitrary redirect targets',()=>{
 assert.equal(new URL(worldsLoginHref('en','/me'),'https://fixture.test').searchParams.get('next'),'/me');
 for(const path of ['//evil.test','https://evil.test','/admin?user=other','/unknown','/\\evil.test']){
  assert.equal(new URL(worldsLoginHref('en',path),'https://fixture.test').searchParams.get('next'),'/auth/worlds-en');
 }
});

test('profile continuation retains reviewed project routes without returning to auth actions or external URLs',()=>{
 assert.equal(worldsAccountHref('en','/me'),'/auth/worlds-en?next=%2Fme');
 for(const value of ['https://foreign.test','//foreign.test','/auth/worlds/profile','/auth/logout','/me?next=external','/auth/worlds'])assert.equal(worldsProjectReturn('en',value),'/en/learn');
 assert.equal(worldsProjectReturn('de','/profile'),'/profile');
 assert.equal(worldsRecoveryHref('en','/me'),'/worlds-migration?lang=en&next=%2Fme');
 assert.equal(worldsRecoveryHref('en','//foreign.test'),'/worlds-migration?lang=en&next=%2Fen%2Flearn');
});

test('only the explicit migration dialog in Worlds mode uses existing credentials; regular sign-in stays a central link',()=>{
 const emptyChildren={children:null};
 for(const locale of ['de','en'] as const){
  const view=(migration:boolean)=>renderToStaticMarkup(createElement(AuthProvider,{...emptyChildren,worldsEnabled:true},createElement(I18nProvider,{...emptyChildren,initialLocale:locale},createElement(AuthDialog,{close:()=>{},migration}))));
  assert.doesNotMatch(view(false),/type="password"|type="email"/);
  const html=view(true);assert.match(html,/type="password"/);assert.match(html,/type="email"/);assert.doesNotMatch(html,/name="name"|Create an account|Jetzt registrieren/);
  assert.match(html,/aria-pressed="true"/);assert.ok(html.includes(locale==='de'?'einmalige Übernahme':'one-time transfer'));
 }
});
