/* eslint-disable no-undef */
// =============================================
// Pure game logic for Monopoly (no DOM dependency)
// Complete replica of javascript-monopoly
// =============================================

// Board data - 30 squares in logical order
// Each entry: { name, value, type, domIndex }
// type: "property" | "goodEvent" | "badEvent" | "surprise" | "jail" | "casino" | "airport" | "trip"
// domIndex: the DOM element index for clockwise visual layout in 12x5 grid
const BOARD_DATA = [
  { name: "起点", value: 2000, type: "goodEvent", domIndex: 18 },
  { name: "中国", value: 5000, type: "property", domIndex: 19 },
  { name: "越南", value: 1000, type: "property", domIndex: 20 },
  { name: "韩国", value: 1300, type: "property", domIndex: 21 },
  { name: "机会", value: 1000, type: "surprise", domIndex: 22 },
  { name: "日本", value: 3000, type: "property", domIndex: 23 },
  { name: "俄罗斯", value: 4000, type: "property", domIndex: 24 },
  { name: "白云机场", value: 1000, type: "airport", domIndex: 25 },
  { name: "交所得税", value: 1000, type: "badEvent", domIndex: 26 },
  { name: "命运", value: 1000, type: "surprise", domIndex: 27 },
  { name: "埃及", value: 1600, type: "property", domIndex: 28 },
  { name: "监狱", value: 0, type: "jail", domIndex: 29 },
  { name: "澳大利亚", value: 2400, type: "property", domIndex: 17 },
  { name: "新西兰", value: 1800, type: "property", domIndex: 15 },
  { name: "南极洲", value: 20000, type: "property", domIndex: 13 },
  { name: "赌场", value: 1000, type: "casino", domIndex: 11 },
  { name: "机会", value: 1000, type: "surprise", domIndex: 10 },
  { name: "捡到钱", value: 1000, type: "goodEvent", domIndex: 9 },
  { name: "巴西", value: 2000, type: "property", domIndex: 8 },
  { name: "阿根廷", value: 2200, type: "property", domIndex: 7 },
  { name: "墨西哥", value: 2400, type: "property", domIndex: 6 },
  { name: "美国", value: 4500, type: "property", domIndex: 5 },
  { name: "意大利", value: 3000, type: "property", domIndex: 4 },
  { name: "伦敦机场", value: 1000, type: "airport", domIndex: 3 },
  { name: "英国", value: 3600, type: "property", domIndex: 2 },
  { name: "命运", value: 1000, type: "surprise", domIndex: 1 },
  { name: "阿尔卑斯山", value: 1000, type: "trip", domIndex: 0 },
  { name: "德国", value: 3400, type: "property", domIndex: 12 },
  { name: "法国", value: 3200, type: "property", domIndex: 14 },
  { name: "西班牙", value: 2800, type: "property", domIndex: 16 },
];

