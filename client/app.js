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
const walletBalanceLabel = document.querySelector('#wallet-balance');
const walletStatus = document.querySelector('#wallet-status');
const openTopUpButton = document.querySelector('#open-top-up');
const walletModal = document.querySelector('#wallet-modal');
const topUpForm = document.querySelector('#top-up-form');
const topUpError = document.querySelector('#top-up-error');
const placeBetButton = document.querySelector('#place-bet');
const betMessage = document.querySelector('#bet-message');
const betHistory = document.querySelector('#bet-history');
const walletTransactions = document.querySelector('#wallet-transactions');
const matchesGrid = document.querySelector('#matches-grid');
const leagueFilters = document.querySelector('#league-filters');
const fixtureTicker = document.querySelector('#fixture-ticker');
const fixtureSeason = document.querySelector('#fixture-season');
let authMode = 'login';
let walletBalance = 0;
let walletBusy = false;
let fixtures = [];
let activeLeagueFilter = 'all';

let selection = null;

const setLoginState = (userName) => {
  loginButton.replaceChildren(document.createTextNode(userName ? `${userName} · ออกจากระบบ ` : 'เข้าสู่ระบบ / สมัครสมาชิก '));
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  loginButton.append(arrow);
  updateWalletControls(Boolean(userName));
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
  returnValue.textContent = `${formatCredits(Math.round(amount * selection.price))} เครดิต`;

  const removeButton = content.querySelector('.remove-bet');
  if (removeButton) {
    removeButton.onclick = () => {
      selection = null;
      document.querySelectorAll('.odds button').forEach((element) => element.classList.remove('picked'));
      count.textContent = '0';
      content.className = 'empty-bet';
      content.innerHTML = '<span>+</span><p>เลือกอัตราต่อรอง<br />เพื่อเริ่มวางบิล</p>';
      returnValue.textContent = '0 เครดิต';
      betMessage.textContent = '';
      updateWalletControls(Boolean(getStoredUser()));
    };
  }
  updateWalletControls(Boolean(getStoredUser()));
};

matchesGrid.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-fixture-id]');
  if (!button || !matchesGrid.contains(button)) return;
  const fixture = fixtures.find((item) => String(item.id) === button.dataset.fixtureId);
  if (!fixture) return;

  const matchName = `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`;
  const outcome = button.dataset.outcome;
  selection = {
    fixtureId: fixture.id,
    matchName,
    outcome,
    label: `${matchName}: ${outcome}`,
    price: Number(button.dataset.price),
  };
  matchesGrid.querySelectorAll('.odds button').forEach((element) => element.classList.remove('picked'));
  button.classList.add('picked');
  slip.classList.add('open');
  betMessage.textContent = '';
  updateSlip();
});

leagueFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-league-filter]');
  if (!button) return;
  activeLeagueFilter = button.dataset.leagueFilter;
  leagueFilters.querySelectorAll('.filter').forEach((filter) => filter.classList.toggle('active', filter === button));
  renderFixtures();
});

