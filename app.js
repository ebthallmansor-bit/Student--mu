const STORAGE_KEY = 'student_mu_mutah_v1';

function createInitialData() {
  const in18Hours = new Date(Date.now() + 18 * 3600 * 1000).toISOString().slice(0, 16);
  const in3Days = new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 16);

  return {
    profile: {
      name: 'طالب جامعة مؤتة',
      major: 'كلية تكنولوجيا المعلومات',
    },
    tasks: [
      {
        id: 'demo-1',
        uid: 'demo-1',
        title: 'تسليم واجب هياكل البيانات (Linked List)',
        course: 'هياكل البيانات',
        type: 'واجب',
        due: in18Hours,
        notes: 'رفع ملف الحل على منصة Moodle مؤتة',
        done: false,
        isNew: true,
        createdAt: Date.now(),
      },
      {
        id: 'demo-2',
        uid: 'demo-2',
        title: 'كويز قصير في الفصل الثالث',
        course: 'تفاضل وتكامل 2',
        type: 'كويز',
        due: in3Days,
        notes: 'المراجعة من ملخص المحاضرة',
        done: false,
        isNew: true,
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'demo-3',
        uid: 'demo-3',
        title: 'إعلان: تغيير موعد محاضرة المختبر',
        course: 'برمجة C++',
        type: 'إعلان',
        due: '',
        notes: 'تم نشر التفاصيل على منصة التعليم الإلكتروني',
        done: true,
        isNew: false,
        createdAt: Date.now() - 86400000,
      },
    ],
    alerts: [
      {
        id: 'al-1',
        title: 'واجب جديد: تسليم واجب هياكل البيانات',
        body: 'الموعد قريب خلال أقل من 24 ساعة — يرجى المتابعة على منصة مؤتة.',
        read: false,
        createdAt: Date.now(),
      },
    ],
    notifiedDeadlines: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return createInitialData();
  }
}

let state = loadState();
let currentFilter = 'all';
let pomoSeconds = 25 * 60;
let pomoRunning = false;
let pomoTimer = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(msg) {
  const box = document.getElementById('toast-box');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function pushAlert(title, body, fireBrowserNotif = true) {
  state.alerts.unshift({
    id: 'al-' + Date.now() + Math.random().toString(16).slice(2, 6),
    title,
    body,
    read: false,
    createdAt: Date.now(),
  });
  if (state.alerts.length > 60) {
    state.alerts = state.alerts.slice(0, 60);
  }
  saveState();
  showToast('🔔 ' + title);

  if (fireBrowserNotif && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('Student Mu🎓 - جامعة مؤتة', {
      body: `${title} — ${body}`,
      icon: './icon.svg',
    });
  }
}

function getDeadlineInfo(dueStr, done) {
  if (!dueStr) {
    return { text: 'بدون موعد محدد', cls: 'tag-course', urgent: false, diffMs: Infinity };
  }
  const diffMs = new Date(dueStr).getTime() - Date.now();
  if (done) {
    return { text: 'تم التسليم ✅', cls: 'tag-ok', urgent: false, diffMs };
  }
  if (diffMs <= 0) {
    return { text: 'انتهى الموعد ⏰', cls: 'tag-urgent', urgent: true, diffMs };
  }

  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;

  if (hours < 24) {
    return { text: `متبقي ${hours} س و ${mins} د`, cls: 'tag-urgent', urgent: true, diffMs };
  }
  if (days <= 3) {
    return { text: `متبقي ${days} يوم و ${remH} س`, cls: 'tag-soon', urgent: false, diffMs };
  }
  return { text: `متبقي ${days} يوم`, cls: 'tag-ok', urgent: false, diffMs };
}

function switchTab(tab) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById('view-' + tab)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderAll();
}

