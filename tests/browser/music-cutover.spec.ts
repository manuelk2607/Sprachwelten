import {test,expect} from '@playwright/test';

test('quote guides no longer advertise music and old bookmarks redirect to localized canonical pages',async({page,request})=>{
 for(const [oldPath,path,language] of [
  ['/spiele/zitate-und-lieder','/spiele/personenzitate','de'],
  ['/en/games/quotes-and-songs','/en/games/person-quotes','en'],
 ] as const){
  const response=await request.get(oldPath,{maxRedirects:0});
  expect(response.status()).toBe(308);expect(response.headers().location).toBe(path);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('lang',language);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://sprachwelten.maki26.workers.dev${path}`);
  const text=await page.locator('main').innerText();
  expect(text).not.toMatch(/Liedstelle|Liedtitel|song excerpt|song title/i);
  expect(text).toContain(language==='de'?'Wählt aus vier Personen die richtige Quelle des Zitats.':'Choose the person who said the quote from four options.');
 }
});
