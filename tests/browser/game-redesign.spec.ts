import {test,expect,type Page} from '@playwright/test';
import {act,createGame,joinGame,viewGame,GameError,type Game} from '../../lib/game';
import {roomAction} from '../../lib/content';
import {extraSeeds} from '../../lib/extra-seeds';
import {sentencePrompts} from '../../lib/sentence-chain';
import {updateAvailability} from '../../lib/game-pool';

function game(mode:'tongue-twisters'|'word-chain'){
  const host={id:crypto.randomUUID(),name:'Anna',tokenHash:'token-0',score:0},g=createGame('RAD234',host,'de',mode);
  for(let n=1;n<3;n++)joinGame(g,{id:crypto.randomUUID(),name:n===1?'Ben':'Clara',tokenHash:'token-'+n,score:0});
  const prompts=mode==='word-chain'?sentencePrompts().filter(entry=>entry.language==='de'&&['Die','Eine'].includes(entry.phrase)):extraSeeds;
  g.totalRounds=1;updateAvailability(g,prompts);return {g,prompts};
}
async function connect(page:Page,g:Game,index:number,prompts:Game['prompts']){
  await page.addInitScript(({token})=>localStorage.setItem('sprachwelten-room:RAD234',token),{token:'token-'+index});
  await page.route('**/api/auth/get-session**',route=>route.fulfill({json:null}));
  await page.route('**/api/rooms/RAD234',async route=>{
    try{
      if(route.request().method()==='POST'){
        const input=roomAction.parse(route.request().postDataJSON()),player=g.players[index];
        act(g,player.id,input,prompts);
      }
      await route.fulfill({json:{room:viewGame(g,g.players[index].id)}});
    }catch(error){await route.fulfill({status:error instanceof GameError?error.status:500,json:{error:(error as Error).message}});}
  });
  await page.goto('/room/RAD234');
}

test('three clients share one wheel result, one performance and anonymous ratings',async({page,browser})=>{
  test.setTimeout(60000);
  const {g,prompts}=game('tongue-twisters'),contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  try{
    const pages=[page,...await Promise.all(contexts.map(context=>context.newPage()))];
    await Promise.all(pages.map((p,index)=>connect(p,g,index,prompts)));
    await page.getByRole('button',{name:'Spiel starten',exact:true}).click();
    await expect(page.getByRole('img',{name:'Alle Personen am Glücksrad'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Vortrag beendet – bewerten',exact:true})).toHaveCount(0);
    const selected=g.round!.pronunciation!.selection!.selectedId,index=g.players.findIndex(player=>player.id===selected);
    await expect(pages[index].getByRole('heading',{name:'Du bist dran.',exact:true})).toBeVisible({timeout:10000});
    for(const p of pages)await expect(p.locator('.wheel-panel')).toHaveCount(0);
    await pages[index].getByRole('button',{name:'Vortrag beendet – bewerten',exact:true}).click();
    for(const p of pages.filter((_,i)=>i!==index)){
      for(const label of ['Verständlichkeit','Genauigkeit','Rhythmus']){await p.getByRole('combobox',{name:new RegExp('^'+label)}).click();await p.getByRole('option',{name:'4',exact:true}).click();}
      await p.getByRole('button',{name:'Bewertung abgeben',exact:true}).click();
    }
    await expect(page.locator('.pronunciation-result')).toHaveCount(1);expect(g.phase).toBe('reveal');expect(g.players[index].score).toBe(4);expect(g.players.filter((_,i)=>i!==index).every(player=>player.score===0)).toBeTruthy();
    await expect(page.locator('.game-main')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  }finally{await Promise.all(contexts.map(context=>context.close()));}
});

test('sentence turns synchronize, the server checks letters and players decide meaning without AI',async({page,browser})=>{
  test.setTimeout(60000);
  const {g,prompts}=game('word-chain'),context=await browser.newContext();
  // Two active players make turn changes easier to follow.
  g.players.pop();
  try{
    const other=await context.newPage();await Promise.all([connect(page,g,0,prompts),connect(other,g,1,prompts)]);
    await page.getByRole('button',{name:'Spiel starten',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Dein nächstes Wort',exact:true})).toBeVisible();await expect(other.getByRole('textbox',{name:'Dein nächstes Wort',exact:true})).toHaveCount(0);
    await page.getByRole('textbox',{name:'Dein nächstes Wort',exact:true}).fill('Falsch');await page.getByRole('button',{name:'Wort ergänzen',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Das Wort muss mit dem angezeigten Buchstaben beginnen.');
    await page.getByRole('textbox',{name:'Dein nächstes Wort',exact:true}).fill('Erde');await page.getByRole('button',{name:'Wort ergänzen',exact:true}).click();
    await expect(other.getByRole('button',{name:'Passt',exact:true})).toBeVisible();await other.getByRole('button',{name:'Passt',exact:true}).click();
    await expect(other.getByRole('textbox',{name:'Dein nächstes Wort',exact:true})).toBeVisible();await expect(other.locator('.latest-word')).toHaveText('Erde');
    await other.getByRole('textbox',{name:'Dein nächstes Wort',exact:true}).fill('Esel');await other.getByRole('button',{name:'Wort ergänzen',exact:true}).click();await page.getByRole('button',{name:'Passt nicht',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Dein nächstes Wort',exact:true})).toBeVisible();expect(g.players.map(player=>player.score)).toEqual([1,0]);
    await page.getByRole('textbox',{name:'Dein nächstes Wort',exact:true}).fill('explodiert.');await page.getByRole('button',{name:'Wort ergänzen',exact:true}).click();await other.getByRole('button',{name:'Passt',exact:true}).click();
    await expect(page.getByText('Euer Satz ist vollständig.',{exact:true})).toBeVisible();expect(g.players.map(player=>player.score)).toEqual([2,0]);await expect(page.locator('.shared-sentence')).toContainText('Erde explodiert.');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  }finally{await context.close();}
});

test('reduced motion shows the selected player without spinning',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const {g,prompts}=game('tongue-twisters');await connect(page,g,0,prompts);await page.getByRole('button',{name:'Spiel starten',exact:true}).click();
  await expect(page.locator('.wheel-reduced-result')).toBeVisible();await expect(page.locator('.wheel-reduced-result')).toContainText(g.players.find(player=>player.id===g.round!.pronunciation!.selection!.selectedId)!.name);
  expect(await page.locator('.speaker-wheel').evaluate(element=>element.getAnimations().length)).toBe(0);
});
