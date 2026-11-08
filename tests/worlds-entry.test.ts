import {worldsLoginHref} from '../lib/auth/worlds-link';
import {test} from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {Header} from '../components/header';import {AuthProvider} from '../lib/auth/provider';import {I18nProvider} from '../lib/i18n';
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
