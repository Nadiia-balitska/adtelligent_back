export default async function adminLineItemsRoute(fastify) {
  fastify.get("/admin/line-items/new", async (_req, reply) => {
    const js = `
class LineItemForm extends HTMLElement {
  constructor() {
    super();

    const apiOriginAttr = this.getAttribute('data-api-origin') || '';
    const apiOrigin = String(apiOriginAttr).replace(/\\/$/, '');

    const shadowRoot = this.attachShadow({ mode: 'open' });

    shadowRoot.innerHTML = \`
      <style>
        .card { max-width: 880px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.06); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
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
        <form id="lineItemForm" enctype="multipart/form-data" novalidate>
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
          <span id="message" class="msg"></span>
        </form>

        <div class="list">
          <button id="reloadList" style="margin-bottom:8px;">Оновити список</button>
          <div id="itemsContainer"></div>
        </div>
      </div>
    \`;

    const formEl = shadowRoot.getElementById('lineItemForm');
    const messageEl = shadowRoot.getElementById('message');
    const itemsContainer = shadowRoot.getElementById('itemsContainer');
    const reloadButton = shadowRoot.getElementById('reloadList');

    const listEndpoint = apiOrigin + '/line-items';
    const createEndpoint = apiOrigin + '/line-items';

    async function loadLineItems() {
      itemsContainer.textContent = 'Завантаження...';
      try {
        const response = await fetch(listEndpoint, { credentials: 'include' });
        const items = await response.json();

        itemsContainer.innerHTML = (items || []).map(item => \`
          <div class="item">
            <div><strong>ID:</strong> \${item.id}</div>
            <div>
              <strong>size:</strong> \${item.size} |
              <strong>CPM:</strong> \${item.minCPM}—\${item.maxCPM} |
              <strong>geo:</strong> \${item.geo || '-'}
            </div>
            <div>
              <strong>creative:</strong>
              <a href="\${apiOrigin}\${item.creativePath}" target="_blank" rel="noopener">
                \${item.creativePath}
              </a>
            </div>
            <div><strong>active:</strong> \${item.active ? 'true' : 'false'}</div>
          </div>\`).join('');
      } catch {
        itemsContainer.innerHTML = '<span class="err">Помилка завантаження</span>';
      }
    }

    reloadButton?.addEventListener('click', loadLineItems);

    formEl?.addEventListener('submit', async (event) => {
      event.preventDefault();
      messageEl.textContent = 'Відправка...';
      messageEl.className = 'msg';

      try {
        const formData = new FormData(formEl);
        const response = await fetch(createEndpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          messageEl.textContent = 'Помилка: ' + (error.message || response.statusText);
          messageEl.className = 'msg err';
          return;
        }

        messageEl.textContent = 'Створено!';
        messageEl.className = 'msg ok';
        formEl.reset();
        loadLineItems();
      } catch {
        messageEl.textContent = 'Помилка мережі';
        messageEl.className = 'msg err';
      }
    });

    loadLineItems();
  }
}

if (!customElements.get('line-item-form')) {
  customElements.define('line-item-form', LineItemForm);
}
`;
    reply.header("Content-Type", "application/javascript; charset=utf-8").send(js);
  });
}
