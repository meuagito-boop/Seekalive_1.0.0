// Browser-only test fixtures in a disposable Chromium profile; no database writes.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.APP_ORIGIN || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = "generated-artifacts/seek-audit";
await mkdir(output, { recursive: true });
const target = await (await fetch("http://127.0.0.1:9223/json/new?about:blank", { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map(), errors = [], checks = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const command = pending.get(message.id);
  if (!command) return;
  pending.delete(message.id);
  message.error ? command.reject(new Error(message.error.message)) : command.resolve(message.result);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 250; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function click(selector) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
async function textButton(text) {
  await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)})`);
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
}
async function fill(selector, value) {
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
}
async function navigate(path = "/seek") {
  await cdp("Page.navigate", { url: origin + path });
  await wait("document.querySelector('[aria-label^=\"Localização de exploração\"]') || document.querySelector('#root')?.textContent.includes('Editar perfil')");
}
async function check(name, expression) {
  assert.ok(await evaluate(expression), name);
  checks.push(name);
  console.log("PASS", name);
}
async function escape() { await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); }
async function chooseCity(name, state) {
  await fill("#seek-city-search", name);
  const find = `[...document.querySelectorAll('[role="dialog"] li button')].find(b=>b.textContent.includes(${JSON.stringify(name)})&&b.textContent.includes(${JSON.stringify(state + " · Brasil")}))`;
  await wait(`!!(${find})`);
  await evaluate(`${find}.click()`);
  await wait("!document.querySelector('[role=\"dialog\"]')");
}
async function screenshot(name) {
  const { data } = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 75 });
  await writeFile(`${output}/${name}.jpg`, Buffer.from(data, "base64"));
}
await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Network.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `window.__gpsCalls=0;const original=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);navigator.geolocation.getCurrentPosition=(...args)=>{window.__gpsCalls++;return original(...args)};` });
try {
  await navigate();
  await evaluate("localStorage.clear();sessionStorage.clear()");
  await navigate();
  await check("Abrir Seek não solicita GPS nem mostra exemplos como resultados reais", "window.__gpsCalls===0 && document.querySelectorAll('article').length===0 && !document.querySelector('input[type=checkbox]')?.checked");
  const account = (id, name, category, cityId, cityName) => ({
    id, username: id, displayName: name, bio: category === "servicos" ? "Pedreiro, reformas e pintura" : "Atendimento local",
    avatarUrl: "", coverUrl: "", location: `${cityName}, SP`, joinedAt: "2026-10-22", accountType: "commercial",
    commercialProfile: { categoryKey: category, category: category === "servicos" ? "Pedreiro" : "Cafés", address: "Endereço de teste",
      cityId, cityName, cityState: "SP", tags: category === "servicos" ? ["pedreiro"] : ["café"] },
    stats: { posts: 0, followers: 0, following: 0, circles: 0 },
  });
  const accounts = [account("seek_test_provider", "João Pedreiro", "servicos", "3550308", "São Paulo"),
    account("seek_test_cafe", "Café de teste", "cafes", "3550308", "São Paulo"),
    account("seek_test_santos", "Café Santos", "cafes", "3548500", "Santos")];
  await evaluate(`localStorage.setItem('seekalive-social-accounts',${JSON.stringify(JSON.stringify(accounts))});localStorage.setItem('seekalive-active-account',${JSON.stringify(JSON.stringify(accounts[0]))})`);
  await navigate();
  await wait("document.querySelectorAll('article').length===3");
  await cdp("Network.setBlockedURLs", { urls: ["*ibge-cities-20261022.json*"] });
  await click('[aria-label^="Localização de exploração"]');
  await wait("document.querySelector('[role=\"dialog\"]')?.textContent.includes('Não foi possível consultar')");
  await check("Falha real de rede na pesquisa de cidades mostra erro e retry", "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Tentar novamente'))");
  await cdp("Network.setBlockedURLs", { urls: [] });
  await textButton("Tentar novamente");
  await chooseCity("São Paulo", "SP");
  await wait("document.querySelectorAll('article').length===2");
  await check("Catálogo oficial do IBGE seleciona cidade e filtra contas do Social", "document.querySelector('[aria-label^=\"Localização de exploração\"]').textContent.includes('São Paulo') && !document.querySelector('main')?.textContent.includes('Café Santos')");
  await click('[aria-label^="Localização de exploração"]');
  await fill("#seek-city-search", "Santos");
  await wait("[...document.querySelectorAll('[role=\"dialog\"] li button')].some(b=>b.textContent.includes('Santos'))");
  await escape();
  await check("Fechar seletor sem escolher preserva cidade anterior", "document.querySelector('[aria-label^=\"Localização de exploração\"]').textContent.includes('São Paulo')");
  await fill("#seek-query", "pedreiro");
  await wait("document.querySelectorAll('article').length===1");
  await click('article a[href="/profile/seek_test_provider"]');
  await wait("location.pathname.includes('/profile/seek_test_provider')");
  await evaluate("history.back()");
  await wait("!!document.querySelector('#seek-query')");
  await check("Voltar do perfil preserva busca, filtros e cidade", "document.querySelector('#seek-query').value==='pedreiro' && document.querySelector('[aria-label^=\"Localização de exploração\"]').textContent.includes('São Paulo')");
  await click('[aria-label="Limpar busca"]');
  await wait("document.querySelectorAll('article').length===2");
  await evaluate("document.querySelector('#seek-providers-title').closest('section').querySelectorAll('button')[2].click()");
  await wait("!!document.querySelector('#seek-list-title')");
  await check("Ver todos abre listagem completa de serviços", "document.querySelectorAll('article').length===1 && document.querySelector('[role=tab][aria-selected=true]').textContent==='Serviços'");
  await click('button[aria-controls="seek-filters"]');
  await fill("#seek-filters select:nth-of-type(1)", "rating");
  await evaluate("(()=>{const e=[...document.querySelectorAll('#seek-filters select')].find(e=>e.closest('label').textContent.includes('Nota mínima'));e.value='4';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await wait("document.querySelectorAll('article').length===0");
  await check("Filtro real de nota produz estado vazio e raio permanece indisponível", "document.body.textContent.includes('Nada corresponde') && [...document.querySelectorAll('#seek-filters select')].some(e=>e.disabled)");
  await textButton("Limpar filtros");
  await wait("document.querySelectorAll('article').length===1");
  await click('article button[aria-label^="Salvar"]');
  await check("Salvar serviço atualiza seleção e armazenamento do navegador", "document.querySelector('article button[aria-pressed=true]')!==null && localStorage.getItem('seekalive-saved-businesses').includes('seek_test_provider')");
  await cdp("Browser.setPermission", { permission: { name: "geolocation" }, setting: "denied", origin });
  await click('[aria-label^="Localização de exploração"]');
  await textButton("Usar minha localização atual");
  await check("GPS exige explicação e ação explícita antes da obtenção", "window.__gpsCalls===0");
  await textButton("Continuar");
  await wait("document.querySelector('[role=\"dialog\"]')?.textContent.includes('bloqueada')");
  await check("Negar GPS não impede escolha manual e orienta permissões", "!!document.querySelector('#seek-city-search') && document.querySelector('[role=\"dialog\"]').textContent.includes('configurações')");
  await escape();
  await cdp("Browser.setPermission", { permission: { name: "geolocation" }, setting: "granted", origin });
  await cdp("Emulation.setGeolocationOverride", { latitude: -23.5505, longitude: -46.6333, accuracy: 1000 });
  await click('[aria-label^="Localização de exploração"]');
  await textButton("Usar minha localização atual"); await textButton("Continuar");
  await wait("!document.querySelector('[role=\"dialog\"]')");
  await check("GPS autorizado é aproximado, sem coordenadas públicas nem persistência", "window.__gpsCalls===1 && document.querySelector('[aria-label^=\"Localização de exploração\"]').textContent.includes('aproximada') && !document.body.textContent.includes('-23.5505') && !Object.values(sessionStorage).join('').includes('latitude')");
  await click('[aria-label^="Localização de exploração"]'); await chooseCity("São Paulo", "SP");
  await evaluate("document.querySelector('[role=tab]').click()");
  await click('button[aria-label="Voltar para descobertas"]');
  await screenshot("seek-mobile");
  await cdp("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await wait("document.body.textContent.includes('Sem conexão')");
  await click('[aria-label^="Localização de exploração"]'); await chooseCity("Santos", "SP");
  await check("Sem conexão mantém catálogo já carregado e troca manual funcional", "document.querySelector('[aria-label^=\"Localização de exploração\"]').textContent.includes('Santos')");
  await cdp("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await screenshot("seek-desktop");
  await check("Desktop sem sobreposição ou rolagem horizontal da página", "document.documentElement.scrollWidth<=innerWidth+1");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
  await check("Celular estreito mantém conteúdo dentro da largura", "document.documentElement.scrollWidth<=innerWidth+1");
  await navigate("/profile/edit");
  await wait("document.body.textContent.includes('Cidade de descoberta no Seek')");
  await check("Editor comercial usa catálogo real sem confundir GPS do usuário", "document.body.textContent.includes('São Paulo, SP')");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('São Paulo, SP')).click()");
  await wait("!!document.querySelector('#seek-city-search')");
  await check("Cidade do comércio é seleção manual sem botão GPS", "!document.querySelector('[role=\"dialog\"]').textContent.includes('Usar minha localização atual')");
  await chooseCity("Santos", "SP");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("!location.pathname.endsWith('/edit')");
  await check("Salvar perfil alimenta cidade estruturada da mesma conta Social", "JSON.parse(localStorage.getItem('seekalive-social-accounts')).find(a=>a.id==='seek_test_provider').commercialProfile.cityId==='3548500'");
  await navigate();
  await check("A nova cidade do prestador atualiza os resultados do Seek", "document.querySelectorAll('article').length===2 && document.body.textContent.includes('João Pedreiro')");
  assert.deepEqual(errors, [], "Sem exceções de JavaScript");
  await writeFile(`${output}/results.json`, JSON.stringify({ checks, errors, fixtureOnly: true, realCitySource: "IBGE", locationSimulation: "CDP only, no physical user position" }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, exceptions: errors.length }));
} finally { socket.close(); }
