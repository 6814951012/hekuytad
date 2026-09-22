const form = document.querySelector("#auth-form");
const shell = document.querySelector(".shell");
const authCard = document.querySelector("#auth-card");
const dashboard = document.querySelector("#dashboard");
const message = document.querySelector("#message");
const submit = document.querySelector("#submit-button");
let mode = "login";

const setMessage = (text, success = false) => { message.textContent = text; message.classList.toggle("success", success); };
const setMode = (nextMode) => {
  mode = nextMode; const registering = mode === "register";
  document.querySelectorAll(".register-only").forEach((el) => el.classList.toggle("hidden", !registering));
  document.querySelector("#form-title").textContent = registering ? "Create your account" : "Sign in to your account";
  document.querySelector("#form-subtitle").textContent = registering ? "Create your account and follow the action." : "Enter your details to follow the action.";
  submit.innerHTML = `${registering ? "Create account" : "Sign in"} <span>→</span>`;
  document.querySelector("#switch-copy").innerHTML = registering ? 'Already have an account? <button id="switch-mode" type="button">Sign in</button>' : 'New to BallWanne? <button id="switch-mode" type="button">Create an account</button>';
  document.querySelector("#password").autocomplete = registering ? "new-password" : "current-password"; setMessage("");
  document.querySelector("#switch-mode").addEventListener("click", () => setMode(registering ? "login" : "register"));
};
const formatDate = (value) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const teamBadge = (name) => `<div class="track-art">${name.slice(0, 1).toUpperCase()}</div>`;
const loadMatches = async () => {
  const list = document.querySelector("#match-list");
  try {
    const response = await fetch("/api/football/matches");
    if (!response.ok) throw new Error();
    const matches = await response.json();
    document.querySelector("#match-count").textContent = `${matches.length} match${matches.length === 1 ? "" : "es"}`;
    if (!matches.length) { list.innerHTML = '<div class="empty-state"><span>⚽</span><h4>No fixtures yet</h4><p>Fixtures will appear here when they are added.</p></div>'; return; }
    list.innerHTML = matches.slice(0, 8).map((match) => { const finished = match.status === "FINISHED"; const score = finished ? `${match.score.home} – ${match.score.away}` : formatDate(match.matchDate); return `<article class="match"><span class="match-league">${match.leagueId?.name || "Football"}</span><div class="team home"><strong>${match.homeTeam.name}</strong>${teamBadge(match.homeTeam.name)}</div><div class="match-score ${match.status === "LIVE" ? "live" : ""}">${score}<small>${match.status === "LIVE" ? "LIVE" : match.status}</small></div><div class="team away">${teamBadge(match.awayTeam.name)}<strong>${match.awayTeam.name}</strong></div></article>`; }).join("");
  } catch { list.innerHTML = '<div class="empty-state"><span>!</span><h4>Couldn’t load fixtures</h4><p>Please ensure the API server is running.</p></div>'; }
};
const loadLeagues = async () => { try { const response = await fetch("/api/football/leagues"); if (!response.ok) throw new Error(); const leagues = await response.json(); document.querySelector("#league-select").insertAdjacentHTML("beforeend", leagues.map((league) => `<option value="${league._id}">${league.name}</option>`).join("")); } catch { /* Fixtures can still be used without league data. */ } };
const loadStanding = async (leagueId) => { const list = document.querySelector("#standing-list"); if (!leagueId) return; list.innerHTML = '<p class="loading">Loading table…</p>'; try { const response = await fetch(`/api/football/standings/${leagueId}`); if (!response.ok) throw new Error(); const data = await response.json(); list.innerHTML = `<div class="standing-head"><span>#</span><span>Team</span><span>P</span><span>GD</span><strong>Pts</strong></div>${data.table.map((team) => `<div class="standing-row"><span>${team.position}</span><span>${team.teamName}</span><span>${team.played}</span><span>${team.goalDifference}</span><strong>${team.points}</strong></div>`).join("")}`; } catch { list.innerHTML = '<div class="empty-state"><span>≡</span><h4>Table not available</h4><p>No standings have been added for this league yet.</p></div>'; } };
const showUser = (user) => { shell.classList.add("hidden"); dashboard.classList.remove("hidden"); document.querySelector("#welcome-name").textContent = `Welcome back, ${user.name}.`; document.querySelector("#sidebar-name").textContent = user.name; document.querySelector("#sidebar-email").textContent = user.email; document.querySelector("#avatar").textContent = user.name.slice(0, 1).toUpperCase(); window.scrollTo(0, 0); loadMatches(); loadLeagues(); };

document.querySelector("#switch-mode").addEventListener("click", () => setMode("register"));
document.querySelector(".show-password").addEventListener("click", (event) => { const input = document.querySelector("#password"); const hidden = input.type === "password"; input.type = hidden ? "text" : "password"; event.currentTarget.textContent = hidden ? "Hide" : "Show"; });
form.addEventListener("submit", async (event) => {
  event.preventDefault(); setMessage("");
  const data = Object.fromEntries(new FormData(form));
  if (mode === "register" && !data.name.trim()) return setMessage("Please enter your name");
  submit.disabled = true; submit.textContent = "Please wait…";
  try {
    const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Something went wrong");
    localStorage.setItem("portable-token", result.token); showUser(result.user);
  } catch (error) { setMessage(error.message); }
  finally { submit.disabled = false; submit.innerHTML = `${mode === "register" ? "Create account" : "Sign in"} <span>→</span>`; }
});
document.querySelector("#logout").addEventListener("click", () => { localStorage.removeItem("portable-token"); dashboard.classList.add("hidden"); shell.classList.remove("hidden"); authCard.classList.remove("hidden"); form.reset(); setMode("login"); window.scrollTo(0, 0); });
document.querySelector("#league-select").addEventListener("change", (event) => loadStanding(event.target.value));
(async () => { const token = localStorage.getItem("portable-token"); if (!token) return; try { const res = await fetch("/api/auth/me", { headers:{ Authorization:`Bearer ${token}` } }); const data = await res.json(); if (!res.ok) throw new Error(); showUser(data.user); } catch { localStorage.removeItem("portable-token"); } })();
