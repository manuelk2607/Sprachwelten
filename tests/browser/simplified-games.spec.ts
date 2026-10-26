import {test,expect} from '@playwright/test';
import {act,createGame,viewGame} from '../../lib/game';
import type {RoomAction} from '../../lib/content';
import {communityGameEntries} from '../../lib/community-game-seeds';
import {seedEntries} from '../../lib/seeds';
import {newGameEntries} from '../../lib/new-game-seeds';
import {sentencePrompts} from '../../lib/sentence-chain';
import {updateAvailability} from '../../lib/game-pool';
import {wordSeeds} from '../../lib/word-seeds';

for(const mode of ['meaning-quiz','word-outsider','loanword-quiz','word-chain'] as const){
 test(`${mode} can be completed from the lobby through its actual UI`,async({page})=>{
  const host={id:crypto.randomUUID(),name:'Browser QA',tokenHash:'qa-only',score:0};const game=createGame('ABC234',host,'de',mode);game.totalRounds=1;
  const prompts=mode==='word-chain'?sentencePrompts().filter(entry=>entry.language==='de'&&['Die','Eine'].includes(entry.phrase)):[...seedEntries,...wordSeeds,...newGameEntries,...communityGameEntries];
  updateAvailability(game,prompts);
  await page.addInitScript(()=>localStorage.setItem('sprachwelten-room:ABC234','qa-only'));
  await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));
  await page.route('**/api/rooms/ABC234',route=>{if(route.request().method()==='POST')act(game,host.id,route.request().postDataJSON() as RoomAction,prompts);return route.fulfill({json:{room:viewGame(game,host.id)}});});
  await page.goto('/room/ABC234');await page.getByRole('button',{name:'Spiel starten',exact:true}).click();
  if(mode==='word-chain'){
   for(const word of ['Erde','explodiert.']){await page.getByRole('textbox',{name:'Dein nächstes Wort',exact:true}).fill(word);await page.getByRole('button',{name:'Wort ergänzen',exact:true}).click();}
  }else{
   await expect(page.locator('.options button.option')).toHaveCount(4);const right=game.round!.options.find(option=>option.solution)!;await page.locator('.options button.option').filter({has:page.getByText(right.text,{exact:true})}).click();
  }
  await expect(page.getByRole('button',{name:'Zum Ergebnis',exact:true})).toBeVisible();await page.getByRole('button',{name:'Zum Ergebnis',exact:true}).click();await expect(page.getByRole('heading',{name:'Dein Sprachgefühl in Punkten',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:mode==='word-chain'?'2 Punkte':'1 / 1 Punkte',exact:true})).toBeVisible();
  if(mode==='loanword-quiz'){
    if(page.viewportSize()!.width>600)await expect.poll(()=>page.locator('.finished-actions').evaluate(actions=>{
      const [direct,prepare,leave]=Array.from(actions.querySelectorAll('button')).map(button=>button.getBoundingClientRect());
      return direct.right<prepare.left&&prepare.right<leave.left&&prepare.width>direct.width&&prepare.width>leave.width;
    })).toBe(true);
    const first=game.round!.entry.id,matchId=game.matchId;
    await page.getByRole('button',{name:'Direkt weiterspielen',exact:true}).click();await expect(page.locator('.options button.option')).toHaveCount(4);
    expect(game.phase).toBe('voting');expect(game.mode).toBe(mode);expect(game.totalRounds).toBe(1);expect(game.matchId).not.toBe(matchId);expect(game.round!.entry.id).not.toBe(first);expect(game.players[0].score).toBe(0);
    const right=game.round!.options.find(option=>option.solution)!;await page.locator('.options button.option').filter({has:page.getByText(right.text,{exact:true})}).click();await page.getByRole('button',{name:'Zum Ergebnis',exact:true}).click();
    await expect(page.getByRole('button',{name:'Nächste Partie vorbereiten',exact:true})).toBeVisible();
  }
  const previous=game.round!.entry.id;
  await page.getByRole('button',{name:'Nächste Partie vorbereiten',exact:true}).click();
  await expect(page.getByRole('button',{name:'Spiel starten',exact:true})).toBeVisible();
    if(mode==='meaning-quiz'){
      await expect.poll(()=>page.locator('.room-settings-row').evaluate(row=>{
        const [category,rounds]=Array.from(row.querySelectorAll('[role="combobox"]')).map(element=>element.getBoundingClientRect());
        return !!category&&!!rounds&&Math.abs(category.y-rounds.y)<2&&category.right<rounds.x;
      })).toBe(true);
      await page.getByRole('combobox',{name:'Kategorie',exact:true}).click();
      await page.getByRole('option',{name:'Generationenchat',exact:true}).click();
      await page.getByRole('combobox',{name:'Rundenzahl',exact:true}).click();
      await expect(page.getByRole('option',{name:'10',exact:true})).toBeVisible();
      await page.getByRole('option',{name:'1',exact:true}).click();
    }else if(mode==='loanword-quiz'){
      await page.getByRole('combobox',{name:'Kategorie',exact:true}).click();
      await page.getByRole('option',{name:'Wortdetektiv',exact:true}).click();
    }else if(mode==='word-outsider'){
      await page.getByRole('combobox',{name:'Spielmodus',exact:true}).click();
      await page.getByRole('option',{name:'Pointe, bitte!',exact:true}).click();
    }
  await page.getByRole('button',{name:'Spiel starten',exact:true}).click();
  await expect(page.locator('.round-header')).toBeVisible();expect(game.round!.entry.id).not.toBe(previous);
  if(mode==='meaning-quiz')expect(game.round!.entry.kind).toBe('youth_chat');
  if(mode==='loanword-quiz')expect(game.mode).toBe('language-quiz');
  if(mode==='word-outsider'){expect(game.mode).toBe('joke-quiz');expect(game.code).toBe('ABC234');expect(game.players[0].id).toBe(host.id);expect(game.playedPrompts?.some(prompt=>prompt.id===previous)).toBeTruthy();}
 });
}