function renderTaskCard(t) {
  const dl = getDeadlineInfo(t.due, t.done);
  const dueFormatted = t.due
    ? new Date(t.due).toLocaleString('ar-JO', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return `
    <div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-top">
        <div class="task-check-wrap">
          <button type="button" class="check-circle ${t.done ? 'checked' : ''}" data-toggle-id="${esc(t.id)}" aria-label="تبديل الإنجاز">
            ${t.done ? '✓' : ''}
          </button>
          <div>
            <div class="task-title">${esc(t.title)}</div>
            ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ''}
          </div>
        </div>
        <button type="button" class="btn btn-danger btn-sm" data-del-id="${esc(t.id)}">حذف</button>
      </div>
      <div class="task-meta">
        <span class="tag tag-course">${esc(t.course)}</span>
        <span class="tag">${esc(t.type)}</span>
        ${t.isNew && !t.done ? '<span class="tag tag-new">جديد 🆕</span>' : ''}
        ${t.due ? `<span class="tag ${dl.cls}">${dl.text}</span>` : ''}
        ${dueFormatted ? `<span>📅 ${esc(dueFormatted)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderAll() {
  const total = state.tasks.length;
  const doneCount = state.tasks.filter((t) => t.done).length;
  const remaining = total - doneCount;
  const urgentCount = state.tasks.filter((t) => !t.done && getDeadlineInfo(t.due, false).urgent).length;
  const unreadAlerts = state.alerts.filter((a) => !a.read).length;

  document.getElementById('stat-remaining').textContent = remaining;
  document.getElementById('stat-done').textContent = doneCount;
  document.getElementById('stat-urgent').textContent = urgentCount;
  document.getElementById('stat-new').textContent = unreadAlerts;

  const badge = document.getElementById('header-alert-badge');
  badge.textContent = unreadAlerts;
  badge.classList.toggle('hidden', unreadAlerts === 0);

  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById('progress-label').textContent = `${doneCount} من ${total} مهمة منجزة`;
  document.getElementById('progress-percent').textContent = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('student-badge').textContent = state.profile.name || 'جامعة مؤتة';

  // Closest Deadline
  const upcoming = state.tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => new Date(a.due) - new Date(b.due))[0];

  const nextBox = document.getElementById('next-deadline-body');
  if (upcoming) {
    const dl = getDeadlineInfo(upcoming.due, false);
    nextBox.innerHTML = `
      <strong>${esc(upcoming.title)}</strong>
      <div style="font-size:0.84rem;color:var(--muted)">المادة: ${esc(upcoming.course)}</div>
      <span class="countdown-text">${dl.text}</span>
    `;
  } else {
    nextBox.textContent = 'ممتاز! لا توجد مواعيد تسليم معلقة حالياً 🎉';
  }

  // Dashboard Latest
  const latest = state.tasks.slice(0, 4);
  document.getElementById('dash-latest-list').innerHTML = latest.length
    ? latest.map(renderTaskCard).join('')
    : '<p class="helper-text">أضف واجباتك أو استوردها من منصة جامعة مؤتة.</p>';

  // Filtered Tasks
  let filtered = state.tasks;
  if (currentFilter === 'remaining') filtered = state.tasks.filter((t) => !t.done);
  else if (currentFilter === 'done') filtered = state.tasks.filter((t) => t.done);
  else if (currentFilter === 'new') filtered = state.tasks.filter((t) => t.isNew && !t.done);
  else if (currentFilter === 'urgent') {
    filtered = state.tasks.filter((t) => !t.done && getDeadlineInfo(t.due, false).urgent);
  }

  document.getElementById('tasks-list').innerHTML = filtered.length
    ? filtered.map(renderTaskCard).join('')
    : '<p class="helper-text" style="text-align:center;padding:12px">لا توجد مهام في هذا التصنيف.</p>';

  // Alerts
  document.getElementById('alerts-list').innerHTML = state.alerts.length
    ? state.alerts
        .map(
          (a) => `
          <div class="task-item" style="${a.read ? 'opacity:0.65' : 'border-color:rgba(56,189,248,0.45)'}">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <strong>${a.read ? '🔔' : '🆕'} ${esc(a.title)}</strong>
              <small style="color:var(--muted)">${new Date(a.createdAt).toLocaleTimeString('ar-JO', {
                hour: '2-digit',
                minute: '2-digit',
              })}</small>
            </div>
            <div class="task-notes">${esc(a.body)}</div>
          </div>`
        )
        .join('')
    : '<p class="helper-text">لا توجد تنبيهات حالياً.</p>';

  // Profile Inputs
  document.getElementById('p-name').value = state.profile.name || '';
  document.getElementById('p-major').value = state.profile.major || '';

  bindDynamicButtons();
}

function bindDynamicButtons() {
  document.querySelectorAll('[data-toggle-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = state.tasks.find((x) => x.id === btn.dataset.toggleId);
      if (!t) return;
      t.done = !t.done;
      t.isNew = false;
      saveState();
      renderAll();
    });
  });

  document.querySelectorAll('[data-del-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tasks = state.tasks.filter((x) => x.id !== btn.dataset.delId);
      saveState();
      renderAll();
    });
  });
}

