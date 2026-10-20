import {test,expect} from '@playwright/test';
import {act,createGame,viewGame} from '../../lib/game';
import type {RoomAction} from '../../lib/content';
import {extraSeeds} from '../../lib/extra-seeds';

test('dialect hints are opt-in, survive polling, reset for each round and support both UI languages',async({page})=>{
 const host={id:crypto.randomUUID(),name:'QA Hint',tokenHash:'qa-only',score:0},game=createGame('TIPPXX',host,'de','dialect-detective');
 const entries=extraSeeds.filter(entry=>entry.kind==='dialect').map((entry,index)=>({...entry,hint:`Ein kleiner Hinweis ${index}.`}));
 act(game,host.id,{action:'start'},entries);
 await page.addInitScript(()=>localStorage.setItem('sprachwelten-room:TIPPXX','qa-only'));
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));
 await page.route('**/api/rooms/TIPPXX',route=>{if(route.request().method()==='POST')act(game,host.id,route.request().postDataJSON() as RoomAction,entries);return route.fulfill({json:{room:viewGame(game,host.id)}});});
 await page.goto('/room/TIPPXX');const first=game.round!.entry.hint!;
 await expect(page.getByRole('button',{name:'Tipp anzeigen',exact:true})).toBeVisible();await expect(page.getByText(first,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Tipp anzeigen',exact:true}).click();await expect(page.getByText(first,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('button',{name:'Hide hint',exact:true})).toBeVisible();await page.getByRole('button',{name:'Hide hint',exact:true}).click();await expect(page.getByText(first,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Show hint',exact:true}).click();
 const right=game.round!.options.find(option=>option.categoryId===game.round!.entry.regionId)!;
 const index=viewGame(game,host.id).options.findIndex(option=>option.id===right.id);await page.locator('.options .option').nth(index).click();
 await expect(page.getByRole('button',{name:'Hide hint',exact:true})).toHaveCount(0);expect(game.players[0].score).toBe(1);
 await page.getByRole('button',{name:'Next round',exact:true}).click();await expect(page.getByRole('button',{name:'Show hint',exact:true})).toBeVisible();await expect(page.getByText(game.round!.entry.hint!,{exact:true})).toHaveCount(0);
});

test('the contribution editor offers optional bilingual hints for idioms and dialects',async({page})=>{
 await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));await page.route('**/api/audio',route=>route.fulfill({json:{available:false}}));await page.route('**/api/translations',route=>route.fulfill({json:{available:false}}));await page.route('**/api/regions',route=>route.fulfill({json:{regions:{}}}));await page.route('**/api/entries/duplicates?*',route=>route.fulfill({json:{duplicate:null}}));
 const ready=page.waitForResponse(response=>response.url().includes('/api/auth/get-session'));await page.goto('/');await ready;await page.locator('.header').getByRole('button',{name:'Beitragen',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.locator('[name="hint"]')).toBeVisible();
 await dialog.locator('[name="hint"]').fill('Eine Redewendung.');await expect(dialog.getByLabel('Tipp fürs Spiel · Englisch',{exact:true})).toBeVisible();
 await dialog.getByRole('combobox').first().click();await page.getByRole('option',{name:'Dialekt',exact:true}).click();
 await expect(dialog.locator('[name="hint"]')).toBeVisible();await expect(dialog.locator('[name="hint"]')).not.toHaveAttribute('required','');await dialog.locator('[name="hint"]').fill('Ein Körperteil.');
 await expect(dialog.getByLabel('Tipp fürs Spiel · Englisch',{exact:true})).toBeVisible();
});
