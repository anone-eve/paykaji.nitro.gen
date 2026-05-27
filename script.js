const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 16;

let running = false;
let validCodes = [];
let validCount = 0;
let invalidCount = 0;
let totalToCheck = 0;
let checkedCount = 0;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

function addLog(message, type = 'info') {
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = message;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function updateStats() {
  document.getElementById('valid-count').textContent = validCount;
  document.getElementById('invalid-count').textContent = invalidCount;
  document.getElementById('total-count').textContent = checkedCount;

  const pct = totalToCheck > 0 ? Math.round((checkedCount / totalToCheck) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent =
    running
      ? `チェック中... ${checkedCount} / ${totalToCheck} (${pct}%)`
      : checkedCount > 0
      ? `完了: ${checkedCount} / ${totalToCheck}`
      : '待機中';
}

async function checkCode(code, webhookUrl) {
  const apiUrl = `https://discordapp.com/api/v9/entitlements/gift-codes/${code}?with_application=false&with_subscription_plan=true`;
  try {
    const res = await fetch(apiUrl);
    if (res.status === 200) {
      return { valid: true };
    } else {
      return { valid: false, status: res.status };
    }
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function sendWebhook(webhookUrl, code) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `✅ 有効なNitroコードを発見！ @everyone\nhttps://discord.gift/${code}`
      })
    });
  } catch (_) {}
}

function showValidCard() {
  const card = document.getElementById('valid-card');
  card.style.display = 'block';
}

function addValidCode(code) {
  showValidCard();
  const list = document.getElementById('valid-list');
  const el = document.createElement('div');
  el.className = 'valid-code';
  el.textContent = `https://discord.gift/${code}`;
  list.appendChild(el);
}

async function startGen() {
  const count = parseInt(document.getElementById('count').value);
  const webhookUrl = document.getElementById('webhook').value.trim();
  const delay = parseInt(document.getElementById('delay').value) || 500;

  if (!count || count < 1) {
    addLog('コード数を正しく入力してください', 'error');
    return;
  }

  running = true;
  validCount = 0;
  invalidCount = 0;
  checkedCount = 0;
  totalToCheck = count;
  validCodes = [];

  document.getElementById('start-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;
  document.getElementById('valid-card').style.display = 'none';
  document.getElementById('valid-list').innerHTML = '';

  addLog(`開始: ${count}件のコードを生成・チェックします`, 'info');

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '```チェック開始: 有効なコードが見つかり次第通知します```' })
      });
    } catch (_) {}
  }

  for (let i = 0; i < count; i++) {
    if (!running) break;

    const code = generateCode();
    const result = await checkCode(code);

    checkedCount++;

    if (result.error) {
      addLog(`エラー | ${code} — ${result.error}`, 'error');
    } else if (result.valid) {
      validCount++;
      validCodes.push(code);
      addLog(`✅ 有効 | https://discord.gift/${code}`, 'valid');
      addValidCode(code);
      if (webhookUrl) await sendWebhook(webhookUrl, code);
    } else {
      invalidCount++;
      addLog(`✗ 無効 | ${code}`, 'invalid');
    }

    updateStats();

    if (i < count - 1 && running) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  running = false;
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  updateStats();
  addLog(
    `完了 — 有効: ${validCount}, 無効: ${invalidCount}`,
    validCount > 0 ? 'valid' : 'info'
  );
}

function stopGen() {
  running = false;
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  addLog('ユーザーによって停止されました', 'info');
  updateStats();
}

function clearLog() {
  document.getElementById('log').innerHTML = '';
}

function copyValid() {
  if (validCodes.length === 0) return;
  const text = validCodes.map(c => `https://discord.gift/${c}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    addLog('有効コードをクリップボードにコピーしました', 'info');
  }).catch(() => {
    addLog('コピーに失敗しました', 'error');
  });
}
