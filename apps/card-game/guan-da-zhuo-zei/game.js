/* global SoundManager, GUAN_DA_AI, RoomUI */

const CARD_NAMES = [
  "布告",
  "法官",
  "指挥官",
  "警长",
  "警察1",
  "警察2",
  "强盗",
  "小偷",
  "土匪",
  "花样官",
  "数量官",
  "加减官",
  "轻重官",
  "皇帝",
  "皇后",
  "打手",
];
const CRIMINALS = ["强盗", "小偷", "土匪"];
const OFFICERS = ["指挥官", "警长", "警察1", "警察2"];
const PENALTY_STYLES = ["做鬼脸", "原地转圈", "学猫叫", "念绕口令"];
const SEVERITIES = [
  { value: "light", label: "轻轻地" },
  { value: "normal", label: "认真地" },
  { value: "heavy", label: "夸张地" },
];
const AI_THINKING_DELAY_MS = 1800;

const PHASES = [
  "wanted",
  "officer",
  "suspect",
  "style",
  "count",
  "adjust",
  "severity",
  "emperor",
  "empress",
  "result",
];

function getAiHelpers() {
  if (typeof GUAN_DA_AI !== "undefined") return GUAN_DA_AI;
  if (typeof require !== "undefined") return require("./ai.js");
  return null;
}

function getPlayerDefinitions(mode) {
  if (mode === "pvp") {
    return ["玩家1", "玩家2", "玩家3", "玩家4"].map((name, id) => ({
      id,
      name,
      isHuman: true,
    }));
  }
  if (mode === "online") {
    return [
      { id: 0, name: "玩家1", isHuman: true },
      { id: 1, name: "玩家2", isHuman: true },
      { id: 2, name: "电脑1", isHuman: false },
      { id: 3, name: "电脑2", isHuman: false },
    ];
  }
  return [
    { id: 0, name: "你", isHuman: true },
    { id: 1, name: "小明", isHuman: false },
    { id: 2, name: "小红", isHuman: false },
    { id: 3, name: "小军", isHuman: false },
  ];
}

