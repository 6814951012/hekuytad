const slip = document.querySelector('#bet-slip');
const content = document.querySelector('#bet-content');
const count = document.querySelector('#bet-count');
const stake = document.querySelector('#stake');
const returnValue = document.querySelector('#return-value');
const modal = document.querySelector('#login-modal');
const loginButton = document.querySelector('#login-button');
const statusButton = document.querySelector('#refresh-status');
const authForm = document.querySelector('#login-form');
const authSubmit = authForm.querySelector('button[type="submit"]');
const authError = document.querySelector('#auth-error');
const nameField = authForm.querySelector('.name-field');
const passwordField = authForm.elements.password;
let authMode = 'login';

let selection = null;

const setLoginState = (userName) => {
  loginButton.replaceChildren(document.createTextNode(userName ? `${userName} · ออกจากระบบ ` : 'เข้าสู่ระบบ / สมัครสมาชิก '));
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  loginButton.append(arrow);
};

const showLogin = () => modal.classList.remove('hidden');
const hideLogin = () => modal.classList.add('hidden');
const setAuthMode = (mode) => {
  authMode = mode;
  const registering = mode === 'register';
  nameField.classList.toggle('hidden', !registering);
  authForm.elements.name.required = registering;
  passwordField.autocomplete = registering ? 'new-password' : 'current-password';
  passwordField.placeholder = registering ? 'อย่างน้อย 8 ตัวอักษร' : '••••••••';
  document.querySelector('#auth-eyebrow').textContent = registering ? 'JOIN THE CLUB' : 'WELCOME BACK';
  document.querySelector('#login-title').innerHTML = registering ? 'สมัครสมาชิก<br /><em>เริ่มต้นได้เลย</em>' : 'กลับเข้าสู่<br /><em>เกมของคุณ</em>';
  document.querySelector('#auth-description').textContent = registering ? 'สร้างบัญชีเพื่อบันทึกข้อมูลและติดตามทีมโปรด' : 'เข้าสู่ระบบเพื่อบันทึกข้อมูลและติดตามทีมโปรด';
  authSubmit.innerHTML = registering ? 'สมัครสมาชิก <span>→</span>' : 'เข้าสู่ระบบ <span>→</span>';
  document.querySelector('#auth-switch').innerHTML = registering
    ? 'มีบัญชีอยู่แล้ว? <button type="button" class="inline-link" id="register-link">เข้าสู่ระบบ</button>'
    : 'ยังไม่มีบัญชี? <button type="button" class="inline-link" id="register-link">สมัครสมาชิกฟรี</button>';
  authError.textContent = '';
};

const openAuth = (mode = 'login') => {
  setAuthMode(mode);
  showLogin();
};

const updateSlip = () => {
  if (!selection) return;

  count.textContent = '1';
  content.className = 'selected-bet';
  content.innerHTML = `
    <button class="remove-bet" type="button" aria-label="ลบตัวเลือก">×</button>
    <span>เลือกเดิมพัน</span>
    <strong>${selection.label}</strong>
    <b>@ ${selection.price.toFixed(2)}</b>
  `;

  const amount = Number(stake.value) || 0;
  returnValue.textContent = `฿${(amount * selection.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  const removeButton = content.querySelector('.remove-bet');
  if (removeButton) {
    removeButton.onclick = () => {
      selection = null;
      count.textContent = '0';
      content.className = 'empty-bet';
      content.innerHTML = '<span>+</span><p>เลือกอัตราต่อรอง<br />เพื่อเริ่มวางบิล</p>';
      returnValue.textContent = '฿0.00';
    };
  }
};

document.querySelectorAll('[data-odd]').forEach((button) => {
  button.onclick = () => {
    const [label, price] = button.dataset.odd.split(' ');
    selection = { label: `${label} ชนะ`, price: Number(price) };
    document.querySelectorAll('.odds button').forEach((element) => element.classList.remove('picked'));
    button.classList.add('picked');
    slip.classList.add('open');
    updateSlip();
  };
});

document.querySelectorAll('.bet-match').forEach((button) => {
  button.onclick = () => {
    selection = { label: `${button.dataset.match} · ผู้ชนะ`, price: 1.85 };
    slip.classList.add('open');
    updateSlip();
  };
});

stake.oninput = updateSlip;
document.querySelector('.close-slip').onclick = () => slip.classList.remove('open');
document.querySelectorAll('#place-bet').forEach((button) => {
  button.onclick = () => openAuth('login');
});
document.querySelector('#auth-switch').addEventListener('click', (event) => {
  if (event.target.closest('#register-link')) openAuth(authMode === 'login' ? 'register' : 'login');
});
loginButton.onclick = () => {
  if (getStoredUser()) {
    localStorage.removeItem('five-poll-token');
    localStorage.removeItem('five-poll-user');
    setLoginState(null);
    openAuth('login');
  } else openAuth('login');
};
document.querySelector('.close-modal').onclick = hideLogin;
modal.onclick = (event) => {
  if (event.target === modal) hideLogin();
};

document.querySelectorAll('[data-scroll]').forEach((button) => {
  button.onclick = () => {
    const target = document.querySelector(button.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
});

document.querySelectorAll('.filter').forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll('.filter').forEach((el) => el.classList.remove('active'));
    button.classList.add('active');
  };
});

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('five-poll-user') || 'null');
  } catch {
    return null;
  }
};

const savedUser = getStoredUser();
if (savedUser?.name && localStorage.getItem('five-poll-token')) setLoginState(savedUser.name);

const restoreSession = async () => {
  const token = localStorage.getItem('five-poll-token');
  if (!token) return;
  try {
    const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Session expired');
    const { user } = await response.json();
    localStorage.setItem('five-poll-user', JSON.stringify(user));
    setLoginState(user.name);
  } catch {
    localStorage.removeItem('five-poll-token');
    localStorage.removeItem('five-poll-user');
    setLoginState(null);
  }
};
restoreSession();

authForm.onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  authSubmit.disabled = true;
  authError.textContent = '';
  authSubmit.textContent = authMode === 'register' ? 'กำลังสมัครสมาชิก...' : 'กำลังเข้าสู่ระบบ...';

  try {
    const response = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(authMode === 'register' ? { name: form.elements.name.value.trim() } : {}) }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || (authMode === 'register' ? 'สมัครสมาชิกไม่สำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ'));

    localStorage.setItem('five-poll-token', data.token);
    localStorage.setItem('five-poll-user', JSON.stringify(data.user));
    setLoginState(data.user.name);
    hideLogin();
    form.reset();
  } catch (error) {
    authError.textContent = error.message || 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองอีกครั้ง';
  }

  authSubmit.disabled = false;
  authSubmit.innerHTML = authMode === 'register' ? 'สมัครสมาชิก <span>→</span>' : 'เข้าสู่ระบบ <span>→</span>';
};

statusButton.onclick = async () => {
  statusButton.disabled = true;
  statusButton.textContent = 'กำลังอัพเดท...';

  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    if (!response.ok) throw new Error('API unavailable');
    statusButton.textContent = data.status === 'ok' ? 'อัพเดทแล้ว' : 'อัพเดทไม่สำเร็จ';
  } catch (error) {
    statusButton.textContent = 'อัพเดทไม่สำเร็จ';
  }

  setTimeout(() => {
    statusButton.textContent = 'อัพเดท';
    statusButton.disabled = false;
  }, 1200);
};

document.querySelector('#quick-refresh').onclick = () => {
  statusButton.click();
};