// Parse Moodle ICS Calendar
function parseIcsDate(val) {
  if (!val) return '';
  const m = val.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return '';
  const [, y, mo, d, h = '23', mi = '59', s = '00', isUtc] = m;
  const dt = isUtc
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(
    dt.getMinutes()
  )}`;
}

function importMoodleIcs(icsText) {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  let added = 0;

  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const getField = (name) => {
      const match = body.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'm'));
      return match ? match[1].replace(/\\n/g, ' ').replace(/\\,/g, ',').trim() : '';
    };

    const summary = getField('SUMMARY');
    if (!summary) continue;

    const uid = getField('UID') || summary + getField('DTSTART');
    const course = getField('CATEGORIES') || 'مادة من Moodle';
    const due = parseIcsDate(getField('DTEND') || getField('DTSTART'));
    const desc = getField('DESCRIPTION').slice(0, 140);

    if (!state.tasks.some((t) => t.uid === uid)) {
      state.tasks.unshift({
        id: 'ics-' + Date.now() + Math.random().toString(16).slice(2, 6),
        uid,
        title: summary,
        course,
        type: summary.toLowerCase().includes('quiz') ? 'كويز' : 'واجب',
        due,
        notes: desc || 'مستورد من تقويم منصة جامعة مؤتة',
        done: false,
        isNew: true,
        createdAt: Date.now(),
      });
      added++;
    }
  }

  if (added > 0) {
    pushAlert(
      `تم استيراد ${added} واجب/موعد جديد من مودل مؤتة`,
      'افتح قائمة الواجبات لمتابعة مواعيد التسليم.'
    );
    saveState();
    switchTab('tasks');
  } else {
    showToast('لم يتم العثور على واجبات جديدة غير مضافة مسبقاً.');
  }
}

function checkDeadlines() {
  let changed = false;
  for (const t of state.tasks) {
    if (t.done || !t.due) continue;
    const diff = new Date(t.due).getTime() - Date.now();
    if (diff > 0 && diff <= 24 * 3600 * 1000 && !state.notifiedDeadlines.includes(t.id)) {
      state.notifiedDeadlines.push(t.id);
      pushAlert(`تذكير عاجل: ${t.title}`, `موعد التسليم خلال أقل من 24 ساعة (${t.course})`);
      changed = true;
    }
  }
  if (changed) renderAll();
}

// Pomodoro Timer
function updatePomoUI() {
  const m = String(Math.floor(pomoSeconds / 60)).padStart(2, '0');
  const s = String(pomoSeconds % 60).padStart(2, '0');
  document.getElementById('pomo-time').textContent = `${m}:${s}`;
}

function togglePomodoro() {
  const btn = document.getElementById('pomo-toggle');
  if (pomoRunning) {
    clearInterval(pomoTimer);
    pomoRunning = false;
    btn.textContent = '▶';
    return;
  }
  pomoRunning = true;
  btn.textContent = '⏸';
  pomoTimer = setInterval(() => {
    pomoSeconds--;
    updatePomoUI();
    if (pomoSeconds <= 0) {
      clearInterval(pomoTimer);
      pomoRunning = false;
      pomoSeconds = 25 * 60;
      updatePomoUI();
      btn.textContent = '▶';
      pushAlert('انتهت جلسة التركيز (25 دقيقة)', 'أحسنت! خذ استراحة قصيرة قبل الجلسة التالية.');
      renderAll();
    }
  }, 1000);
}

// Bind Static Events
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.jumpTab));
});

document.getElementById('alerts-jump-btn').addEventListener('click', () => switchTab('alerts'));

document.getElementById('pomo-toggle').addEventListener('click', togglePomodoro);
document.getElementById('pomo-reset').addEventListener('click', () => {
  clearInterval(pomoTimer);
  pomoRunning = false;
  pomoSeconds = 25 * 60;
  updatePomoUI();
  document.getElementById('pomo-toggle').textContent = '▶';
});

document.getElementById('enable-notif-btn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    return showToast('هذا المتصفح لا يدعم إشعارات النظام.');
  }
  const perm = await Notification.requestPermission();
  showToast(
    perm === 'granted'
      ? 'تم تفعيل إشعارات المتصفح بنجاح 🔔'
      : 'يرجى السماح بالإشعارات من إعدادات المتصفح.'
  );
});

document.getElementById('task-filters').addEventListener('click', (e) => {
  const filter = e.target.dataset.filter;
  if (!filter) return;
  document.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
  e.target.classList.add('active');
  currentFilter = filter;
  renderAll();
});

document.getElementById('add-task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('t-title').value.trim();
  const course = document.getElementById('t-course').value.trim();
  const type = document.getElementById('t-type').value;
  const due = document.getElementById('t-due').value;
  const notes = document.getElementById('t-notes').value.trim();

  state.tasks.unshift({
    id: 't-' + Date.now(),
    uid: 't-' + Date.now(),
    title,
    course,
    type,
    due,
    notes,
    done: false,
    isNew: true,
    createdAt: Date.now(),
  });

  pushAlert(`${type} جديد في ${course}`, title);
  e.target.reset();
  saveState();
  renderAll();
});

document.getElementById('quick-announce-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const course = document.getElementById('ann-course').value.trim();
  const text = document.getElementById('ann-text').value.trim();

  state.tasks.unshift({
    id: 'ann-' + Date.now(),
    uid: 'ann-' + Date.now(),
    title: `إعلان: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`,
    course,
    type: 'إعلان',
    due: '',
    notes: text,
    done: false,
    isNew: true,
    createdAt: Date.now(),
  });

  pushAlert(`إعلان جديد في ${course}`, text.slice(0, 80));
  e.target.reset();
  saveState();
  switchTab('tasks');
});

document.getElementById('import-ics-btn').addEventListener('click', async () => {
  const file = document.getElementById('ics-file-input').files?.[0];
  if (!file) {
    return showToast('يرجى اختيار ملف .ics أولاً.');
  }
  const text = await file.text();
  importMoodleIcs(text);
});

document.getElementById('mark-all-read-btn').addEventListener('click', () => {
  state.alerts.forEach((a) => (a.read = true));
  state.tasks.forEach((t) => (t.isNew = false));
  saveState();
  renderAll();
});

document.getElementById('profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile.name = document.getElementById('p-name').value.trim() || 'طالب جامعة مؤتة';
  state.profile.major = document.getElementById('p-major').value.trim();
  saveState();
  renderAll();
  showToast('تم حفظ بيانات الطالب ✅');
});

document.getElementById('export-json-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'student-mu-backup.json';
  a.click();
});

document.getElementById('import-json-input').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data.tasks)) {
      state = data;
      saveState();
      renderAll();
      showToast('تم استرجاع النسخة الاحتياطية ✅');
    } else {
      showToast('بنية الملف غير صالحة.');
    }
  } catch {
    showToast('تعذر قراءة ملف النسخة الاحتياطية.');
  }
});

document.getElementById('reset-data-btn').addEventListener('click', () => {
  if (!confirm('هل أنت متأكد من مسح جميع الواجبات والتنبيهات؟')) return;
  state = { profile: state.profile, tasks: [], alerts: [], notifiedDeadlines: [] };
  saveState();
  renderAll();
  showToast('تم مسح البيانات');
});

// Register Service Worker for Offline/PWA support on GitHub Pages
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

renderAll();
checkDeadlines();
setInterval(() => {
  renderAll();
  checkDeadlines();
}, 30000);