function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(rng() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function dealCards(rng = Math.random, mode = "pve") {
  const deck = shuffle(CARD_NAMES, rng);
  return getPlayerDefinitions(mode).map((player) => ({
    ...player,
    cards: deck.slice(player.id * 4, player.id * 4 + 4),
  }));
}

function findCardHolder(players, cardName) {
  return players.find((player) => player.cards.includes(cardName))?.id ?? -1;
}

function determinePenaltyTarget(players, wanted, officerName, suspectId) {
  const criminalId = findCardHolder(players, wanted);
  const officerId = findCardHolder(players, officerName);
  return {
    criminalId,
    officerId,
    caught: suspectId === criminalId,
    targetId: suspectId === criminalId ? criminalId : officerId,
  };
}

function calculatePenaltyCount(baseCount, adjustment) {
  return Math.max(1, baseCount + adjustment);
}

function resolveRoyalDecision(emperorVote, empressVote, rng = Math.random) {
  if (emperorVote === empressVote) return { execute: emperorVote, winner: null };
  const winner = rng() < 0.5 ? "皇帝" : "皇后";
  return { execute: winner === "皇帝" ? emperorVote : empressVote, winner };
}

function formatPenaltyResult(players, round) {
  const target = players[round.target.targetId].name;
  if (!round.royal.execute) return `皇帝与皇后最终决定免除对${target}的处罚。`;
  const executor = players[findCardHolder(players, "打手")].name;
  const count = calculatePenaltyCount(round.baseCount, round.adjustment);
  const severity = SEVERITIES.find((item) => item.value === round.severity)?.label ?? "认真地";
  return `判罚结果：${executor}监督${target}${severity}${round.style}${count}次。`;
}

function createGameState(mode = "pve", rng = Math.random) {
  return {
    mode,
    players: dealCards(rng, mode),
    phaseIndex: 0,
    round: {},
    log: [],
    finished: false,
  };
}

function getPhaseActor(state, phase) {
  const cardByPhase = {
    wanted: "布告",
    officer: "法官",
    suspect: state.round.officer,
    style: "花样官",
    count: "数量官",
    adjust: "加减官",
    severity: "轻重官",
    emperor: "皇帝",
    empress: "皇后",
  };
  const card = cardByPhase[phase];
  return card ? findCardHolder(state.players, card) : -1;
}

function getPhaseChoices(state, phase) {
  if (phase === "wanted") return CRIMINALS.map((value) => ({ value, label: `通缉${value}` }));
  if (phase === "officer") return OFFICERS.map((value) => ({ value, label: `派出${value}` }));
  if (phase === "suspect") {
    return state.players.map((player) => ({ value: player.id, label: player.name }));
  }
  if (phase === "style") return PENALTY_STYLES.map((value) => ({ value, label: value }));
  if (phase === "count") return [1, 2, 3, 4, 5].map((value) => ({ value, label: `${value}次` }));
  if (phase === "adjust") {
    return [-2, -1, 0, 1, 2].map((value) => ({
      value,
      label: value === 0 ? "不加不减" : `${value > 0 ? "+" : ""}${value}次`,
    }));
  }
  if (phase === "severity") return SEVERITIES.map(({ value, label }) => ({ value, label }));
  if (phase === "emperor" || phase === "empress") {
    return [
      { value: true, label: "执行处罚" },
      { value: false, label: "免除处罚" },
    ];
  }
  return [];
}

function isValidChoice(state, phase, value) {
  return getPhaseChoices(state, phase).some((choice) => choice.value === value);
}

function shouldRevealPlayer(state, playerId, viewerId = null, revealAll = false) {
  if (revealAll) return true;
  if (state.mode === "pve") return playerId === 0;
  return playerId === viewerId;
}

function getPrompt(state, phase, actorId) {
  const actor = state.players[actorId]?.name;
  const prompts = {
    wanted: `${actor}拿到布告牌，请选择本轮通缉对象。`,
    officer: `${actor}作为法官，请指定一名抓捕者。`,
    suspect: `${actor}拿到${state.round.officer}，请判断谁持有${state.round.wanted}。`,
    style: `${actor}作为花样官，请决定处罚花样。`,
    count: `${actor}作为数量官，请决定基础次数。`,
    adjust: `${actor}作为加减官，请调整处罚次数。`,
    severity: `${actor}作为轻重官，请决定执行程度。`,
    emperor: `${actor}作为皇帝，请决定是否执行处罚。`,
    empress: `${actor}作为皇后，请决定是否执行处罚。`,
  };
  return prompts[phase] ?? "";
}

function applyChoice(state, phase, value, rng = Math.random) {
  const actorId = getPhaseActor(state, phase);
  const actorName = state.players[actorId]?.name;
  if (phase === "wanted") {
    state.round.wanted = value;
    state.log.push(`${actorName}张贴布告：通缉${value}。`);
  } else if (phase === "officer") {
    state.round.officer = value;
    state.log.push(`${actorName}指定${value}负责抓捕。`);
  } else if (phase === "suspect") {
    state.round.suspectId = Number(value);
    state.round.target = determinePenaltyTarget(
      state.players,
      state.round.wanted,
      state.round.officer,
      Number(value)
    );
    const suspect = state.players[Number(value)].name;
    state.log.push(
      `${actorName}指认${suspect}持有${state.round.wanted}：${state.round.target.caught ? "抓捕成功" : "抓错了"}。`
    );
  } else if (phase === "style") {
    state.round.style = value;
    state.log.push(`花样官决定处罚方式：${value}。`);
  } else if (phase === "count") {
    state.round.baseCount = Number(value);
    state.log.push(`数量官决定基础次数：${value}次。`);
  } else if (phase === "adjust") {
    state.round.adjustment = Number(value);
    state.log.push(`加减官调整${Number(value) >= 0 ? "+" : ""}${value}次。`);
  } else if (phase === "severity") {
    state.round.severity = value;
    state.log.push(`轻重官决定：${SEVERITIES.find((item) => item.value === value).label}执行。`);
  } else if (phase === "emperor") {
    state.round.emperorVote = value;
    state.log.push(`皇帝决定：${value ? "执行处罚" : "免除处罚"}。`);
  } else if (phase === "empress") {
    state.round.empressVote = value;
    state.log.push(`皇后决定：${value ? "执行处罚" : "免除处罚"}。`);
    state.round.royal = resolveRoyalDecision(state.round.emperorVote, value, rng);
    if (state.round.royal.winner) {
      state.log.push(`意见不同，猜拳后${state.round.royal.winner}胜出。`);
    }
  }
}

function chooseAiValue(state, phase, actorId, rng = Math.random) {
  const ai = getAiHelpers();
  if (phase === "wanted") return ai.chooseWanted(CRIMINALS, rng);
  if (phase === "officer") return ai.chooseOfficer(OFFICERS, rng);
  if (phase === "suspect") return ai.chooseSuspect(state.players, actorId, state.round.wanted, rng);
  return ai.pickRandom(getPhaseChoices(state, phase), rng).value;
}

const GAME_API = {
  CARD_NAMES,
  CRIMINALS,
  OFFICERS,
  PHASES,
  dealCards,
  findCardHolder,
  determinePenaltyTarget,
  calculatePenaltyCount,
  resolveRoyalDecision,
  formatPenaltyResult,
  createGameState,
  getPhaseActor,
  getPhaseChoices,
  isValidChoice,
  shouldRevealPlayer,
  applyChoice,
  chooseAiValue,
};

if (typeof module !== "undefined" && module.exports) module.exports = GAME_API;

if (typeof document !== "undefined") {
  let gameState = null;
  let phaseTimer = null;
  let localViewerId = null;
  let activePlayerId = null;
  let onlinePlayerId = null;
  let onlineRole = null;
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;

  const modeSelection = document.getElementById("mode-selection");
  const gameArea = document.getElementById("game-area");
  const playersElement = document.getElementById("players");
  const phaseElement = document.getElementById("phase-name");
  const promptElement = document.getElementById("prompt-text");
  const actionsElement = document.getElementById("action-buttons");
  const logElement = document.getElementById("round-log");
  const resultElement = document.getElementById("result-panel");
  const modeLabelElement = document.getElementById("mode-label");

  function getModeLabel(mode) {
    return { pvp: "本地四人", pve: "人机对战", online: "联网对战" }[mode] ?? "四人游戏";
  }

  function renderPlayers(revealAll = false) {
    if (!gameState) {
      playersElement.innerHTML = "";
      return;
    }
    const viewerId = gameState.mode === "online" ? onlinePlayerId : localViewerId;
    playersElement.innerHTML = gameState.players
      .map((player) => {
        const visible = shouldRevealPlayer(gameState, player.id, viewerId, revealAll);
        const cards = player.cards
          .map((card) => {
            if (!visible) return '<div class="role-card card-back"><span>?</span></div>';
            return `<div class="role-card"><img src="images/${card}.jpg" alt="${card}"><span>${card}</span></div>`;
          })
          .join("");
        const localMark =
          gameState.mode === "online" && player.id === onlinePlayerId ? "（你）" : "";
        const type = player.isHuman ? "玩家" : "电脑";
        const isActive = player.id === activePlayerId;
        const activeClass = isActive ? "active-turn" : "";
        const activity = isActive
          ? `<span class="activity-badge">${player.isHuman ? "行动中" : "思考中"}<i></i><i></i><i></i></span>`
          : "";
        return `<section class="player-panel ${visible ? "local-view" : ""} ${activeClass}"><h3><span>${player.name}${localMark}（${type}）</span>${activity}</h3><div class="hand">${cards}</div></section>`;
      })
      .join("");
  }

  function renderLog() {
    if (!gameState) {
      logElement.innerHTML = "";
      return;
    }
    logElement.innerHTML = gameState.log.map((entry) => `<li>${entry}</li>`).join("");
    logElement.scrollTop = logElement.scrollHeight;
  }

  function showChoices(choices, handler) {
    actionsElement.innerHTML = "";
    choices.forEach(({ value, label }) => {
      const button = document.createElement("button");
      button.className = "btn action-btn";
      button.textContent = label;
      button.addEventListener("click", () => handler(value));
      actionsElement.appendChild(button);
    });
  }

  function showGameShell(mode) {
    modeSelection.style.display = "none";
    gameArea.style.display = "block";
    modeLabelElement.textContent = `官打捉贼 · ${getModeLabel(mode)}`;
    resultElement.hidden = true;
    resultElement.textContent = "";
    SoundManager.init("../../audio");
  }

  function cleanupNetwork() {
    if (networkProtocol) networkProtocol.destroy();
    if (networkConnection) networkConnection.close();
    if (roomUI) roomUI.destroy();
    networkProtocol = null;
    networkConnection = null;
    roomUI = null;
    onlinePlayerId = null;
    onlineRole = null;
  }

  function startOfflineGame(mode) {
    clearTimeout(phaseTimer);
    cleanupNetwork();
    gameState = createGameState(mode);
    localViewerId = mode === "pve" ? 0 : null;
    showGameShell(mode);
    renderPlayers();
    renderLog();
    if (mode === "pvp") {
      startLocalHandReview(0);
    } else {
      advancePhase();
    }
  }

  function startLocalHandReview(playerId) {
    activePlayerId = playerId;
    localViewerId = null;
    renderPlayers();
    phaseElement.textContent = "查看身份";
    promptElement.textContent = `请将设备交给${gameState.players[playerId].name}。`;
    showChoices([{ value: playerId, label: "查看我的4张牌" }], () => {
      localViewerId = playerId;
      renderPlayers();
      promptElement.textContent = `${gameState.players[playerId].name}请记住自己的身份牌。`;
      showChoices([{ value: playerId, label: "记住了，隐藏手牌" }], () => {
        localViewerId = null;
        renderPlayers();
        if (playerId < 3) startLocalHandReview(playerId + 1);
        else advancePhase();
      });
    });
  }

  function renderFinished() {
    activePlayerId = null;
    const result = gameState.log[gameState.log.length - 1];
    phaseElement.textContent = "判罚结果";
    promptElement.textContent = gameState.round.target.caught
      ? `抓捕成功，${gameState.players[gameState.round.target.criminalId].name}持有${gameState.round.wanted}。`
      : `抓捕失败，真正持有${gameState.round.wanted}的是${gameState.players[gameState.round.target.criminalId].name}。`;
    resultElement.textContent = result;
    resultElement.hidden = false;
    renderPlayers(true);
    renderLog();
    showChoices([{ value: "restart", label: "再来一局" }], restartCurrentMode);
  }

  function finalizeRound() {
    if (!gameState.finished) {
      gameState.finished = true;
      gameState.log.push(formatPenaltyResult(gameState.players, gameState.round));
      SoundManager.play(gameState.round.target.caught ? "victory" : "draw");
    }
    renderFinished();
  }

  function completeOfflineChoice(phase, value) {
    applyChoice(gameState, phase, value);
    SoundManager.play("click");
    gameState.phaseIndex++;
    localViewerId = gameState.mode === "pve" ? 0 : null;
    renderPlayers();
    renderLog();
    advancePhase();
  }

  function promptLocalPlayer(phase, actorId) {
    if (gameState.mode === "pve") {
      promptElement.textContent = getPrompt(gameState, phase, actorId);
      showChoices(getPhaseChoices(gameState, phase), (value) => {
        completeOfflineChoice(phase, value);
      });
      return;
    }
    localViewerId = null;
    renderPlayers();
    promptElement.textContent = `请将设备交给${gameState.players[actorId].name}。`;
    showChoices([{ value: actorId, label: "查看手牌并行动" }], () => {
      localViewerId = actorId;
      renderPlayers();
      promptElement.textContent = getPrompt(gameState, phase, actorId);
      showChoices(getPhaseChoices(gameState, phase), (value) => {
        completeOfflineChoice(phase, value);
      });
    });
  }

  function sendOnlineState() {
    if (networkProtocol && onlineRole === "host") {
      networkProtocol.sendAction({ a: "state", state: gameState });
    }
  }

  function completeHostChoice(phase, value) {
    applyChoice(gameState, phase, value);
    SoundManager.play("click");
    gameState.phaseIndex++;
    renderLog();
    sendOnlineState();
    advancePhase();
  }

  function advanceOnlinePhase(phase, actorId) {
    if (onlineRole === "guest") {
      if (actorId === onlinePlayerId) {
        promptElement.textContent = getPrompt(gameState, phase, actorId);
        showChoices(getPhaseChoices(gameState, phase), (value) => {
          actionsElement.innerHTML = "";
          promptElement.textContent = "选择已发送，等待房主确认……";
          networkProtocol.sendAction({
            a: "choice",
            phase,
            phaseIndex: gameState.phaseIndex,
            value,
          });
        });
      } else {
        promptElement.textContent = `等待${gameState.players[actorId].name}行动……`;
      }
      return;
    }

    if (actorId === 1) {
      promptElement.textContent = "等待玩家2行动……";
      return;
    }
    if (actorId === 0) {
      promptElement.textContent = getPrompt(gameState, phase, actorId);
      showChoices(getPhaseChoices(gameState, phase), (value) => {
        completeHostChoice(phase, value);
      });
      return;
    }
    const choice = chooseAiValue(gameState, phase, actorId);
    phaseTimer = setTimeout(() => completeHostChoice(phase, choice), AI_THINKING_DELAY_MS);
  }

  function advancePhase() {
    clearTimeout(phaseTimer);
    const phase = PHASES[gameState.phaseIndex];
    if (phase === "result") {
      finalizeRound();
      if (gameState.mode === "online" && onlineRole === "host") sendOnlineState();
      return;
    }
    const actorId = getPhaseActor(gameState, phase);
    activePlayerId = actorId;
    renderPlayers();
    phaseElement.textContent = `第${gameState.phaseIndex + 1}步`;
    actionsElement.innerHTML = "";
    if (gameState.mode === "online") {
      advanceOnlinePhase(phase, actorId);
    } else if (gameState.players[actorId].isHuman) {
      promptLocalPlayer(phase, actorId);
    } else {
      promptElement.textContent = `${gameState.players[actorId].name}正在行动……`;
      const choice = chooseAiValue(gameState, phase, actorId);
      phaseTimer = setTimeout(() => completeOfflineChoice(phase, choice), AI_THINKING_DELAY_MS);
    }
  }

  function startOnlineRound() {
    if (onlineRole !== "host") return;
    clearTimeout(phaseTimer);
    gameState = createGameState("online");
    showGameShell("online");
    renderPlayers();
    renderLog();
    sendOnlineState();
    advancePhase();
  }

  function handleNetworkAction(action) {
    if (!action || typeof action.a !== "string") return;
    if (onlineRole === "guest" && action.a === "state" && action.state) {
      gameState = action.state;
      showGameShell("online");
      renderPlayers();
      renderLog();
      if (gameState.finished) renderFinished();
      else advancePhase();
      return;
    }
    if (onlineRole !== "host" || action.a !== "choice" || !gameState || gameState.finished) {
      return;
    }
    const phase = PHASES[gameState.phaseIndex];
    const actorId = getPhaseActor(gameState, phase);
    if (actorId !== 1 || action.phase !== phase || action.phaseIndex !== gameState.phaseIndex)
      return;
    if (!isValidChoice(gameState, phase, action.value)) return;
    completeHostChoice(phase, action.value);
  }

  function setupNetworkHandlers() {
    networkProtocol.setCallbacks({
      onAction: handleNetworkAction,
      onRestart: () => {
        if (onlineRole === "host") startOnlineRound();
      },
      onDisconnect: () => {
        clearTimeout(phaseTimer);
        activePlayerId = null;
        renderPlayers();
        phaseElement.textContent = "连接中断";
        promptElement.textContent = "对方已断开连接，请重新进入联网模式。";
        actionsElement.innerHTML = "";
      },
    });
  }

  function openOnlineRoom() {
    if (!RoomUI.isSupported()) {
      alert("当前浏览器不支持联网对战");
      return;
    }
    cleanupNetwork();
    roomUI = new RoomUI({
      onConnectionEstablished: (connection, protocol, role) => {
        networkConnection = connection;
        networkProtocol = protocol;
        onlineRole = role;
        onlinePlayerId = role === "host" ? 0 : 1;
        setupNetworkHandlers();
        showGameShell("online");
        phaseElement.textContent = "联网对战";
        promptElement.textContent = role === "host" ? "正在创建牌局……" : "等待房主发牌……";
        actionsElement.innerHTML = "";
        renderPlayers();
        renderLog();
        if (role === "host") phaseTimer = setTimeout(startOnlineRound, 300);
      },
      onCancel: () => {
        modeSelection.style.display = "grid";
      },
      onError: (message) => {
        alert(message);
      },
    });
    roomUI.show();
  }

  function restartCurrentMode() {
    if (!gameState) {
      if (onlineRole === "guest" && networkProtocol) networkProtocol.sendRestart();
      return;
    }
    if (gameState.mode === "online") {
      if (onlineRole === "host") {
        startOnlineRound();
      } else {
        networkProtocol.sendRestart();
        actionsElement.innerHTML = "";
        promptElement.textContent = "已申请重新发牌，等待房主……";
      }
      return;
    }
    startOfflineGame(gameState.mode);
  }

  document.getElementById("btn-pvp").addEventListener("click", () => startOfflineGame("pvp"));
  document.getElementById("btn-pve").addEventListener("click", () => startOfflineGame("pve"));
  document.getElementById("btn-online").addEventListener("click", openOnlineRoom);
  document.getElementById("btn-new-game").addEventListener("click", restartCurrentMode);
}