// 31 fate cards (chance/fate events)
const FATE_CARDS = [
  { text: "扶老奶奶过马路的事迹被大家知道了，村委会颁发$1000奖金", value: 1000, stop: 0 },
  { text: "中了彩票，获得头奖$5000", value: 5000, stop: 0 },
  { text: "在街边被劫匪抢劫，为了保住性命，失去$3000", value: -3000, stop: 0 },
  { text: "喝了一杯一点点，花费$30", value: -30, stop: 0 },
  { text: "路边捡到$500", value: 500, stop: 0 },
  { text: "吃鱼卡到鱼刺，去医院花了$800", value: -800, stop: 0 },
  { text: "钱包落在出租车里，丢失$1000", value: -1000, stop: 0 },
  { text: "空闲时间去兼职家教，收获$2000", value: 2000, stop: 0 },
  { text: "扶老奶奶过马路摔了一跤，买药花了$100", value: -100, stop: 0 },
  { text: "手机突然坏了，换了部最新款iPhone，花费$1300", value: -1300, stop: 0 },
  { text: "吃羊肉火锅，花费$500", value: -500, stop: 0 },
  { text: "去日本看樱花，花费$2000", value: -2000, stop: 0 },
  { text: "什么也没有发生，除了钱包少了$800", value: -800, stop: 0 },
  { text: "什么也没有发生, 除了钱包多了$1000", value: 1000, stop: 0 },
  { text: "在广交会做翻译，获得$1000", value: 1000, stop: 0 },
  { text: "在校门口发传单，得到$100", value: 100, stop: 0 },
  { text: "获得三好学生奖学金，奖金$3000", value: 3000, stop: 0 },
  { text: "抢了个微信红包，获得$1", value: 1, stop: 0 },
  { text: "梦见得到$3000奖金，醒来决定花$50去拜神", value: -50, stop: 0 },
  { text: "获得了$3000奖金！赶紧花$500去还愿", value: 2500, stop: 0 },
  { text: "卖闲置赚了$100", value: 100, stop: 0 },
  { text: "什么也没有发生", value: 0, stop: 0 },
  { text: "看电影花费了$100", value: -100, stop: 0 },
  { text: "还花呗欠款$999", value: -999, stop: 0 },
  { text: "一年一度的双十一到了，剁手花了$2000", value: -2000, stop: 0 },
  { text: "突然很渴想买瓶矿泉水，花费$5", value: -5, stop: 0 },
  { text: "去工地搬砖赚了$500", value: 500, stop: 0 },
  { text: "偷税漏税罚款$1000，拘留1日", value: -1000, stop: 1 },
  { text: "超速行驶被罚款$2000，拘留2天", value: -2000, stop: 2 },
  { text: "被查水表发现有违建，罚款$1000并拘留3日", value: -1000, stop: 3 },
  { text: "考试作弊被拘留5日", value: 0, stop: 5 },
];

// Player color scheme (matches reference project)
const COLOR_SCHEME = {
  Joker: "#5E45AB",
  Batman: "#121212",
  Superman: "#274D7A",
  Catwoman: "#B04E58",
  "Harley Quinn": "pink",
  Robin: "#FA2A14",
  "Green Lantern": "#5FAE2E",
};

// Generic player colors for non-character mode
const PLAYER_COLORS = ["#e53935", "#1565c0", "#f9a825", "#2e7d32"];
const PLAYER_COLOR_NAMES = ["红", "蓝", "黄", "绿"];

const BOARD_SIZE = 30;

function createGameState(playerCount, npcCount, startMoney) {
  const players = [];
  const total = playerCount + npcCount;
  for (let i = 0; i < total; i++) {
    players.push({
      index: i,
      money: startMoney,
      state: "active",
      stop: 0,
      isHuman: i < playerCount,
      position: 0,
    });
  }
  const board = BOARD_DATA.map((d) => ({
    name: d.name,
    value: d.value,
    type: d.type,
    domIndex: d.domIndex,
    level: 0, // 0=empty, 1=house, 2=villa, 3=hotel
    owner: -1, // -1=unowned, 0..N=player index
  }));
  return {
    players,
    board,
    currentPlayer: 0,
    round: 0,
    gameOver: false,
    winner: -1,
  };
}

// Random number in [min, max] inclusive — fixed from reference bug
function generateNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollDice() {
  return generateNum(1, 6);
}

// Move player forward by steps, return events
function movePlayer(state, playerIndex, steps) {
  const player = state.players[playerIndex];
  const events = [];
  for (let i = 0; i < steps; i++) {
    if (player.position === BOARD_SIZE - 1) {
      player.position = -1;
      events.push({ type: "passGo" });
    }
    player.position++;
  }
  return events;
}

// Calculate rent using reference formula
function calculateRent(place) {
  if (place.type !== "property") return 0;
  const state = 5 / (place.level * 3 + 1); // denominators: 1, 4, 7, 10
  return Math.floor(place.value / (state > 0.5 ? Math.ceil(state) : state));
}

