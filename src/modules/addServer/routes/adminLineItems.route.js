import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function adminLineItemsRoute(fastify) {
  fastify.get("/admin/line-items/new", async (_req, reply) => {
    const html = `
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Create Line Item</title>
</head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial">
  <h1 style="margin:0 0 16px 0;">Створити Line Item (адмін)</h1>

  <div id="form-host"></div>

  <script>
    (function () {
      const host = document.getElementById('form-host');
      const root = host.attachShadow({ mode: 'open' });

      root.innerHTML = \`
        <style>
          .card { max-width: 880px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.06)}
          .row { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
          .field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
          label { font-size:14px; color:#374151; }
          input, select { padding:10px; border-radius:10px; border:1px solid #e5e7eb; font-size:14px; }
          input[type="file"] { padding:8px; }
          button { padding:10px 14px; border:none; border-radius:10px; background:#111827; color:white; cursor:pointer; }
          .muted { font-size:12px; color:#6b7280; }
          .msg { margin-left:12px; }
          .ok { color:#059669; }
          .err { color:#dc2626; }
          .list { margin-top:16px; font-size:14px; }
          .item { padding:8px 0; border-bottom:1px dashed #e5e7eb; }
          a { color:#2563eb; text-decoration:none; }
        </style>

        <div class="card">
          <form id="f" action="/api/line-items" method="POST" enctype="multipart/form-data" novalidate>
            <div class="row">
              <div class="field">
                <label>Розмір (WxH)</label>
                <input name="size" placeholder="300x250" required />
              </div>
              <div class="field">
                <label>Geo</label>
                <input name="geo" placeholder="NO" />
              </div>
            </div>

            <div class="row">
              <div class="field">
                <label>Мінімальний CPM</label>
                <input name="minCPM" type="number" step="0.01" value="0.20" required />
              </div>
              <div class="field">
                <label>Максимальний CPM</label>
                <input name="maxCPM" type="number" step="0.01" value="0.80" required />
              </div>
            </div>

            <div class="row">
              <div class="field">
                <label>Тип реклами</label>
                <select name="adType">
                  <option value="BANNER" selected>BANNER</option>
                  <option value="VIDEO">VIDEO</option>
                </select>
              </div>
              <div class="field">
                <label>Частота показів (frequency cap)</label>
                <input name="frequencyCap" type="number" min="1" value="3" />
              </div>
            </div>

            <div class="field">
              <label>Креатив (файл) <span class="muted">(jpg/png/gif або html)</span></label>
              <input name="creative" type="file" accept=".jpg,.jpeg,.png,.gif,.html,.htm" required />
            </div>

            <button type="submit">Створити</button>
            <span id="msg" class="msg"></span>
          </form>

          <div class="list">
            <button id="reload" style="margin-bottom:8px;">Оновити список</button>
            <div id="items"></div>
          </div>
        </div>
      \`;

      const $ = (sel) => root.querySelector(sel);
      const form = $('#f');
      const msg = $('#msg');
      const itemsBox = $('#items');
      const reloadBtn = $('#reload');

      const loadItems = async () => {
        itemsBox.textContent = 'Завантаження...';
        try {
          const res = await fetch('/api/line-items');
          const arr = await res.json();
          itemsBox.innerHTML = (arr || []).map(it => \`
            <div class="item">
              <div><strong>ID:</strong> \${it.id}</div>
              <div><strong>size:</strong> \${it.size} |
                  <strong>CPM:</strong> \${it.minCPM}—\${it.maxCPM} |
                  <strong>geo:</strong> \${it.geo || '-'}
              </div>
              <div><strong>creative:</strong> <a href="\${it.creativePath}" target="_blank" rel="noopener">\${it.creativePath}</a></div>
              <div><strong>active:</strong> \${it.active ? 'true' : 'false'}</div>
            </div>\`).join('');
        } catch (e) {
          itemsBox.innerHTML = '<span class="err">Помилка завантаження</span>';
        }
      };

      reloadBtn?.addEventListener('click', loadItems);

      form?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        msg.textContent = 'Відправка...';
        msg.className = 'msg';

        try {
          const fd = new FormData(form);
          const res = await fetch(form.action, { method: 'POST', body: fd });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            msg.textContent = 'Помилка: ' + (err.message || res.statusText);
            msg.className = 'msg err';
            return;
          }
          msg.textContent = 'Створено!';
          msg.className = 'msg ok';
          form.reset();
          loadItems();
        } catch (e) {
          msg.textContent = 'Помилка мережі';
          msg.className = 'msg err';
        }
      });

      loadItems();
    })();
  </script>
</body>
</html>`;
    reply.type("text/html; charset=utf-8").send(html);
  });
}

export default adminLineItemsRoute;
