// Go Fishing With Samuel: pick a spot, cast, set the hook, then fight the fish
// by keeping line tension in the safe zone until it's reeled in.
(() => {
  const RARITY = {
    junk:      { label: "Junk",      color: "#8a8a8a", mult: 0 },
    common:    { label: "Common",    color: "#7bc96f", mult: 1 },
    uncommon:  { label: "Uncommon",  color: "#4aa8ff", mult: 2 },
    rare:      { label: "Rare",      color: "#b06cff", mult: 4 },
    epic:      { label: "Epic",      color: "#ff8a3d", mult: 7 },
    legendary: { label: "Legendary", color: "#ffd23f", mult: 12 },
  };

  // power: how hard the fish pulls (1 = sleepy, 10 = freight train).
  // jumps: jumping fish throw sudden slack/spikes; reeling mid-jump is risky.
  // weight: chance this fish bites, relative to others at the same spot.
  const SPOTS = {
    canal: {
      name: "Canal", emoji: "🏞️", unlock: 0, water: ["#7cc0a8", "#2f6b52"],
      fish: [
        { id: "bluegill",   name: "Bluegill",            emoji: "🐟", rarity: "common",    lb: [0.3, 1.2],  power: 1, weight: 30 },
        { id: "largemouth", name: "Largemouth Bass",     emoji: "🐟", rarity: "common",    lb: [1, 6],      power: 3, weight: 26 },
        { id: "peacock",    name: "Peacock Bass",        emoji: "🐠", rarity: "uncommon",  lb: [1.5, 7],    power: 4, weight: 18 },
        { id: "snakehead",  name: "Bullseye Snakehead",  emoji: "🐍", rarity: "uncommon",  lb: [2, 10],     power: 5, weight: 10 },
        { id: "arowana",    name: "Silver Arowana",      emoji: "🐉", rarity: "rare",      lb: [3, 9],      power: 5, weight: 12, jumps: true },
        { id: "boot",       name: "Old Boot",            emoji: "👢", rarity: "junk",      lb: [1, 1],      power: 1, weight: 10 },
      ],
    },
    lake: {
      name: "Lake", emoji: "🛶", unlock: 25, water: ["#8fb8d8", "#2c4f73"],
      fish: [
        { id: "crappie",    name: "Crappie",             emoji: "🐟", rarity: "common",    lb: [0.5, 2],    power: 2, weight: 28 },
        { id: "smallmouth", name: "Smallmouth Bass",     emoji: "🐟", rarity: "common",    lb: [1, 6],      power: 4, weight: 26, jumps: true },
        { id: "walleye",    name: "Walleye",             emoji: "🐟", rarity: "uncommon",  lb: [2, 9],      power: 4, weight: 16 },
        { id: "pike",       name: "Northern Pike",       emoji: "🐊", rarity: "rare",      lb: [5, 20],     power: 6, weight: 14 },
        { id: "musky",      name: "Muskellunge",         emoji: "🐊", rarity: "epic",      lb: [15, 40],    power: 8, weight: 10 },
        { id: "tire",       name: "Tire",                emoji: "🛞", rarity: "junk",      lb: [8, 8],      power: 2, weight: 8 },
      ],
    },
    flats: {
      name: "Flats", emoji: "🏝️", unlock: 80, water: ["#9ee6e0", "#178a86"],
      fish: [
        { id: "redfish",    name: "Redfish",             emoji: "🐟", rarity: "common",    lb: [3, 15],     power: 5, weight: 24 },
        { id: "snook",      name: "Snook",               emoji: "🐟", rarity: "uncommon",  lb: [4, 25],     power: 6, weight: 22 },
        { id: "bonnethead", name: "Bonnethead Shark",    emoji: "🦈", rarity: "uncommon",  lb: [5, 20],     power: 6, weight: 16 },
        { id: "bonefish",   name: "Bonefish",            emoji: "🐟", rarity: "rare",      lb: [3, 12],     power: 7, weight: 14 },
        { id: "permit",     name: "Permit",              emoji: "🐠", rarity: "rare",      lb: [10, 35],    power: 7, weight: 12 },
        { id: "tarpon",     name: "Tarpon",              emoji: "🐟", rarity: "epic",      lb: [30, 150],   power: 9, weight: 16, jumps: true },
      ],
    },
    offshore: {
      name: "Offshore", emoji: "🌊", unlock: 250, water: ["#4f8fd6", "#0b2a5c"],
      fish: [
        { id: "mahi",       name: "Mahi-Mahi",           emoji: "🐠", rarity: "common",    lb: [8, 40],     power: 6, weight: 26, jumps: true },
        { id: "tuna",       name: "Blackfin Tuna",       emoji: "🐟", rarity: "uncommon",  lb: [10, 40],    power: 7, weight: 20 },
        { id: "blacktip",   name: "Blacktip Shark",      emoji: "🦈", rarity: "uncommon",  lb: [30, 120],   power: 7, weight: 18 },
        { id: "sailfish",   name: "Sailfish",            emoji: "🐟", rarity: "epic",      lb: [40, 100],   power: 8, weight: 16, jumps: true },
        { id: "goliath",    name: "Goliath Grouper",     emoji: "🐡", rarity: "legendary", lb: [150, 500],  power: 9, weight: 12 },
        { id: "hammerhead", name: "Great Hammerhead",    emoji: "🦈", rarity: "legendary", lb: [200, 600],  power: 9, weight: 10 },
      ],
    },
  };

  // WHY: thresholds sized from play-testing (~6 pts per canal fish, ~10s per fight) so the
  // Lake opens in a few minutes, sharks/tarpon within ~10 minutes, and "Samuel Level" stays a real goal
  const RANKS = [
    { pts: 0,    title: "Bait Boy" },
    { pts: 25,   title: "Dock Rookie" },
    { pts: 80,   title: "Canal Captain" },
    { pts: 250,  title: "Flats Legend" },
    { pts: 800,  title: "Offshore Beast" },
    { pts: 2500, title: "Samuel Level" },
  ];

  // ---------- tuning ----------
  // WHY: 1.5-4.5s wait builds suspense without making people give up
  const MIN_WAIT_MS = 1500;
  const MAX_EXTRA_WAIT_MS = 3000;
  // WHY: hooking is meant to be easy for EVERY fish; the challenge lives in the fight, not the tap.
  // 2s covers phone tap latency and a glance away from the screen.
  const HOOKSET_WINDOW_MS = 2000;
  // WHY: the safe tension band; below it the fish shakes loose, above it the line snaps.
  // Weak fish get the wide 25-80 band so a new player learns by feel within a few casts;
  // the strongest fish shrink it toward 37-63 so only precise timing lands them.
  const SAFE_LOW_EASY = 25, SAFE_HIGH_EASY = 80;
  const SAFE_LOW_HARD = 37, SAFE_HIGH_HARD = 63;
  const TENSION_UP_PER_S = 55;    // holding Reel raises tension about one safe band per second
  const TENSION_DOWN_PER_S = 40;  // letting go relaxes slightly slower than reeling, so taps feel smooth
  const REEL_PROGRESS_PER_S = 32; // play-tested: small fish land in ~5-7s, monsters in ~20s
  const SLACK_LIMIT_EASY_S = 1.6; // WHY: this long below the safe band and the hook pulls free; short enough to punish ignoring the fish
  const SLACK_LIMIT_HARD_S = 0.8; // strong fish throw the hook in half the time, so you can't idle on them

  // WHY: power 1-10 mapped to 0-1 with a 1.5 exponent so the middle of the roster stays friendly
  // (largemouth ~0.1) while tarpon, sharks and legendaries (power 8-10) ramp up steeply (0.7-1.0).
  function difficulty(power) { return ((power - 1) / 9) ** 1.25; }
  const lerp = (a, b, d) => a + (b - a) * d;
  const CALM_MESSAGE = "🎣 It's tiring! Reel and keep the tension in the green.";
  const WARN_S = 0.55;            // WHY: just over typical human reaction time (~0.25s) plus finger travel, so a focused player can beat it but a distracted one can't
  const FATIGUE_S = 30;           // WHY: fish tire; reeling gains grow +100% per 30s so no fight can stalemate forever, but the strongest still lose you the line well before that
  const SAVE_KEY = "samuel-fishing-v1";

  // ---------- state ----------
  const save = loadSave();
  let spotId = "canal";
  let phase = "idle"; // idle | waiting | bite | fight
  let timer = null;
  let fight = null;
  let holding = false;

  // ---------- elements ----------
  const $ = (id) => document.getElementById(id);
  const pond = $("pond");
  const castBtn = $("castBtn");
  const reelBtn = $("reelBtn");
  const messageEl = $("message");
  const catchEl = $("catch");
  const spotsEl = $("spots");
  const meters = $("meters");
  const tensionFill = $("tensionFill");
  const progressFill = $("progressFill");
  const fishPower = $("fishPower");
  const logEl = $("fishLog");

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked: play without saving */ }
    return { points: 0, caught: 0, best: null, log: {} };
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ }
  }

  function rankFor(pts) {
    let r = RANKS[0];
    for (const x of RANKS) if (pts >= x.pts) r = x;
    const next = RANKS[RANKS.indexOf(r) + 1];
    return { ...r, next };
  }

  function setMessage(text) { messageEl.textContent = text; }

  // ---------- spots ----------
  function renderSpots() {
    spotsEl.innerHTML = "";
    for (const [id, spot] of Object.entries(SPOTS)) {
      const b = document.createElement("button");
      const locked = save.points < spot.unlock;
      b.className = "spot" + (id === spotId ? " active" : "");
      b.disabled = locked || phase !== "idle";
      b.innerHTML = `<span>${spot.emoji}</span>${spot.name}${locked ? `<small>🔒 ${spot.unlock} pts</small>` : ""}`;
      b.addEventListener("click", () => { spotId = id; applySpot(); renderSpots(); });
      spotsEl.appendChild(b);
    }
  }
  function applySpot() {
    const [top, bottom] = SPOTS[spotId].water;
    pond.style.setProperty("--water-top", top);
    pond.style.setProperty("--water-bottom", bottom);
    pond.dataset.spot = spotId;
    setMessage(`${SPOTS[spotId].emoji} ${SPOTS[spotId].name}: ${spotHint(spotId)}`);
  }
  function spotHint(id) {
    return {
      canal: "bass, peacocks, and maybe an arowana. Hit Cast.",
      lake: "smallmouth, pike, and the mighty musky. Hit Cast.",
      flats: "snook, sharks, and silver kings. TARPON JUMP, so ease off when they do!",
      offshore: "sailfish, sharks, and giant grouper. Bring your arms.",
    }[id];
  }

  // ---------- scoreboard + log ----------
  function renderStats() {
    const r = rankFor(save.points);
    $("points").textContent = save.points;
    $("caughtCount").textContent = save.caught;
    $("bestCatch").textContent = save.best ? `${save.best.lb} lb` : "None yet";
    $("bestName").textContent = save.best ? save.best.name : "Biggest catch";
    $("rank").textContent = r.title;
    $("rankNext").textContent = r.next ? `${r.next.pts - save.points} pts to ${r.next.title}` : "Max rank. You ARE Samuel.";
    const species = Object.values(SPOTS).flatMap((s) => s.fish).filter((f) => f.rarity !== "junk");
    const found = species.filter((f) => save.log[f.id]).length;
    $("logCount").textContent = `${found} / ${species.length} species`;
  }

  function renderLog() {
    logEl.innerHTML = "";
    for (const spot of Object.values(SPOTS)) {
      for (const f of spot.fish) {
        if (f.rarity === "junk") continue;
        const entry = save.log[f.id];
        const card = document.createElement("div");
        card.className = "log-card" + (entry ? "" : " unknown");
        card.style.setProperty("--rarity", RARITY[f.rarity].color);
        card.innerHTML = entry
          ? `<div class="log-emoji">${f.emoji}</div><b>${f.name}</b><span>${RARITY[f.rarity].label} · ${spot.name}</span><span>Best ${entry.best} lb · ×${entry.count}</span>`
          : `<div class="log-emoji">❓</div><b>???</b><span>${RARITY[f.rarity].label} · ${spot.name}</span>`;
        logEl.appendChild(card);
      }
    }
  }

  // ---------- phases ----------
  function setPhase(next) {
    phase = next;
    pond.classList.toggle("casted", next !== "idle");
    pond.classList.toggle("bite", next === "bite");
    pond.classList.toggle("fighting", next === "fight");
    meters.hidden = next !== "fight";
    if (next !== "fight") meters.classList.remove("warn");
    castBtn.disabled = next !== "idle";
    reelBtn.disabled = next === "idle";
    reelBtn.textContent = next === "fight" ? "🌀 HOLD to reel" : "🪝 Set the hook!";
    renderSpots();
  }

  function pickFish() {
    const list = SPOTS[spotId].fish;
    let roll = Math.random() * list.reduce((t, f) => t + f.weight, 0);
    for (const f of list) { roll -= f.weight; if (roll <= 0) return f; }
    return list[0];
  }

  function cast() {
    pond.classList.remove("caught");
    setPhase("waiting");
    setMessage("Line's in the water... wait for the bite...");
    timer = setTimeout(() => {
      setPhase("bite");
      setMessage("🚨 BITE! SET THE HOOK! 🚨");
      timer = setTimeout(() => {
        setPhase("idle");
        setMessage("Too slow, it spit the bait. Samuel would've had that one.");
      }, HOOKSET_WINDOW_MS);
    }, MIN_WAIT_MS + Math.random() * MAX_EXTRA_WAIT_MS);
  }

  function hookSet() {
    clearTimeout(timer);
    if (phase === "waiting") {
      setPhase("idle");
      setMessage("Too early! You spooked it. Patience, like Samuel.");
      return;
    }
    const fish = pickFish();
    const [lo, hi] = fish.lb;
    // WHY: square the roll so big fish are rarer than small ones of the same species
    const lb = Math.round((lo + (hi - lo) * Math.random() ** 2) * 10) / 10;
    const d = difficulty(fish.power);
    // WHY: d**0.7 narrows the band earlier than the other difficulty knobs so mid-roster fish (power 6-8)
    // already demand accuracy; play-testing showed a cliff between power 8 and 9 with a plain linear shrink
    const bandD = d ** 0.7;
    const low = lerp(SAFE_LOW_EASY, SAFE_LOW_HARD, bandD);
    const high = lerp(SAFE_HIGH_EASY, SAFE_HIGH_HARD, bandD);
    meters.style.setProperty("--safe-low", low + "%");
    meters.style.setProperty("--safe-high", high + "%");
    fight = {
      fish, lb, d, low, high,
      slackLimit: lerp(SLACK_LIMIT_EASY_S, SLACK_LIMIT_HARD_S, d),
      tension: (low + high) / 2,
      progress: 25,
      slack: 0,
      surge: 0,      // seconds left in a fish run
      jump: 0,       // seconds left in a jump
      nextEvent: 1.5 + Math.random(), // WHY: a beat of calm after the hook-up so even a monster gives you time to get the tension in the band
      pending: null,
      age: 0,
      last: performance.now(),
    };
    fishPower.textContent = fish.rarity === "legendary" ? "💀 LEGENDARY on the line!" : fish.power >= 8 ? "🔥 MONSTER on the line!" : fish.power >= 5 ? "💪 Something strong..." : "🎣 Fish on!";
    setPhase("fight");
    setMessage("Fish on! Hold Reel to bring it in. Keep the tension in the green.");
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (phase !== "fight" || !fight) return;
    const dt = Math.min(0.05, (now - fight.last) / 1000); // WHY: clamp so a backgrounded tab can't jump the fight forward
    fight.last = now;
    const f = fight.fish;
    const pull = f.power / 10;
    const d = fight.d;

    // random fish behavior: runs (pull drag) and jumps
    fight.nextEvent -= dt;
    // WHY: every run/jump is announced WARN_S early. Reaction time alone (~250ms) can't dodge a hard fish;
    // the warning turns it into a timing skill (ease off as it lands) instead of a coin flip.
    if (!fight.pending && fight.nextEvent <= WARN_S) {
      fight.pending = f.jumps && Math.random() < 0.45 + 0.35 * d ? "jump" : "run";
      meters.classList.add("warn");
      setMessage(fight.pending === "jump" ? `⚠️ The ${f.name} is about to JUMP! Get ready to let go!` : `⚠️ The ${f.name} is about to run! Ease off!`);
    }
    if (fight.nextEvent <= 0) {
      meters.classList.remove("warn");
      if (fight.pending === "jump") {
        fight.jump = 0.9 + 0.5 * d;
        pond.classList.add("jumping");
        setMessage(`🐟 ${f.name.toUpperCase()} JUMPS! Let go of reel!`);
      } else {
        fight.surge = 0.6 + pull * 0.9;
        setMessage(`💨 It's running! Ease off or it'll snap!`);
      }
      fight.pending = null;
      // WHY: same rhythm for every fish; strength shows up as harder pulls, faster line loss and less room, not constant chaos
      fight.nextEvent = 2.0 + Math.random() * 2.2;
    }

    let dTension = holding ? TENSION_UP_PER_S : -TENSION_DOWN_PER_S;
    if (fight.surge > 0) {
      fight.surge -= dt;
      dTension += lerp(15, 44, d); // WHY: capped just above TENSION_DOWN_PER_S (40) so letting go nearly always holds the line; precision, not luck, decides it fight.progress -= 6 * pull * dt;
      if (fight.surge <= 0) setMessage(CALM_MESSAGE);
    }
    if (fight.jump > 0) {
      fight.jump -= dt;
      fight.progress -= 6 * pull * dt; // WHY: an airborne fish takes line just like a run, so jumpers aren't a free pass
      // WHY: reeling during a jump is how real tarpon throw hooks / snap line, so it's punished hard
      if (holding) dTension += 50;
      if (fight.jump <= 0) { pond.classList.remove("jumping"); setMessage(CALM_MESSAGE); }
    }
    fight.tension = Math.max(0, fight.tension + dTension * dt);
    // WHY: during a jump the fish is airborne and slack is the correct response, so letting go must never be a trap:
    // keep tension just under the band so one short pull gets you back in after it lands
    if (fight.jump > 0) fight.tension = Math.max(fight.tension, fight.low - 8);

    const inZone = fight.tension >= fight.low && fight.tension <= fight.high;
    // strong fish also tire slower (+2.2 divisor at max difficulty) and take line back faster when you let off
    fight.age += dt;
    if (holding && inZone) fight.progress += (REEL_PROGRESS_PER_S / (0.6 + pull * 0.8 + 2.2 * d)) * (1 + fight.age / FATIGUE_S) * dt;
    if (!holding) fight.progress -= (2.5 + 3 * d) * pull * dt;
    fight.slack = fight.tension < fight.low && fight.jump <= 0 ? fight.slack + dt : 0;

    tensionFill.style.width = Math.min(100, fight.tension) + "%";
    tensionFill.classList.toggle("danger", !inZone);
    progressFill.style.width = Math.max(0, Math.min(100, fight.progress)) + "%";

    if (fight.tension >= 100) return endFight(false, `💥 SNAP! The ${f.name} was too strong and the line broke.`);
    if (fight.slack >= fight.slackLimit) return endFight(false, `🪝 Slack line! The ${f.name} shook the hook. Keep some tension on it.`);
    if (fight.progress <= 0) return endFight(false, `🌊 It took all your line and got away. The ${f.name} wins this round.`);
    if (fight.progress >= 100) return endFight(true);
    requestAnimationFrame(tick);
  }

  function endFight(won, failMessage) {
    const { fish, lb } = fight;
    fight = null;
    holding = false;
    pond.classList.remove("jumping");
    setPhase("idle");
    if (!won) { setMessage(failMessage); return; }

    catchEl.textContent = fish.emoji;
    pond.classList.remove("caught");
    void pond.offsetWidth; // WHY: force reflow so the pop animation replays on back-to-back catches
    pond.classList.add("caught");

    if (fish.rarity === "junk") {
      setMessage(`You reeled in... ${fish.name.toLowerCase() === "tire" ? "a tire" : "an old boot"}. Even Samuel has off days. 😅`);
      return;
    }
    const pts = Math.max(1, Math.round(lb * RARITY[fish.rarity].mult));
    const before = rankFor(save.points).title;
    const isNew = !save.log[fish.id];
    save.points += pts;
    save.caught++;
    const entry = save.log[fish.id] || { count: 0, best: 0 };
    entry.count++;
    entry.best = Math.max(entry.best, lb);
    save.log[fish.id] = entry;
    if (!save.best || lb > save.best.lb) save.best = { lb, name: fish.name };
    persist();

    const after = rankFor(save.points).title;
    let msg = `${isNew ? "🆕 NEW SPECIES! " : ""}${RARITY[fish.rarity].label} ${fish.name}, ${lb} lb! +${pts} pts`;
    if (after !== before) msg += ` 🎖️ Rank up: ${after}!`;
    const unlocked = Object.values(SPOTS).find((s) => s.unlock > save.points - pts && s.unlock <= save.points);
    if (unlocked) msg += ` ${unlocked.emoji} ${unlocked.name} unlocked!`;
    setMessage(msg);
    if (["epic", "legendary"].includes(fish.rarity) && window.rainFish) window.rainFish();
    renderStats();
    renderLog();
    renderSpots();
  }

  // ---------- input ----------
  castBtn.addEventListener("click", cast);
  // WHY: pointerdown (not click) so the hook set fires the instant a finger lands
  reelBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (phase === "waiting" || phase === "bite") return hookSet();
    if (phase === "fight") holding = true;
  });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) reelBtn.addEventListener(ev, () => { holding = false; });
  reelBtn.addEventListener("contextmenu", (e) => e.preventDefault());
  // keyboard: Space/Enter on the reel button behaves like holding it
  reelBtn.addEventListener("keydown", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat) return;
    if (phase === "waiting" || phase === "bite") return hookSet();
    if (phase === "fight") holding = true;
  });
  reelBtn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") holding = false; });

  $("resetBtn").addEventListener("click", () => {
    if (phase !== "idle" || !confirm("Reset all your points, ranks, and fish log?")) return;
    Object.assign(save, { points: 0, caught: 0, best: null, log: {} });
    persist();
    spotId = "canal";
    applySpot(); renderStats(); renderLog(); renderSpots();
  });

  applySpot();
  renderStats();
  renderLog();
  setPhase("idle");
})();
