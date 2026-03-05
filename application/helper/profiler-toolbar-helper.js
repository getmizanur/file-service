// application/helper/profiler-toolbar-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class ProfilerToolbarHelper extends AbstractHelper {

  render(...args) {
    if (process.env.PROFILER_ENABLED !== 'true') return '';

    const { context } = this._extractContext(args);

    return this.withContext(context, () => {
      const profiler = this.getVariable('_profiler');
      if (!profiler || !profiler.isEnabled()) return '';

      const data = profiler.getProfileData();
      if (!data) return '';

      return this._buildHtml(data);
    });
  }

  _buildHtml(data) {
    const esc = (v) => this._escapeHtml(v);
    const route = data.route || {};
    const routeStr = esc(`${route.method || '?'} ${route.path || '?'}`);

    const consoleLogs = data.consoleLogs || [];
    const consoleErrors = consoleLogs.filter(c => c.level === 'error').length;

    // Summary bar text
    const summaryParts = [
      `${data.totalMs.toFixed(1)}ms`,
      `SQL: ${data.queryCount} (${data.totalQueryMs.toFixed(1)}ms)`,
      data.cacheTotal > 0 ? `Cache: ${data.cacheHits}/${data.cacheTotal} hits` : null,
      consoleLogs.length > 0 ? `Console: ${consoleLogs.length}${consoleErrors > 0 ? ` <span style="color:#f87171">(${consoleErrors} err)</span>` : ''}` : null,
      routeStr
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    // Query rows
    let queryRows = '';
    if (data.queries.length > 0) {
      data.queries.forEach((q, i) => {
        const color = q.durationMs < 10 ? '#4ade80' : q.durationMs < 50 ? '#facc15' : '#f87171';
        const params = q.params ? `<div class="pft-params">${esc(JSON.stringify(q.params))}</div>` : '';
        queryRows += `<tr>
          <td class="pft-idx">${i + 1}</td>
          <td class="pft-dur" style="color:${color}">${q.durationMs.toFixed(2)}ms</td>
          <td class="pft-sql"><code>${esc(q.sql)}</code>${params}</td>
        </tr>`;
      });
    } else {
      queryRows = '<tr><td colspan="3" style="text-align:center;opacity:.5">No SQL queries</td></tr>';
    }

    // Console rows
    let consoleRows = '';
    if (consoleLogs.length > 0) {
      consoleLogs.forEach((c, i) => {
        const lvl = c.level || 'log';
        const badgeClass = lvl === 'error' ? 'pft-con-error' : lvl === 'warn' ? 'pft-con-warn' : 'pft-con-log';
        const label = lvl.toUpperCase();
        consoleRows += `<tr>
          <td class="pft-idx">${i + 1}</td>
          <td><span class="pft-badge ${badgeClass}">${label}</span></td>
          <td class="pft-con-msg"><code>${esc(c.message)}</code></td>
        </tr>`;
      });
    } else {
      consoleRows = '<tr><td colspan="3" style="text-align:center;opacity:.5">No console output</td></tr>';
    }

    // Request sections
    const reqData = data.request || {};
    const renderSection = (title, obj) => {
      if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return '';
      let rows = '';
      Object.entries(obj).forEach(([k, v]) => {
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
        rows += `<tr><td class="pft-req-key">${esc(k)}</td><td><code>${esc(val)}</code></td></tr>`;
      });
      return `<div class="pft-req-section"><div class="pft-req-title">${title}</div><table class="pft-table"><tbody>${rows}</tbody></table></div>`;
    };

    let requestContent = '';
    requestContent += renderSection('Route', { method: reqData.method, url: reqData.url, ip: reqData.ip });
    requestContent += renderSection('Query String', reqData.query);
    requestContent += renderSection('POST / Body', reqData.body);
    requestContent += renderSection('Route Params', reqData.params);
    requestContent += renderSection('Cookies', reqData.cookies);
    requestContent += renderSection('Headers', reqData.headers);
    if (!requestContent) requestContent = '<div style="text-align:center;opacity:.5;padding:12px">No request data</div>';

    // Cache rows
    let cacheRows = '';
    if (data.cacheOps.length > 0) {
      data.cacheOps.forEach(c => {
        const badge = c.hit
          ? '<span class="pft-badge pft-hit">HIT</span>'
          : '<span class="pft-badge pft-miss">MISS</span>';
        cacheRows += `<tr><td>${badge}</td><td><code>${esc(c.key)}</code></td></tr>`;
      });
    } else {
      cacheRows = '<tr><td colspan="2" style="text-align:center;opacity:.5">No cache operations</td></tr>';
    }

    return `
<div id="pft-root">
  <div id="pft-bar">
    <span class="pft-icon">&#9632;</span> <strong>Profiler</strong> &nbsp; ${summaryParts}
    <span class="pft-toggle">&#9650;</span>
  </div>
  <div id="pft-panel">
    <div class="pft-tabs">
      <button class="pft-tab pft-tab-active" onclick="pftSwitchTab(event,'pft-tab-sql')">SQL (${data.queryCount})</button>
      <button class="pft-tab" onclick="pftSwitchTab(event,'pft-tab-cache')">Cache (${data.cacheTotal})</button>
      <button class="pft-tab" onclick="pftSwitchTab(event,'pft-tab-console')">Console (${consoleLogs.length})</button>
      <button class="pft-tab" onclick="pftSwitchTab(event,'pft-tab-request')">Request</button>
    </div>
    <div id="pft-tab-sql" class="pft-content pft-content-active">
      <table class="pft-table">
        <thead><tr><th>#</th><th>Time</th><th>Query</th></tr></thead>
        <tbody>${queryRows}</tbody>
      </table>
    </div>
    <div id="pft-tab-cache" class="pft-content">
      <table class="pft-table">
        <thead><tr><th>Status</th><th>Key</th></tr></thead>
        <tbody>${cacheRows}</tbody>
      </table>
    </div>
    <div id="pft-tab-console" class="pft-content">
      <table class="pft-table">
        <thead><tr><th>#</th><th>Level</th><th>Message</th></tr></thead>
        <tbody>${consoleRows}</tbody>
      </table>
    </div>
    <div id="pft-tab-request" class="pft-content">
      ${requestContent}
    </div>
  </div>
</div>
<style>
#pft-root{position:fixed;bottom:0;left:0;right:0;z-index:99999;font-family:'SF Mono',Monaco,Consolas,'Liberation Mono',monospace;font-size:12px;line-height:1.4}
#pft-bar{background:#1a1a2e;color:#e0e0e0;padding:6px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;border-top:2px solid #6c63ff}
#pft-bar:hover{background:#22224a}
#pft-bar strong{color:#a78bfa}
.pft-icon{color:#6c63ff;font-size:14px}
.pft-toggle{margin-left:auto;font-size:10px;transition:transform .2s;transform:rotate(180deg)}
#pft-bar.pft-expanded .pft-toggle{transform:rotate(0deg)}
#pft-panel{background:#12121f;color:#d0d0d0;max-height:0;overflow:hidden;transition:max-height .25s ease}
#pft-panel.pft-open{max-height:350px;overflow-y:auto}
.pft-tabs{display:flex;gap:0;border-bottom:1px solid #333;padding:0 10px}
.pft-tab{background:none;border:none;color:#888;padding:8px 16px;cursor:pointer;font-size:12px;font-family:inherit;border-bottom:2px solid transparent}
.pft-tab:hover{color:#ccc}
.pft-tab-active{color:#a78bfa!important;border-bottom-color:#6c63ff!important}
.pft-content{display:none;padding:8px 10px}
.pft-content-active{display:block}
.pft-table{width:100%;border-collapse:collapse}
.pft-table th{text-align:left;color:#888;font-weight:500;padding:4px 8px;border-bottom:1px solid #2a2a3a;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.pft-table td{padding:4px 8px;border-bottom:1px solid #1e1e30;vertical-align:top}
.pft-idx{width:30px;color:#666;text-align:right}
.pft-dur{width:80px;font-weight:600;white-space:nowrap}
.pft-sql code{word-break:break-all;color:#c9d1d9}
.pft-params{color:#888;font-size:11px;margin-top:2px}
.pft-badge{display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.5px}
.pft-hit{background:#064e3b;color:#34d399}
.pft-miss{background:#7f1d1d;color:#fca5a5}
.pft-con-log{background:#1e3a5f;color:#93c5fd}
.pft-con-warn{background:#713f12;color:#fde047}
.pft-con-error{background:#7f1d1d;color:#fca5a5}
.pft-con-msg code{word-break:break-all;color:#c9d1d9}
.pft-req-section{margin-bottom:8px}
.pft-req-title{color:#a78bfa;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px 2px;border-bottom:1px solid #2a2a3a}
.pft-req-key{width:180px;color:#93c5fd;font-weight:500;white-space:nowrap}
</style>
<script>
(function(){
  var bar=document.getElementById('pft-bar');
  var panel=document.getElementById('pft-panel');
  var qs=new URLSearchParams(window.location.search);
  var forceOpen=qs.get('profiler')==='1';
  var stored=localStorage.getItem('pft-open');
  if(forceOpen||stored==='1'){panel.classList.add('pft-open');bar.classList.add('pft-expanded')}
  bar.addEventListener('click',function(){
    panel.classList.toggle('pft-open');
    bar.classList.toggle('pft-expanded');
    localStorage.setItem('pft-open',panel.classList.contains('pft-open')?'1':'0');
  });
})();
function pftSwitchTab(e,id){
  document.querySelectorAll('.pft-tab').forEach(function(t){t.classList.remove('pft-tab-active')});
  document.querySelectorAll('.pft-content').forEach(function(c){c.classList.remove('pft-content-active')});
  e.target.classList.add('pft-tab-active');
  document.getElementById(id).classList.add('pft-content-active');
}
</script>`;
  }
}

module.exports = ProfilerToolbarHelper;
