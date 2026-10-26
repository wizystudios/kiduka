import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
test('retirement deletes only app caches and unregisters', async()=>{
 const events={};const deleted=[];let removed=false;const scope='https://kiduka.shop/';
 runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{registration:{scope,unregister:async()=>{removed=true;}},skipWaiting(){},clients:{claim:async()=>{},matchAll:async()=>[]},addEventListener:(k,v)=>events[k]=v},caches:{keys:async()=>['kiduka-static-v4','firebase-messaging','other-app',`workbox-precache-v2-${scope}`],delete:async name=>{deleted.push(name);}}});
 let p;events.activate({waitUntil:x=>p=x});await p;
 expect(deleted).toEqual(['kiduka-static-v4',`workbox-precache-v2-${scope}`]);expect(removed).toBe(true);expect(events.fetch).toBeUndefined();
});
test('retirement unregisters even if cache access fails',async()=>{const events={};let removed=false;runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{registration:{scope:'https://kiduka.shop/',unregister:async()=>{removed=true;}},addEventListener:(k,v)=>events[k]=v},caches:{keys:async()=>{throw Error('storage');}}});let p;events.activate({waitUntil:x=>p=x});await expect(p).rejects.toThrow('storage');expect(removed).toBe(true);});
