import {test,expect} from '@playwright/test';
import {act,createGame,viewGame} from '../../lib/game';
import {seedEntries} from '../../lib/seeds';
import type {RoomAction} from '../../lib/content';
import {newGameEntries} from '../../lib/new-game-seeds';
test('finished quizzes offer a personal review, a mistakes filter and refresh-safe history without future answers',async({page})=>{
 const host={id:crypto.randomUUID(),name:'QA',tokenHash:'qa',score:0},game=createGame('REVIEW',host,'de','meaning-quiz');game.totalRounds=2;act(game,host.id,{action:'start'},seedEntries);
 await page.addInitScript(()=>localStorage.setItem('sprachwelten-room:REVIEW','a'.repeat(64)));
 await page.route('**/api/auth/get-session**',r=>r.fulfill({json:null}));
 await page.route('**/api/rooms/REVIEW',r=>{if(r.request().method()==='POST')act(game,host.id,r.request().postDataJSON() as RoomAction,seedEntries);return r.fulfill({json:{room:viewGame(game,host.id)}});});
 await page.goto('/room/REVIEW');
 await expect(page.getByRole('region',{name:'Dein Lernrückblick',exact:true})).toHaveCount(0);
 const wrong=game.round!.options.find(o=>!o.solution)!;await page.locator('.options .option').nth(game.round!.options.findIndex(o=>o.id===wrong.id)).click();
 await page.getByRole('button',{name:'Nächste Runde',exact:true}).click();
 const right=game.round!.options.find(o=>o.solution)!;await page.locator('.options .option').nth(game.round!.options.findIndex(o=>o.id===right.id)).click();
 await page.getByRole('button',{name:'Zum Ergebnis',exact:true}).click();
 let review=page.getByRole('region',{name:'Dein Lernrückblick',exact:true});
 await expect(review).toContainText('1 / 2');await expect(review.locator('details')).toHaveCount(2);
 await review.getByRole('checkbox',{name:'Nur falsche Antworten',exact:true}).check();await expect(review.locator('details')).toHaveCount(1);
 await review.locator('summary').click();await expect(review).toContainText(wrong.text);
 await page.reload();review=page.getByRole('region',{name:'Dein Lernrückblick',exact:true});await expect(review.locator('details')).toHaveCount(2);
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('region',{name:'Your learning review',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Prepare next game',exact:true}).click();await expect(page.getByRole('region',{name:'Your learning review',exact:true})).toHaveCount(0);
});
for(const mode of ['meaning-quiz','word-builder'] as const)test(`${mode} review supports audio or word tiles after reveal and preserves the result on reload`,async({page})=>{
 const host={id:crypto.randomUUID(),name:'QA',tokenHash:'qa',score:0},game=createGame('MOREQA',host,'de',mode);game.totalRounds=1;
 act(game,host.id,{action:'start'},mode==='word-builder'?newGameEntries:seedEntries);
 const audioId=crypto.randomUUID();
 if(mode==='meaning-quiz')game.round!.entry={...game.round!.entry,phrase:'',presentation:'audio',audioId};
 await page.addInitScript(()=>localStorage.setItem('sprachwelten-room:MOREQA','a'.repeat(64)));
 await page.route('**/api/auth/get-session**',r=>r.fulfill({json:null}));
 await page.route('**/api/rooms/MOREQA',r=>{if(r.request().method()==='POST')act(game,host.id,r.request().postDataJSON() as RoomAction);return r.fulfill({json:{room:viewGame(game,host.id)}});});
 await page.goto('/room/MOREQA');await expect(page.locator('.learning-review')).toHaveCount(0);
 if(mode==='word-builder'){
  const c=game.round!.entry.challenge;if(c?.type!=='order')throw Error('Expected order challenge');
  const indices=c.accepted[0].map(id=>game.round!.tiles!.findIndex(tile=>tile.sourceId===id));
  for(const index of indices)await page.locator('.word-bank button').nth(index).click();
  await page.getByRole('button',{name:'Satz abgeben',exact:true}).click();
 }else{
  const right=game.round!.options.findIndex(option=>option.solution);await page.locator('.options .option').nth(right).click();
 }
 await page.getByRole('button',{name:'Zum Ergebnis',exact:true}).click();
 const review=page.locator('.learning-review');await expect(review.locator('details')).toHaveCount(1);
 await review.locator('summary').click();
 if(mode==='word-builder')await expect(review).toContainText('Eine gültige Übersetzung');
 else {await expect(review.locator('summary')).toContainText('Audiobeitrag');await expect(review.locator('audio')).toHaveAttribute('src',`/api/audio/${audioId}`);await expect(review.locator('audio')).toHaveAttribute('preload','none');}
 await page.reload();await expect(review.locator('details')).toHaveCount(1);
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(review).toContainText('1 / 1');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