stake.oninput = updateSlip;
document.querySelector('.close-slip').onclick = () => slip.classList.remove('open');
placeBetButton.onclick = async () => {
  if (!selection) return;
  if (!localStorage.getItem('five-poll-token')) {
    openAuth('login');
    return;
  }

  const amount = Number(stake.value);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    betMessage.textContent = 'กรอกยอดเดิมพันเป็นจำนวนเครดิตเต็มอย่างน้อย 1 เครดิต';
    return;
  }

  walletBusy = true;
  betMessage.textContent = '';
  updateWalletControls(Boolean(getStoredUser()));
  try {
    const response = await fetch('/api/wallet/bets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('five-poll-token')}`,
      },
      body: JSON.stringify({
        matchName: selection.matchName,
        fixtureId: selection.fixtureId,
        selection: selection.outcome,
        odds: selection.price,
        stake: amount,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'วางเดิมพันไม่สำเร็จ');

    selection = null;
    stake.value = '';
    document.querySelectorAll('.odds button').forEach((element) => element.classList.remove('picked'));
    count.textContent = '0';
    content.className = 'empty-bet';
    content.innerHTML = '<span>+</span><p>เลือกอัตราต่อรอง<br />เพื่อเริ่มวางบิล</p>';
    returnValue.textContent = '0 เครดิต';
    await loadWallet();
    betMessage.textContent = `วางบิลแล้ว รับโดยประมาณ ${formatCredits(data.bet.potentialReturn)} เครดิต`;
  } catch (error) {
    betMessage.textContent = error.message || 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองอีกครั้ง';
  } finally {
    walletBusy = false;
    updateWalletControls(Boolean(getStoredUser()));
  }
};
document.querySelector('#auth-switch').addEventListener('click', (event) => {
  if (event.target.closest('#register-link')) openAuth(authMode === 'login' ? 'register' : 'login');
});
loginButton.onclick = () => {
  if (getStoredUser()) {
    localStorage.removeItem('five-poll-token');
    localStorage.removeItem('five-poll-user');
    walletBalance = 0;
    renderWalletHistory({ bets: [], transactions: [] }, 'เข้าสู่ระบบเพื่อดูรายการ');
    setLoginState(null);
    openAuth('login');
  } else openAuth('login');
};
document.querySelector('.close-modal').onclick = hideLogin;
modal.onclick = (event) => {
  if (event.target === modal) hideLogin();
};
document.querySelector('#start-betting').onclick = () => {
  document.querySelector('#matches').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
openTopUpButton.onclick = () => {
  if (!localStorage.getItem('five-poll-token')) {
    openAuth('login');
    return;
  }
  topUpError.textContent = '';
  walletModal.classList.remove('hidden');
};
document.querySelector('#close-wallet-modal').onclick = () => walletModal.classList.add('hidden');
walletModal.onclick = (event) => {
  if (event.target === walletModal) walletModal.classList.add('hidden');
};
document.querySelectorAll('[data-top-up]').forEach((button) => {
  button.onclick = () => { topUpForm.elements.amount.value = button.dataset.topUp; };
});
topUpForm.onsubmit = async (event) => {
  event.preventDefault();
  if (!localStorage.getItem('five-poll-token')) {
    walletModal.classList.add('hidden');
    openAuth('login');
    return;
  }

  walletBusy = true;
  topUpError.textContent = '';
  updateWalletControls(Boolean(getStoredUser()));
  try {
    const response = await fetch('/api/wallet/top-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('five-poll-token')}`,
      },
      body: JSON.stringify({ amount: Number(topUpForm.elements.amount.value) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'เติมเครดิตไม่สำเร็จ');
    walletBalance = data.balance;
    walletModal.classList.add('hidden');
    await loadWallet();
  } catch (error) {
    topUpError.textContent = error.message || 'เติมเครดิตไม่สำเร็จ';
  } finally {
    walletBusy = false;
    updateWalletControls(Boolean(getStoredUser()));
  }
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

const formatCredits = (amount) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(amount || 0);

const leagueNames = {
  'English Premier League': 'พรีเมียร์ลีก',
  'Spanish La Liga': 'ลาลีกา',
  'German Bundesliga': 'บุนเดสลีกา',
  'Italian Serie A': 'เซเรีย อา',
  'French Ligue 1': 'ลีกเอิง',
  'UEFA Champions League': 'ยูฟ่า แชมเปียนส์ลีก',
};

const createTeamLogo = (team) => {
  const image = document.createElement('img');
  image.src = team.logo;
  image.alt = `${team.name} logo`;
  image.loading = 'lazy';
  image.addEventListener('error', () => {
    const fallback = document.createElement('span');
    fallback.className = 'team-logo-fallback';
    fallback.textContent = team.name.slice(0, 2).toUpperCase();
    image.replaceWith(fallback);
  }, { once: true });
  return image;
};

const formatKickoff = (date) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Bangkok',
}).format(new Date(date));

const renderLeagueFilters = () => {
  const leagues = [...new Map(fixtures.map((fixture) => [fixture.league.id, fixture.league])).values()];
  leagueFilters.replaceChildren();
  const allButton = document.createElement('button');
  allButton.className = `filter${activeLeagueFilter === 'all' ? ' active' : ''}`;
  allButton.type = 'button';
  allButton.dataset.leagueFilter = 'all';
  allButton.textContent = `ทุกลีก ${fixtures.length}`;
  leagueFilters.append(allButton);

  leagues.forEach((league) => {
    const button = document.createElement('button');
    button.className = `filter${activeLeagueFilter === league.id ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.leagueFilter = league.id;
    button.textContent = leagueNames[league.name] || league.name;
    leagueFilters.append(button);
  });
};

const renderFixtures = () => {
  const visibleFixtures = fixtures.filter((fixture) => activeLeagueFilter === 'all' || fixture.league.id === activeLeagueFilter);
  matchesGrid.replaceChildren();
  matchesGrid.setAttribute('aria-busy', 'false');

  if (!visibleFixtures.length) {
    const state = document.createElement('p');
    state.className = 'fixtures-state';
    state.textContent = fixtures.length ? 'ลีกนี้ยังไม่มีโปรแกรมถัดไป' : 'ยังไม่พบโปรแกรมแข่งขันถัดไป';
    matchesGrid.append(state);
    return;
  }

  visibleFixtures.forEach((fixture) => {
    const card = document.createElement('article');
    card.className = 'match-card fixture-card';

    const leagueLine = document.createElement('div');
    leagueLine.className = 'league-line fixture-league-line';
    if (fixture.league.logo) {
      const leagueLogo = document.createElement('img');
      leagueLogo.className = 'league-badge';
      leagueLogo.src = fixture.league.logo;
      leagueLogo.alt = '';
      leagueLogo.loading = 'lazy';
      leagueLogo.addEventListener('error', () => leagueLogo.remove(), { once: true });
      leagueLine.append(leagueLogo);
    }
    const leagueName = document.createElement('span');
    leagueName.textContent = leagueNames[fixture.league.name] || fixture.league.name;
    const kickoff = document.createElement('time');
    kickoff.dateTime = fixture.matchDate;
    kickoff.textContent = formatKickoff(fixture.matchDate);
    leagueLine.append(leagueName, kickoff);

    const teams = document.createElement('div');
    teams.className = 'simple-teams';
    const home = document.createElement('div');
    home.className = 'team-side';
    home.append(createTeamLogo(fixture.homeTeam));
    const homeName = document.createElement('span');
    homeName.textContent = fixture.homeTeam.name;
    home.append(homeName);
    const versus = document.createElement('strong');
    versus.textContent = 'VS';
    const away = document.createElement('div');
    away.className = 'team-side';
    away.append(createTeamLogo(fixture.awayTeam));
    const awayName = document.createElement('span');
    awayName.textContent = fixture.awayTeam.name;
    away.append(awayName);
    teams.append(home, versus, away);

    const oddsLabel = document.createElement('p');
    oddsLabel.className = 'fixture-odds-label';
    oddsLabel.textContent = `เลือกผล · รอบ ${fixture.round || '-'}`;
    const odds = document.createElement('div');
    odds.className = 'odds';
    const options = [
      { code: '1', outcome: `${fixture.homeTeam.name} ชนะ`, price: fixture.odds.home },
      { code: 'X', outcome: 'เสมอ', price: fixture.odds.draw },
      { code: '2', outcome: `${fixture.awayTeam.name} ชนะ`, price: fixture.odds.away },
    ];
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.fixtureId = fixture.id;
      button.dataset.outcome = option.outcome;
      button.dataset.price = option.price;
      button.setAttribute('aria-label', `${option.outcome} ราคา ${Number(option.price).toFixed(2)}`);
      const code = document.createElement('small');
      code.textContent = option.code;
      button.append(code, document.createTextNode(Number(option.price).toFixed(2)));
      odds.append(button);
    });

    card.append(leagueLine, teams, oddsLabel, odds);
    if (fixture.venue) {
      const venue = document.createElement('p');
      venue.className = 'fixture-venue';
      venue.textContent = fixture.venue;
      card.append(venue);
    }
    matchesGrid.append(card);
  });
};

const loadFixtures = async () => {
  matchesGrid.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/football/fixtures');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'โหลดโปรแกรมแข่งขันไม่สำเร็จ');
    fixtures = data.fixtures || [];
    activeLeagueFilter = 'all';
    fixtureSeason.textContent = `ฤดูกาล ${data.season || '2026-2027'}`;
    fixtureTicker.textContent = fixtures.length
      ? `มี ${fixtures.length} คู่ถัดไปจาก ${new Set(fixtures.map((fixture) => fixture.league.id)).size} ลีก`
      : 'ยังไม่มีโปรแกรมแข่งขันถัดไป';
    renderLeagueFilters();
    renderFixtures();
  } catch (error) {
    matchesGrid.replaceChildren();
    matchesGrid.setAttribute('aria-busy', 'false');
    const state = document.createElement('p');
    state.className = 'fixtures-state';
    state.textContent = error.message || 'เชื่อมต่อข้อมูลโปรแกรมแข่งขันไม่ได้';
    const retry = document.createElement('button');
    retry.className = 'fixture-retry';
    retry.type = 'button';
    retry.textContent = 'ลองโหลดอีกครั้ง';
    retry.onclick = loadFixtures;
    matchesGrid.append(state, retry);
  }
};

const updateWalletControls = (authenticated) => {
  walletBalanceLabel.textContent = `${formatCredits(walletBalance)} เครดิต`;
  walletStatus.textContent = authenticated
    ? (walletBusy ? 'กำลังบันทึกรายการ...' : 'เครดิตทดลอง • ไม่มีเงินจริง')
    : 'เข้าสู่ระบบเพื่อใช้ wallet ทดลอง';
  openTopUpButton.disabled = walletBusy;
  const amount = Number(stake.value);
  placeBetButton.disabled = !selection || walletBusy || !Number.isSafeInteger(amount) || amount < 1;
  placeBetButton.textContent = authenticated ? 'วางเดิมพัน' : 'เข้าสู่ระบบเพื่อวางเดิมพัน';
};

const renderWalletHistory = (data, emptyMessage = 'ยังไม่มีรายการ') => {
  betHistory.replaceChildren();
  walletTransactions.replaceChildren();

  const bets = data.bets || [];
  if (!bets.length) {
    const item = document.createElement('li');
    item.textContent = emptyMessage;
    betHistory.append(item);
  }
  bets.forEach((bet) => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const details = document.createElement('span');
    title.textContent = `${bet.matchName}: ${bet.selection}`;
    details.textContent = `${formatCredits(bet.stake)} เครดิต · @${Number(bet.odds).toFixed(2)} · ${bet.status === 'PENDING' ? 'รอผล' : bet.status}`;
    item.append(title, details);
    betHistory.append(item);
  });

  const transactions = data.transactions || [];
  if (!transactions.length) {
    const item = document.createElement('li');
    item.textContent = emptyMessage;
    walletTransactions.append(item);
  }
  transactions.forEach((transaction) => {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const details = document.createElement('span');
    const isTopUp = transaction.type === 'DEMO_TOP_UP';
    title.textContent = `${isTopUp ? '+' : '-'}${formatCredits(transaction.amount)} เครดิต`;
    details.textContent = isTopUp ? 'เติมเครดิตทดลอง' : (transaction.note || 'วางเดิมพัน');
    item.append(title, details);
    walletTransactions.append(item);
  });
};

const loadWallet = async () => {
  const token = localStorage.getItem('five-poll-token');
  if (!token) return;
  walletStatus.textContent = 'กำลังโหลด wallet...';
  try {
    const response = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'โหลด wallet ไม่สำเร็จ');
    walletBalance = data.balance;
    renderWalletHistory(data);
    updateWalletControls(Boolean(getStoredUser()));
  } catch (error) {
    walletStatus.textContent = error.message || 'โหลด wallet ไม่สำเร็จ';
  }
};

const savedUser = getStoredUser();
if (savedUser?.name && localStorage.getItem('five-poll-token')) setLoginState(savedUser.name);
else updateWalletControls(false);

const restoreSession = async () => {
  const token = localStorage.getItem('five-poll-token');
  if (!token) return;
  try {
    const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Session expired');
    const { user } = await response.json();
    localStorage.setItem('five-poll-user', JSON.stringify(user));
    setLoginState(user.name);
    await loadWallet();
  } catch {
    localStorage.removeItem('five-poll-token');
    localStorage.removeItem('five-poll-user');
    walletBalance = 0;
    setLoginState(null);
    renderWalletHistory({ bets: [], transactions: [] }, 'เข้าสู่ระบบเพื่อดูรายการ');
  }
};
restoreSession();
loadFixtures();

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
    await loadWallet();
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