// Handle landing event - modifies state and returns result
function handleLanding(state, playerIndex) {
  const player = state.players[playerIndex];
  const placeIndex = player.position;
  const place = state.board[placeIndex];
  const result = { type: place.type, placeIndex, message: "", data: {} };

  if (place.type === "property") {
    if (place.owner === -1) {
      // Unowned - offer to buy
      result.type = "buyOffer";
      result.message = `${place.name} 无人拥有，价格$${place.value}`;
      result.data.canAfford = player.money > place.value;
    } else if (place.owner === playerIndex) {
      // Own property - offer to upgrade
      if (place.level === 3) {
        result.type = "maxLevel";
        result.message = `${place.name} 已是最高等级`;
      } else {
        result.type = "upgradeOffer";
        result.message = `${place.name} 升级费用$${Math.floor(place.value / 2)}`;
        result.data.canAfford = player.money > place.value * 0.5;
        result.data.cost = Math.floor(place.value / 2);
      }
    } else {
      // Pay rent
      const owner = state.players[place.owner];
      if (owner.stop) {
        result.type = "rentWaived";
        result.message = "房子主人不在，免费过夜1晚！";
      } else {
        const rent = calculateRent(place);
        result.type = "payRent";
        result.message = `${owner.index}方 感谢${playerIndex}方 在${place.name}消费$${rent}`;
        result.data.rent = rent;
        result.data.ownerIndex = place.owner;
      }
    }
  } else if (place.type === "goodEvent") {
    const money = 500 * generateNum(0, 7);
    player.money += money;
    result.type = "goodEvent";
    result.message = placeIndex === 0 ? `恭喜你捡到了$${money}` : `恭喜你捡到了$${money}`;
    result.data.money = money;
  } else if (place.type === "badEvent") {
    const money = 300 * generateNum(0, 7);
    player.money -= money;
    result.type = "badEvent";
    result.message = `你需要向税务局缴纳税收$${money}`;
    result.data.money = money;
  } else if (place.type === "surprise") {
    const cardIndex = generateNum(0, 30); // Fixed: 0-30 inclusive (31 cards)
    const card = FATE_CARDS[cardIndex];
    player.money += card.value;
    result.type = "surprise";
    result.message = card.text;
    result.data = { cardIndex, value: card.value, stop: card.stop };
    if (card.stop) {
      player.position = 11; // jail
      player.stop = card.stop;
      result.data.goToJail = true;
    }
  } else if (place.type === "jail") {
    const days = generateNum(1, 3);
    player.stop = days;
    result.type = "jail";
    result.message = `偷税漏税被抓，关押${days}天`;
    result.data.days = days;
  } else if (place.type === "casino") {
    const diceNum = rollDice();
    const winnings = diceNum * 500;
    player.money += winnings;
    result.type = "casino";
    result.message = `赌场掷出${diceNum}，赢得$${winnings}！`;
    result.data = { diceNum, winnings };
  } else if (place.type === "airport") {
    const destName = place.name === "白云机场" ? "英国" : "中国";
    const dest = 30 - placeIndex; // matches reference: 30 - position
    player.money -= 800;
    player.position = dest;
    result.type = "airport";
    result.message = `你花费$800搭乘飞机前往${destName}`;
    result.data = { cost: 800, dest, destName };
  } else if (place.type === "trip") {
    const days = generateNum(1, 3);
    const cost = days * 1000;
    player.stop = days;
    player.money -= cost;
    result.type = "trip";
    result.message = `${playerIndex}方花费${cost}享受旅游度假${days}天`;
    result.data = { days, cost };
  }
  return result;
}

function buyProperty(state, playerIndex, placeIndex) {
  const player = state.players[playerIndex];
  const place = state.board[placeIndex];
  if (place.owner !== -1) return false;
  if (player.money <= place.value) return false;
  player.money -= place.value;
  place.owner = playerIndex;
  return true;
}

