import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installNavigation} from '../public/navigation.js';

test('phone menu supports open, Escape, outside focus and navigation after rerender',()=>{
 const markup='<header class="nav"><button data-nav-toggle aria-expanded="false">Menu</button><nav><a href="#dashboard">Workspace</a></nav></header><main><button>Other action</button></main>';
 const dom=new JSDOM(markup,{url:'http://localhost'}),{window}=dom;
 const previous={document:globalThis.document,window:globalThis.window};
 globalThis.document=window.document;globalThis.window=window;
 try{
  installNavigation();
  let toggle=document.querySelector('[data-nav-toggle]');toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.ok(document.querySelector('.nav.menu-open'));
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,toggle);
  toggle.click();document.querySelector('main button').focus();assert.equal(toggle.getAttribute('aria-expanded'),'false');
  toggle.click();document.querySelector('nav a').click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
  document.body.innerHTML=markup;toggle=document.querySelector('[data-nav-toggle]');toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'),'true');document.querySelector('main button').click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
 }finally{globalThis.document=previous.document;globalThis.window=previous.window;dom.window.close();}
});
