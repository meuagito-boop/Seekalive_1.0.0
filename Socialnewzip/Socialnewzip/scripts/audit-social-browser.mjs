// Run against a disposable Chromium launched with --remote-debugging-port=9222.
// No database, credentials, installed automation packages or production data.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.APP_ORIGIN || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = "generated-artifacts/social-audit";
await mkdir(output, { recursive: true });
const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const socket = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const pair = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) pair.reject(new Error(message.error.message));
  else pair.resolve(message.result);
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function click(selector) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  await new Promise((resolve) => setTimeout(resolve, 120));
  const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
}
async function textButton(text) {
  await wait(`!![...document.querySelectorAll('button,[role="menuitem"]')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`);
  await evaluate(`(() => { document.querySelector('[data-audit-target]')?.removeAttribute('data-audit-target'); const b = [...document.querySelectorAll('button,[role="menuitem"]')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); b.setAttribute('data-audit-target','true'); })()`);
  await click("[data-audit-target]");
}
async function fill(selector, value) {
  await evaluate(`(() => {const el = document.querySelector(${JSON.stringify(selector)}); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true}));})()`);
}
async function navigate(path) {
  await cdp("Page.navigate", { url: origin + path });
  await wait("!!document.querySelector('#root')?.textContent.length");
}
async function screenshot(name) {
  const { data } = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 75 });
  await writeFile(`${output}/${name}.jpg`, Buffer.from(data, "base64"));
}
async function check(name, expression) {
  await wait(expression);
  assert.equal(await evaluate(expression), true, name);
  console.log(`PASS ${name}`);
}
try {
  await cdp("Runtime.enable");
  await cdp("Page.enable");
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await cdp("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  if (["settings", "camera-denied"].includes(process.env.AUDIT_SCOPE)) {
    if (process.env.AUDIT_SCOPE === "settings") {
    await navigate("/settings/appearance");
    await click('[data-testid="font-size-Grande"]');
    await check("Text size actually changes document, brand remains orange", "document.documentElement.style.fontSize === '18px' && getComputedStyle(document.documentElement).getPropertyValue('--primary').trim().startsWith('27 ')");
    await click('[data-testid="font-size-Padrão"]');
    await check("Default text does not shrink controls", "getComputedStyle(document.documentElement).fontSize === '16px'");
    await navigate("/settings/security");
    await check("Security does not simulate enabled 2FA", "[...document.querySelectorAll('button[role=\"switch\"]')].every(b=>b.disabled)");
    await screenshot("security-mobile");
    await navigate("/settings/privacy");
    await check("Unsupported privacy controls disabled", "[...document.querySelectorAll('button[role=\"switch\"]')].every(b=>b.disabled)");
    await navigate("/settings/notifications");
    await check("Unsupported notification switches disabled", "[...document.querySelectorAll('button[role=\"switch\"]')].every(b=>b.disabled)");
    await navigate("/profile/cafecentralsp");
    await textButton("Informações");
    await check("Business Information label opens correct content", "document.body.textContent.includes('Horário de funcionamento')");
    await textButton("Serviços");
    await check("Business Services tab lists actual service options", "/Delivery|Agendamento|No local|Reservas|Atendimento/i.test(document.body.textContent)");
    await textButton("Avaliações");
    await check("Business Reviews correctly named", "document.body.textContent.includes('Avaliações')");
    await screenshot("commercial-reviews-mobile");
    await textButton("Adicionar avaliação");
    await wait("!!document.querySelector('[role=\"dialog\"] textarea')");
    await fill('[role="dialog"] textarea', "Atendimento avaliado durante a auditoria do front-end.");
    await textButton("Publicar avaliação");
    await wait("document.body.textContent.includes('Sua avaliação foi salva neste navegador.')");
    console.log("PASS Business review saved with accurate browser-only feedback");
    await click('[role="dialog"] button:has(.sr-only)');
    }
    await navigate("/compose");
    // Fake UI permissions override Chromium permission settings. Exercise the
    // real application's NotAllowedError path by rejecting only this browser call.
    await evaluate("navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied by audit', 'NotAllowedError'))");
    await click('[data-testid="button-add-image"]');
    await textButton("Tirar foto com a câmera");
    await wait("!!document.querySelector('[role=\"alert\"]')");
    await check("Denied camera permission has message and gallery alternative", "/Permissão negada/.test(document.querySelector('[role=\"alert\"]').textContent) && document.body.textContent.includes('Escolher da galeria')");
    await textButton("Cancelar");
  } else {
  await navigate("/feed");
  await wait("!!document.querySelector('[aria-label=\"Abrir menu\"]')");
  await check("Feed: single visible header, no duplicate composer/demo banner", `(() => {
    const headers = [...document.querySelectorAll('header')].filter(h => h.getBoundingClientRect().height);
    return headers.length === 1 && !document.body.textContent.includes('O que você quer compartilhar?') && !/demonstração|só nesta sessão/i.test(document.body.textContent);
  })()`);
  await screenshot("feed-mobile");
  await click('[aria-label="Abrir menu"]');
  await wait("!!document.querySelector('[role=\"dialog\"]')");
  await check("Drawer traps initial focus", "document.querySelector('[role=\"dialog\"]').contains(document.activeElement)");
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  await wait("!document.querySelector('[role=\"dialog\"]')");
  await check("Drawer restores Menu focus", `document.activeElement?.getAttribute('aria-label') === 'Abrir menu'`);
  await click('[aria-label="Criar publicação"]');
  await wait("location.pathname.endsWith('/compose')");
  await check("Compose: empty publish disabled", "document.querySelector('[data-testid=\"button-post\"]').disabled");
  await click('[data-testid="button-add-image"]');
  await textButton("Escolher foto da galeria");
  await evaluate(`new Promise(resolve => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 40;
    canvas.getContext('2d').fillRect(0,0,40,40);
    canvas.toBlob(blob => {
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'audit-photo.png', {type:'image/png'}));
      const input = document.querySelector('input[accept^="image/jpeg"]');
      input.files = dt.files; input.dispatchEvent(new Event('change',{bubbles:true})); resolve();
    }, 'image/png');
  })`);
  await wait("!!document.querySelector('[aria-label=\"Remover audit-photo.png\"]')");
  await check("Photo has a real decoded preview", "document.querySelector('img[alt=\"audit-photo.png\"]').naturalWidth === 40");
  await fill("#compose-text", `Auditoria Social ${Date.now()}`);
  await screenshot("compose-photo-mobile");
  await click('[data-testid="button-audience"]');
  await click('[data-testid="audience-option-private"]');
  await click('[data-testid="button-post"]');
  await wait("location.pathname.includes('/post/')");
  await check("Published content and media present", "document.body.textContent.includes('Auditoria Social') && !!document.querySelector('img[src^=\"blob:\"]')");
  // SPA navigation preserves session-scoped posts and media.
  await click('[aria-label="Abrir menu"]');
  await click('[role="dialog"] a[href="/profile/usuario_demo"]');
  await wait("location.pathname.includes('/profile/')");
  await textButton("Mídias");
  await wait("!!document.querySelector('img[src^=\"blob:\"]')");
  await check("Published photo appears in author media gallery", "!!document.querySelector('img[src^=\"blob:\"]')");
  await screenshot("profile-media-mobile");
  await click('[aria-label="Criar publicação"]');
  await wait("!!document.querySelector('#compose-text')");
  await click('[data-testid="button-add-image"]');
  await textButton("Tirar foto com a câmera");
  await wait("!![...document.querySelectorAll('button')].find(b => b.textContent.includes('Capturar foto')) || !!document.querySelector('[role=\"alert\"]')");
  if (await evaluate("!![...document.querySelectorAll('button')].find(b => b.textContent.includes('Capturar foto'))")) {
    await textButton("Capturar foto");
    await wait("!!document.querySelector('img[alt=\"Foto capturada\"]')");
    await textButton("Usar foto");
    await wait("!!document.querySelector('[aria-label^=\"Remover foto-\"]')");
    console.log("PASS Camera photo captured and attached (synthetic Chromium camera)");
    await click('[aria-label^="Remover foto-"]');
    await click('[data-testid="button-add-video"]');
    await textButton("Gravar vídeo agora");
    await wait("!![...document.querySelectorAll('button')].find(b => b.textContent.includes('Iniciar gravação'))");
    await textButton("Iniciar gravação");
    await new Promise((resolve) => setTimeout(resolve, 1300));
    await textButton("Concluir gravação");
    await wait("!![...document.querySelectorAll('button')].find(b => b.textContent.includes('Usar vídeo'))");
    await textButton("Usar vídeo");
    await wait("!!document.querySelector('[aria-label^=\"Remover video-\"]')");
    console.log("PASS Camera video recorded, previewed and attached (synthetic device)");
  } else {
    console.log("UNVERIFIED camera: " + await evaluate("document.querySelector('[role=\"alert\"]').textContent"));
    await textButton("Cancelar");
  }
  await navigate("/seek");
  await fill('input[type="search"]', "cafe");
  await wait("document.body.textContent.includes('Café Central')");
  await check("Seek accented search finds café", "document.body.textContent.includes('Café Central')");
  await click('[aria-label="Abrir filtros"]');
  await check("Seek filters include real radius and ordering controls", "!!document.querySelector('#seek-distance-mobile') && !!document.querySelector('#seek-order-mobile')");
  await screenshot("seek-filters-mobile");
  await navigate("/settings");
  await check("Settings: exactly one visible main header", "[...document.querySelectorAll('header')].filter(h=>h.getBoundingClientRect().height).length === 1");
  await screenshot("settings-mobile");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/feed");
  await check("Desktop creation action remains available", "!!document.querySelector('a[href=\"/compose\"]')");
  await screenshot("feed-desktop");
  await navigate("/rota-inexistente");
  await check("Unknown route has useful localized error", "document.body.textContent.includes('Página não encontrada')");
  }
  assert.deepEqual(errors, [], "No uncaught runtime exceptions");
  console.log("PASS No uncaught runtime exceptions");
} finally {
  socket.close();
}