function upgradeProperty(state, playerIndex, placeIndex) {
  const player = state.players[playerIndex];
  const place = state.board[placeIndex];
  if (place.owner !== playerIndex) return false;
  if (place.level >= 3) return false;
  const cost = Math.floor(place.value / 2);
  if (player.money <= cost) return false;
  player.money -= cost;
  place.level++;
  return true;
}

function checkBankrupt(state, playerIndex) {
  return state.players[playerIndex].money < 0;
}

function confiscateProperties(state, playerIndex) {
  state.board.forEach((place) => {
    if (place.owner === playerIndex) {
      place.owner = -1;
      place.level = 0;
    }
  });
}

function checkGameOver(state) {
  const activePlayers = state.players.filter((p) => p.state === "active");
  if (activePlayers.length <= 1) {
    state.gameOver = true;
    state.winner = activePlayers.length === 1 ? activePlayers[0].index : -1;
    return true;
  }
  return false;
}

// NPC decision: keep reserve money
function npcDecision(state, playerIndex, eventType, data) {
  const player = state.players[playerIndex];
  if (eventType === "buyOffer") {
    return player.money - data.value > 3000;
  }
  if (eventType === "upgradeOffer") {
    return player.money - data.cost > 2000;
  }
  return false;
}

// Advance to next active player, update round
function advanceTurn(state) {
  const total = state.players.length;
  let next = state.currentPlayer;
  let safety = 0;
  while (safety < total + 1) {
    next = (next + 1) % total;
    if (next === 0) state.round++;
    const p = state.players[next];
    if (p.state === "active") {
      if (p.stop) {
        p.stop--;
        safety++;
        continue;
      }
      state.currentPlayer = next;
      return next;
    }
    safety++;
  }
  return -1;
}

// Conditional exports for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_DATA,
    FATE_CARDS,
    COLOR_SCHEME,
    PLAYER_COLORS,
    PLAYER_COLOR_NAMES,
    BOARD_SIZE,
    createGameState,
    generateNum,
    rollDice,
    movePlayer,
    calculateRent,
    handleLanding,
    buyProperty,
    upgradeProperty,
    checkBankrupt,
    confiscateProperties,
    checkGameOver,
    npcDecision,
    advanceTurn,
  };
}

