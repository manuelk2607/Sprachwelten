import {test,expect} from '@playwright/test';
import {act,createGame,joinGame,viewGame} from '../../lib/game';
import {updateAvailability} from '../../lib/game-pool';
import type {RoomAction} from '../../lib/content';
import {extraSeeds} from '../../lib/extra-seeds';
import {newGameEntries} from '../../lib/new-game-seeds';
const player=()=>({id:crypto.randomUUID(),name:'QA Speech',tokenHash:'qa-only',score:0});
const twister=extraSeeds.find(entry=>entry.kind==='tongue_twister')!,sound=newGameEntries.find(entry=>entry.kind==='sound_pair')!;
const entries=['de','fr'].flatMap(language=>[0,1,2].map(index=>({...(index===2?sound:twister),id:crypto.randomUUID(),language,phrase:`${language} pronunciation ${index}`})));

test('hosts filter both pronunciation categories, preserve selection during registry search and see empty languages clearly',async({page})=>{
 const host=player(),game=createGame('SPRACH',host,'de','tongue-twisters');joinGame(game,{...player(),id:crypto.randomUUID(),name:'QA Listener'});updateAvailability(game,entries);const actions:RoomAction[]=[];
 await page.addInitScript(()=>localStorage.setItem('sprachwelten-room:SPRACH','qa-only'));await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));
 await page.route('**/api/rooms/SPRACH',route=>{if(route.request().method()==='POST'){const action=route.request().postDataJSON() as RoomAction;actions.push(action);act(game,host.id,action,entries);}return route.fulfill({json:{room:viewGame(game,host.id)}});});
 await page.goto('/room/SPRACH');const language=page.getByRole('combobox',{name:'Sprache der Zungenbrecher',exact:true});await expect(language).toHaveText('Deutsch');
 await language.click();await page.getByRole('option',{name:'Französisch',exact:true}).click();expect(game.pronunciationLanguage).toBe('fr');
 await page.getByRole('combobox',{name:'Kategorie',exact:true}).click();await page.getByRole('option',{name:'Klangfallen',exact:true}).click();expect(game.availableRounds).toBe(1);expect(game.totalRounds).toBe(1);
 const before=actions.length;await language.click();await page.getByRole('option',{name:'Andere Sprache suchen …',exact:true}).click();await expect(page.getByRole('textbox',{name:'Sprache oder Sprachcode suchen',exact:true})).toBeVisible();expect(actions.length).toBe(before);expect(game.pronunciationLanguage).toBe('fr');
 await page.getByRole('button',{name:'Suche schließen',exact:true}).click();expect(actions.length).toBe(before);await expect(language).toHaveText('Französisch');
 await language.click();await page.getByRole('option',{name:'Japanisch',exact:true}).click();await expect(page.getByRole('button',{name:'Spiel starten',exact:true})).toBeDisabled();await expect(page.getByText('Für diese Sprache und Kategorie gibt es keine ungespielten Aufgaben. Wähle eine andere Sprache oder Kategorie.',{exact:true})).toBeVisible();
 await language.click();await page.getByRole('option',{name:'Alle Sprachen',exact:true}).click();expect(game.pronunciationLanguage).toBe('');expect(game.availableRounds).toBe(2);
 await page.getByRole('button',{name:'EN',exact:true}).click();const english=page.getByRole('combobox',{name:'Tongue-twister language',exact:true});await english.click();await page.getByRole('option',{name:'German',exact:true}).click();
 await page.getByRole('button',{name:'Start game',exact:true}).click();await expect(page.locator('.round-header')).toBeVisible();expect(game.prompts.every(entry=>entry.language==='de'&&entry.kind==='sound_pair')).toBeTruthy();
});

test('new pronunciation rooms offer a German default and send the explicitly selected source language',async({page})=>{
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));const ready=page.waitForResponse(response=>response.url().includes('/api/auth/get-session'));await page.goto('/');await ready;
 await page.locator('.quick-start').getByRole('combobox',{name:'Spielmodus',exact:true}).click();await page.getByRole('option',{name:'Zungenbrecher',exact:true}).click();await page.locator('.quick-start').getByRole('button',{name:'Raum erstellen',exact:true}).click();
 const dialog=page.getByRole('dialog'),language=dialog.getByRole('combobox',{name:'Sprache der Zungenbrecher',exact:true});await expect(language).toHaveText('Deutsch');await language.click();await page.getByRole('option',{name:'Französisch',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Dein Spielname',exact:true}).fill('QA Speech');let selected:unknown;
 await page.route('**/api/rooms',route=>{selected=route.request().postDataJSON().pronunciationLanguage;return route.fulfill({status:422,json:{error:'QA stopped before creating a real room.'}});});
 await dialog.locator('form').getByRole('button',{name:'Raum erstellen',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();expect(selected).toBe('fr');
});
