const slip = document.querySelector('#bet-slip');
const content = document.querySelector('#bet-content');
const count = document.querySelector('#bet-count');
const stake = document.querySelector('#stake');
const returnValue = document.querySelector('#return-value');
const modal = document.querySelector('#login-modal');
const loginButton = document.querySelector('#login-button');
const statusButton = document.querySelector('#refresh-status');

let selection = null;

const setLoginState = (userName) => {
  if (!userName) {
    loginButton.innerHTML = 'เข้าสู่ระบบ <span>↗</span>';
    return;
  }

  loginButton.innerHTML = `${userName} <span>↗</span>`;
};

const showLogin = () => modal.classList.remove('hidden');
const hideLogin = () => modal.classList.add('hidden');

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
document.querySelectorAll('#login-button, #place-bet, #register-link').forEach((button) => {
  button.onclick = showLogin;
});
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
if (savedUser?.name) {
  setLoginState(savedUser.name);
}

document.querySelector('#login-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  button.disabled = true;
  button.innerHTML = 'กำลังเข้าสู่ระบบ...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');

    localStorage.setItem('five-poll-token', data.token);
    localStorage.setItem('five-poll-user', JSON.stringify(data.user));
    setLoginState(data.user.name);
    hideLogin();
    form.reset();
  } catch (error) {
    button.innerHTML = error.message;
    setTimeout(() => {
      button.innerHTML = 'เข้าสู่ระบบ <span>→</span>';
      button.disabled = false;
    }, 1800);
    return;
  }

  button.disabled = false;
  button.innerHTML = 'เข้าสู่ระบบ <span>→</span>';
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