// =============================================
// Browser UI — complete replica of reference project
// =============================================
if (typeof document !== "undefined") {
  let places = []; // board state (mirrors reference `places` array)
  const players = []; // player state (mirrors reference `players` array)
  let s = 0; // current player index
  let playerNumber = 0;
  let npcNumber = 0;
  let startMoney = 0;
  let v = 800; // animation speed ms
  let person; // current player reference

  // DOM references
  let mapEl, diceEl, chooseboxEl, choosechrEl, titleEl, infoEl;
  let dialogEl, infoboxEl, msgboxEl;

  function init() {
    SoundManager.init("../../audio");
    mapEl = document.querySelector(".map");
    diceEl = document.querySelector(".dice");
    chooseboxEl = document.querySelector(".choosebox");
    choosechrEl = document.querySelector(".choosechr");
    titleEl = document.querySelector(".title");
    infoEl = document.querySelector(".info");
    dialogEl = document.querySelector(".dialog");
    infoboxEl = document.querySelector(".infobox");
    msgboxEl = document.querySelector(".msgbox");

    // Create 30 board cells (prepend for clockwise layout)
    for (let i = 0; i < 30; i++) {
      const box = document.createElement("div");
      const h3 = document.createElement("h3");
      box.className = "box";
      box.append(h3);
      mapEl.prepend(box);
    }

    // Write square names into cells using domIndex mapping
    places = BOARD_DATA.map((d) => {
      const node = document.querySelectorAll(".map>div")[d.domIndex];
      node.firstElementChild.append(d.name);
      return {
        name: d.name,
        value: d.value,
        state: d.type === "property" ? 0 : d.type,
        owner: d.type === "property" ? "" : "sean",
        node,
      };
    });

    // Bind money selection
    Array.from(document.querySelectorAll(".choosebox li")).forEach((node, index) => {
      node.addEventListener("click", () => chooseNumber(index));
    });

    // Bind character selection — use colored div tokens
    const TOKEN_COLORS = ["#e53935", "#1565c0", "#f9a825", "#2e7d32"];
    const TOKEN_NAMES = ["红", "蓝", "黄", "绿"];
    Array.from(document.querySelectorAll(".choosechr li")).forEach((item, idx) => {
      item.firstElementChild.addEventListener("click", () => {
        const name = TOKEN_NAMES[idx] || item.children[1].innerHTML;
        const node = document.createElement("div");
        node.className = "chr";
        node.style.background = TOKEN_COLORS[idx] || "#333";
        node.textContent = name;
        places[0].node.append(node);
        binding(node, name);
        item.style.pointerEvents = "none";
        item.style.opacity = "0.5";
      });
    });

    // Bind dice click
    diceEl.addEventListener("click", () => {
      if (!person || !person.control) return;
      game();
    });

    // Bind speed button
    document.getElementById("btn-speed").addEventListener("click", function () {
      const text = v > 600 ? "正常" : "加快";
      this.innerHTML = `${text}速度`;
      v = 1300 - v;
    });
    // Bind autopilot button
    let autopilot = false;
    document.getElementById("btn-autopilot").addEventListener("click", function () {
      autopilot = !autopilot;
      this.innerHTML = autopilot ? "取消托管" : "开启托管";
      players.forEach((p) => {
        if (autopilot) {
          if (p.control) p.control = "";
        } else {
          if (p.control === "") p.control = 1;
        }
      });
    });

    // Bind dialog cancel button
    dialogEl.children[3].addEventListener("click", () => dialogClicked("", false));

    // Property info on hover
    places.forEach((place) => {
      place.node.addEventListener("mouseover", () => {
        if (place.state >= 0 && typeof place.state === "number") {
          infoboxEl.style.display = "block";
          infoboxEl.firstElementChild.innerHTML = place.name;
          infoboxEl.lastElementChild.children[0].innerHTML = `地主：${place.owner || "无"}`;
          infoboxEl.lastElementChild.children[1].innerHTML = `价格：${place.value}`;
          if (place.owner) {
            const rent = calculateRent({
              type: "property",
              value: place.value,
              level: place.state,
            });
            infoboxEl.lastElementChild.children[2].innerHTML = `住宿：$${rent}`;
          } else {
            infoboxEl.lastElementChild.children[2].innerHTML = "";
          }
        }
      });
      place.node.addEventListener("mouseout", () => {
        infoboxEl.style.display = "none";
      });
    });
  }

  // Setup flow: money → player count → NPC count → character select
  function chooseNumber(num) {
    if (!startMoney) {
      writeSetting("玩家人数", 1);
      startMoney = num * 5000 + 10000;
    } else if (!playerNumber) {
      writeSetting("电脑人数", 0, num);
      playerNumber = +num + 1;
    } else {
      npcNumber = +num;
      finishChooseNumber();
    }
  }

  function writeSetting(title, startNum, num) {
    chooseboxEl.firstElementChild.innerHTML = title;
    Array.from(chooseboxEl.lastElementChild.children).forEach((node, index) => {
      node.innerHTML = startNum + index;
      node.style.pointerEvents = "auto";
      node.style.background = "";
      switch (num) {
        case 3:
          if (index > 0) disableBox(node);
          break;
        case 2:
          if (index > 1) disableBox(node);
          break;
        case 1:
          if (index > 2) disableBox(node);
          break;
        case 0:
          if (index < 1) disableBox(node);
          break;
      }
    });
  }

  function disableBox(node) {
    node.style.pointerEvents = "none";
    node.style.background = "grey";
  }

  function finishChooseNumber() {
    chooseboxEl.style.display = "none";
    choosechrEl.style.display = "block";
  }

  function binding(node, name) {
    const control = players.length < playerNumber ? 1 : 0;
    players.push({
      name,
      index: players.length,
      money: startMoney,
      state: "active",
      stop: 0,
      control,
      node,
      position: 0,
    });
    if (players.length === playerNumber + npcNumber) {
      gameStart();
    }
  }

  function gameStart() {
    choosechrEl.parentElement.style.display = "none";
    document.getElementById("status-bar").style.display = "flex";
    document.getElementById("game-main").style.display = "flex";
    titleEl.style.visibility = "visible";
    s = 0;
    person = players[0];
    updatePlayer(players[0].name);
    writeInfo();
    // If first player is NPC, auto-roll
    if (!players[0].control) {
      setTimeout(() => game(), v * 2);
    } else {
      toggleDice(true);
    }
  }

  // --- Game Logic (mirrors reference monopoly.js) ---

  function gameSequence(index) {
    if (index === playerNumber + npcNumber - 1) {
      index = 0;
      updateRound();
    } else {
      index++;
    }
    setTimeout(() => {
      if (!checkPlayerState(index)) {
        gameSequence(index);
      }
    }, v);
  }

  function playerMove(index) {
    if (person.position === 29) {
      person.position = -1;
      places[0].node.append(players[index].node);
      updateInfo();
      players[index].money += 1000;
    }
    person.position++;
    places[person.position].node.append(players[index].node);
  }

  function game() {
    const num = rollDice();
    rollDiceAnim(num);
    person = players[s];
    const move = setInterval(() => playerMove(s), v);
    setTimeout(
      () => {
        clearInterval(move);
        const place = places[person.position];
        // Buy property
        if (!place.owner) {
          if (person.control) {
            showDialog("purchase", person.money > place.value);
          } else {
            setTimeout(() => dialogClicked("purchase", person.money - place.value > 3000), v / 3);
          }
        } else if (place.owner && place.owner !== person.name && place.owner !== "sean") {
          // Pay rent
          const owner = players.find((p) => p.name === place.owner);
          if (owner.stop) {
            showMsgbox("房子主人不在，免费过夜1晚！");
          } else {
            const state = 5 / (place.state * 3 + 1);
            const cost = place.value / (state > 0.5 ? Math.ceil(state) : state);
            person.money -= cost;
            owner.money += cost;
            showMsgbox(`${owner.name}感谢${person.name}在${place.name}消费$${Math.floor(cost)}`);
            checkBankruptUI();
          }
          gameSequence(s);
        } else if (place.owner === person.name) {
          // Upgrade
          if (place.state === 3) {
            gameSequence(s);
          } else {
            if (person.control) {
              showDialog("upgrade", person.money > place.value * 0.5);
            } else {
              dialogClicked("upgrade", person.money - place.value / 2 > 2000);
            }
          }
        } else if (place.state === "goodEvent") {
          const money = 500 * generateNum(0, 7);
          person.money += money;
          showMsgbox(`恭喜你捡到了$${money}`);
          gameSequence(s);
        } else if (place.state === "badEvent") {
          const money = 300 * generateNum(0, 7);
          person.money -= money;
          showMsgbox(`你需要向税务局缴纳税收$${money}`);
          checkBankruptUI();
          gameSequence(s);
        } else if (place.state === "jail") {
          person.stop = generateNum(1, 3);
          showMsgbox(`偷税漏税被抓，关押${person.stop}天`);
          gameSequence(s);
        } else if (place.state === "casino") {
          const diceNum = rollDice();
          rollDiceAnim(diceNum);
          setTimeout(() => {
            const casinoMoney = diceNum * 500;
            person.money += casinoMoney;
            showMsgbox(`恭喜你获得了$${casinoMoney}`);
            updateInfo();
            gameSequence(s);
          }, v * 2);
        } else if (place.state === "surprise") {
          const event = generateNum(0, 30); // Fixed: 0-30 inclusive
          person.money += FATE_CARDS[event].value;
          if (FATE_CARDS[event].stop) {
            setTimeout(() => {
              person.position = 11;
              person.stop = FATE_CARDS[event].stop;
              places[11].node.append(person.node);
              checkBankruptUI();
              gameSequence(s);
            }, v * 1.5);
          } else {
            checkBankruptUI();
            gameSequence(s);
          }
          showMsgbox(FATE_CARDS[event].text);
        } else if (place.state === "airport") {
          const des = place.name === "白云机场" ? "英国" : "中国";
          showMsgbox(`你花费$800搭乘飞机前往${des}`);
          setTimeout(() => {
            person.position = 30 - person.position;
            places[person.position].node.append(person.node);
            checkBankruptUI();
            gameSequence(s);
          }, v * 1.5);
          person.money -= 800;
        } else if (place.state === "trip") {
          person.stop = generateNum(1, 3);
          person.money -= person.stop * 1000;
          showMsgbox(`${person.name}花费${person.stop * 1000}享受旅游度假${person.stop}天`);
          checkBankruptUI();
          gameSequence(s);
        }
        updateInfo();
      },
      v * (num + 0.9)
    );
  }

  function dialogClicked(type, action) {
    const place = places[person.position];
    if (!action) {
      closeDialog();
      gameSequence(s);
      return;
    }
    if (type === "purchase") {
      place.owner = person.name;
      person.money -= place.value;
      const color = getPlayerColor(person.name);
      place.node.style.boxShadow = `3px 3px 3px inset ${color},3px -3px 3px inset ${color},-3px 3px 3px inset ${color}, -3px -3px 3px inset ${color}`;
      showMsgbox(`恭喜你获得了${place.name}`);
      gameSequence(s);
    } else {
      const upgradeMap = ["一座小房子", "一套大别墅", "一栋大酒店"];
      person.money -= place.value / 2;
      place.state++;
      showMsgbox(`恭喜你在${place.name}建了${upgradeMap[place.state - 1]}`);
      upgradeHouse(place.node, place.state - 1);
    }
    closeDialog();
    updateInfo();
  }

  function checkBankruptUI() {
    if (person.money < 0) {
      setTimeout(() => {
        person.stop = 0;
        person.state = "bankrupt";
        showMsgbox(`很遗憾，${person.name}破产了，所有地产将充公处理。`);
        // Confiscate properties
        places.forEach((place) => {
          if (place.owner === person.name) {
            place.owner = "";
            place.node.style.boxShadow =
              "1px 1px 1px inset #454545, 1px -1px 1px inset #454545, -1px 1px 1px inset #454545, -1px -1px 1px inset #454545";
          }
        });
        // Move player token off board
        const infoNode = infoEl.children[players.indexOf(person)];
        if (infoNode) {
          infoNode.firstElementChild.style.display = "none";
          infoNode.append(person.node);
        }
        checkFinish();
      }, v / 2);
    }
  }

  function checkFinish() {
    let count = 0;
    let winner;
    players.forEach((p) => {
      if (p.state === "active") {
        count++;
        winner = p;
      }
    });
    if (count === 1) {
      setTimeout(() => {
        showGameOver(winner.name);
      }, v * 2);
    }
  }

  function checkPlayerState(index) {
    const player = players[index];
    if (player.stop) {
      if (player.position === 11) {
        showMsgbox(`${player.name}还有${player.stop}天可以出狱`);
      } else {
        showMsgbox(`${player.name}离难得的假期结束还有${player.stop}天`);
      }
      player.stop--;
      return false;
    }
    if (player.state === "bankrupt") {
      return false;
    }
    if (!player.control) {
      setTimeout(() => game(), v * 2);
    } else {
      toggleDice(true);
    }
    person = player;
    s = index;
    updatePlayer(player.name);
    return true;
  }

  // --- UI Functions ---

  function getPlayerColor(name) {
    const idx = players.findIndex((p) => p.name === name);
    return PLAYER_COLORS[idx] || "#333";
  }

  function rollDiceAnim(num) {
    const bg = generateNum(1, 2);
    diceEl.style.background = `url(images/s${bg}.jpg)`;
    setTimeout(() => {
      diceEl.style.background = `url(images/${num}.jpg)`;
    }, 300);
    toggleDice(false);
  }

  function toggleDice(state) {
    diceEl.style.pointerEvents = state ? "auto" : "none";
  }

  function updatePlayer(name) {
    titleEl.innerHTML = name;
    titleEl.style.background = getPlayerColor(name);
  }

  function updateRound() {
    const el = document.getElementById("round-count");
    el.textContent = +el.textContent + 1;
  }

  function writeInfo() {
    const num = playerNumber + npcNumber;
    for (let i = 0; i < num; i++) {
      const node = document.createElement("div");
      const h2 = document.createElement("h2");
      const h3 = document.createElement("h3");
      h3.innerHTML = `$${players[i].money}`;
      h2.innerHTML = players[i].name;
      h2.style.background = getPlayerColor(players[i].name);
      node.append(h3);
      node.append(h2);
      infoEl.append(node);
    }
  }

  function updateInfo() {
    const num = playerNumber + npcNumber;
    for (let i = 0; i < num; i++) {
      if (infoEl.children[i]) {
        infoEl.children[i].firstElementChild.innerHTML = "$" + players[i].money;
      }
    }
  }

  function upgradeHouse(node, level) {
    // Construction animation
    const construct = document.createElement("div");
    construct.className = "construct";
    for (let i = 0; i < 5; i++) {
      const img = document.createElement("img");
      img.src = `images/c${i + 1}.png`;
      construct.append(img);
    }
    node.prepend(construct);
    setTimeout(() => {
      node.removeChild(construct);
      const building = document.createElement("img");
      building.src = `images/l${level + 1}.png`;
      building.className = "house";
      node.append(building);
      gameSequence(s);
    }, 2000);
  }

  function showDialog(type, allowButton) {
    dialogEl.style.display = "block";
    const place = places[person.position];
    if (type === "purchase") {
      dialogEl.children[1].innerHTML = "购买地产";
      dialogEl.firstElementChild.innerHTML = `请问你要花费$${place.value}来购买${place.name}吗？`;
    } else {
      dialogEl.children[1].innerHTML = "升级地产";
      dialogEl.firstElementChild.innerHTML = `请问你要花费$${Math.floor(place.value / 2)}来升级${place.name}吗？`;
    }
    if (allowButton) {
      dialogEl.children[2].style.pointerEvents = "auto";
      dialogEl.children[2].style.background = "#f2f2f2";
    } else {
      dialogEl.children[2].style.pointerEvents = "none";
      dialogEl.children[2].style.background = "#454545";
    }
    dialogEl.children[2].onclick = () => dialogClicked(type, true);
  }

  function closeDialog() {
    dialogEl.style.display = "none";
  }

  function showMsgbox(msg) {
    msgboxEl.style.display = "block";
    msgboxEl.innerHTML = msg;
    setTimeout(() => {
      msgboxEl.style.display = "none";
    }, v * 1.6);
  }

  function showGameOver(winnerName) {
    const overlay = document.getElementById("game-over");
    document.getElementById("winner-text").textContent =
      `${winnerName}赢啦！恭喜你成为最有钱的人！`;
    overlay.style.display = "flex";
    document.getElementById("btn-restart").onclick = () => location.reload();
  }

  document.addEventListener("DOMContentLoaded", init);
}
