const state = {
  items: new Set(),
  trustedLetter: false,
  knowsTruth: false,
  sawPhoto: false,
  sawSecondHand: false,
  busDeparturePlayed: false,
  disturbingSoundScenesPlayed: new Set(),
  canReturnToHallFromCrossroad: false,
  previousScene: null,
  current: 'storyPrelude',
};

const inventoryEl = document.getElementById('inventory');
const backdropEl = document.getElementById('backdrop');
const kickerEl = document.getElementById('kicker');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('title');
const textEl = document.getElementById('text');
const choicesEl = document.getElementById('choices');
const pickupEl = document.getElementById('pickup');
const pickupNameEl = document.getElementById('pickupName');
const pickupDescEl = document.getElementById('pickupDesc');
const restartEl = document.getElementById('restart');
const progressBarEl = document.getElementById('progressBar');
const progressLabelEl = document.getElementById('progressLabel');
const playStoryEl = document.getElementById('playStory');
const playStoryCardEl = document.getElementById('playStoryCard');
const playFifthPhotoCardEl = document.getElementById('playFifthPhotoCard');
const backToLibraryEl = document.getElementById('backToLibrary');
const storyBrandEl = document.getElementById('storyBrand');
const soundIntroEl = document.getElementById('soundIntro');
const soundIntroBackdropEl = document.getElementById('soundIntroBackdrop');
const enableStorySoundEl = document.getElementById('enableStorySound');
const startStoryMutedEl = document.getElementById('startStoryMuted');
const ambientSoundEl = document.getElementById('ambientSound');
const busDepartureSoundEl = document.getElementById('busDepartureSound');
const outdoorWindSoundEl = document.getElementById('outdoorWindSound');
const disturbingRoomSoundEl = document.getElementById('disturbingRoomSound');
const jumpscareSoundEl = document.getElementById('jumpscareSound');
const houseCreakSoundEl = document.getElementById('houseCreakSound');
const femaleCrySoundEl = document.getElementById('femaleCrySound');
const soundToggleEl = document.getElementById('soundToggle');
const soundToggleLabelEl = soundToggleEl.querySelector('.sound-toggle__label');

let typingToken = 0;
let finishTyping = null;
let soundEnabled = false;
let activeStory = 'grandma';
let soundPromptTrigger = null;
let busDepartureFadeTimer = null;
let busDepartureFadeFrame = null;
let windFadeFrame = null;
let windSyncToken = 0;
const activeDisturbingSounds = new Set();
const activeJumpscareSounds = new Set();
const activeHouseCreakSounds = new Set();
let houseCreakInterval = null;
const activeFemaleCries = new Set();
let femaleCryInterval = null;

ambientSoundEl.volume = 0.22;
busDepartureSoundEl.volume = 0.28;
outdoorWindSoundEl.volume = 0;

const outdoorScenes = new Set([
  'intro',
  'forestRoad',
  'loopRoad',
  'approach',
  'yard',
  'shed',
  'window',
  'letter',
  'letterReveal',
  'porch',
  'doorFalls',
  'endNeutral',
]);

const disturbingSoundScenes = new Set(['cellar', 'secretRoom']);
const jumpscareScenes = new Set(['scare', 'endTrust']);
const indoorHouseScenes = new Set([
  'wetCoat',
  'coatLetter',
  'hall',
  'grandmaRoom',
  'familyPhoto',
  'cellar',
  'scare',
  'crossroad',
  'secretRoom',
  'mirrorBroken',
]);

const indoorCryingScenes = new Set([
  'wetCoat',
  'coatLetter',
  'hall',
  'grandmaRoom',
  'familyPhoto',
  'cellar',
  'scare',
  'crossroad',
  'secretRoom',
]);

function playFemaleCry(volume = 0.065) {
  if (!soundEnabled) return;

  const sound = femaleCrySoundEl.cloneNode();
  sound.volume = volume;
  activeFemaleCries.add(sound);

  const releaseSound = () => activeFemaleCries.delete(sound);
  sound.addEventListener('ended', releaseSound, { once: true });
  sound.addEventListener('error', releaseSound, { once: true });
  sound.play().catch(releaseSound);
}

function stopFemaleCries() {
  clearInterval(femaleCryInterval);
  femaleCryInterval = null;
  activeFemaleCries.forEach((sound) => {
    sound.pause();
    sound.currentTime = 0;
  });
  activeFemaleCries.clear();
}

function syncIndoorCrying(sceneKey) {
  const shouldRun = soundEnabled && indoorCryingScenes.has(sceneKey);

  if (shouldRun && !femaleCryInterval) {
    femaleCryInterval = setInterval(() => playFemaleCry(0.065), 120000);
  } else if (!shouldRun && femaleCryInterval) {
    stopFemaleCries();
  }
}

function playHouseCreak() {
  if (!soundEnabled || !indoorHouseScenes.has(state.current)) return;

  const sound = houseCreakSoundEl.cloneNode();
  sound.volume = 0.18;
  activeHouseCreakSounds.add(sound);

  const releaseSound = () => activeHouseCreakSounds.delete(sound);
  sound.addEventListener('ended', releaseSound, { once: true });
  sound.addEventListener('error', releaseSound, { once: true });
  sound.play().catch(releaseSound);
}

function stopHouseCreaks() {
  clearInterval(houseCreakInterval);
  houseCreakInterval = null;
  activeHouseCreakSounds.forEach((sound) => {
    sound.pause();
    sound.currentTime = 0;
  });
  activeHouseCreakSounds.clear();
}

function syncHouseCreaks(sceneKey) {
  const shouldRun = soundEnabled && indoorHouseScenes.has(sceneKey);

  if (shouldRun && !houseCreakInterval) {
    houseCreakInterval = setInterval(playHouseCreak, 30000);
  } else if (!shouldRun && houseCreakInterval) {
    stopHouseCreaks();
  }
}

function stopJumpscareSounds() {
  activeJumpscareSounds.forEach((sound) => {
    sound.pause();
    sound.currentTime = 0;
  });
  activeJumpscareSounds.clear();
}

function playJumpscareSound() {
  if (!soundEnabled) return;

  const sound = jumpscareSoundEl.cloneNode();
  sound.volume = 0.52;
  activeJumpscareSounds.add(sound);

  const releaseSound = () => activeJumpscareSounds.delete(sound);
  sound.addEventListener('ended', releaseSound, { once: true });
  sound.addEventListener('error', releaseSound, { once: true });
  sound.play().catch(releaseSound);
}

function stopDisturbingSounds() {
  activeDisturbingSounds.forEach((sound) => {
    sound.pause();
    sound.currentTime = 0;
  });
  activeDisturbingSounds.clear();
}

function playDisturbingSound(sceneKey) {
  state.disturbingSoundScenesPlayed.add(sceneKey);
  if (!soundEnabled) return;

  const sound = disturbingRoomSoundEl.cloneNode();
  sound.volume = 0.34;
  activeDisturbingSounds.add(sound);

  const releaseSound = () => activeDisturbingSounds.delete(sound);
  sound.addEventListener('ended', releaseSound, { once: true });
  sound.addEventListener('error', releaseSound, { once: true });
  sound.play().catch(releaseSound);
}

function fadeWindTo(targetVolume, duration = 900, pauseAtEnd = false) {
  cancelAnimationFrame(windFadeFrame);
  const startedAt = performance.now();
  const startingVolume = outdoorWindSoundEl.volume;

  function fadeStep(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    outdoorWindSoundEl.volume = startingVolume + ((targetVolume - startingVolume) * progress);

    if (progress < 1) {
      windFadeFrame = requestAnimationFrame(fadeStep);
    } else {
      windFadeFrame = null;
      if (pauseAtEnd) outdoorWindSoundEl.pause();
    }
  }

  windFadeFrame = requestAnimationFrame(fadeStep);
}

function stopOutdoorWind(reset = false) {
  windSyncToken += 1;
  cancelAnimationFrame(windFadeFrame);
  windFadeFrame = null;
  outdoorWindSoundEl.pause();
  outdoorWindSoundEl.volume = 0;
  if (reset) outdoorWindSoundEl.currentTime = 0;
}

function syncOutdoorWind(sceneKey) {
  const syncToken = ++windSyncToken;
  const shouldPlay = soundEnabled && outdoorScenes.has(sceneKey);

  if (shouldPlay) {
    if (outdoorWindSoundEl.paused) {
      outdoorWindSoundEl.play().then(() => {
        if (syncToken !== windSyncToken || !outdoorScenes.has(state.current)) {
          outdoorWindSoundEl.pause();
          return;
        }
        fadeWindTo(0.055, 1200);
      }).catch(() => {});
    } else {
      fadeWindTo(0.055, 600);
    }
  } else if (!outdoorWindSoundEl.paused) {
    fadeWindTo(0, 800, true);
  }
}

function stopBusDepartureSound() {
  clearTimeout(busDepartureFadeTimer);
  cancelAnimationFrame(busDepartureFadeFrame);
  busDepartureFadeTimer = null;
  busDepartureFadeFrame = null;
  busDepartureSoundEl.pause();
  busDepartureSoundEl.currentTime = 0;
  busDepartureSoundEl.volume = 0.28;
}

function fadeBusDepartureSound() {
  const fadeDuration = 1600;
  const startedAt = performance.now();
  const startingVolume = busDepartureSoundEl.volume;

  function fadeStep(now) {
    const progress = Math.min(1, (now - startedAt) / fadeDuration);
    busDepartureSoundEl.volume = startingVolume * (1 - progress);

    if (progress < 1 && !busDepartureSoundEl.paused) {
      busDepartureFadeFrame = requestAnimationFrame(fadeStep);
    } else {
      busDepartureSoundEl.pause();
      busDepartureSoundEl.volume = 0.28;
      busDepartureFadeFrame = null;
    }
  }

  busDepartureFadeFrame = requestAnimationFrame(fadeStep);
}

function playBusDepartureSound() {
  state.busDeparturePlayed = true;
  if (!soundEnabled) return;

  stopBusDepartureSound();
  busDepartureSoundEl.play().then(() => {
    const duration = Number.isFinite(busDepartureSoundEl.duration) ? busDepartureSoundEl.duration : 5.2;
    const fadeAfter = Math.max(0, (duration - 1.6) * 1000);
    busDepartureFadeTimer = setTimeout(fadeBusDepartureSound, fadeAfter);
  }).catch(() => {});
}

function renderSoundState() {
  soundToggleEl.classList.toggle('is-muted', !soundEnabled);
  soundToggleEl.setAttribute('aria-pressed', String(soundEnabled));
  soundToggleEl.setAttribute('aria-label', soundEnabled ? 'Выключить музыку' : 'Включить музыку');
  soundToggleLabelEl.textContent = soundEnabled ? 'Звук' : 'Без звука';
}

function playAmbientSound() {
  if (!soundEnabled) return;
  ambientSoundEl.play().catch(() => {
    soundEnabled = false;
    renderSoundState();
  });
}

const grandmaSceneOrder = ['storyPrelude', 'busRide', 'intro', 'forestRoad', 'loopRoad', 'approach', 'yard', 'shed', 'window', 'letter', 'letterReveal', 'porch', 'doorFalls', 'wetCoat', 'hall', 'grandmaRoom', 'cellar', 'crossroad'];
const fifthPhotoSceneOrder = Array.from({ length: 22 }, (_, index) => `fifthPhoto${String(index + 1).padStart(2, '0')}`);
const storySceneOrders = {
  grandma: grandmaSceneOrder,
  fifthPhoto: fifthPhotoSceneOrder,
};
const storyStartScenes = {
  grandma: 'storyPrelude',
  fifthPhoto: 'fifthPhoto01',
};

const sceneAssetExceptions = {
  arrival: 'arrival-v1.webp',
  'good-exit': 'end-good-v1.webp',
  'end-neutral': 'end-good-v1.webp',
  'end-good': 'house-calm-v1.webp',
  'bad-scare': 'scare-bad-v1.webp',
};
const preloadedSceneAssets = new Set();

function getSceneAssetUrl(scene) {
  if (scene.asset) return scene.asset;

  const { backdrop } = scene;
  if (backdrop === 'void') return null;
  const file = sceneAssetExceptions[backdrop] || `${backdrop}-v1.webp`;
  return `assets/scenes/${file}`;
}

function preloadUpcomingScenes(sceneKey, scene) {
  const schedule = window.requestIdleCallback || ((callback) => setTimeout(callback, 180));

  schedule(() => {
    const nextSceneKeys = getChoices(scene).map((choice) => choice.next);
    if (sceneKey === 'scare') nextSceneKeys.push('crossroad');

    nextSceneKeys.forEach((nextSceneKey) => {
      const nextScene = scenes[nextSceneKey];
      if (!nextScene) return;

      const url = getSceneAssetUrl(nextScene);
      if (!url) return;
      if (preloadedSceneAssets.has(url)) return;

      preloadedSceneAssets.add(url);
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
    });
  }, { timeout: 800 });
}

const inventoryLabels = {
  key: 'Ключ',
  letter: 'Письмо',
  thread: 'Красная нить',
  icon: 'Иконка',
};

const scenes = {
  storyPrelude: {
    backdrop: 'void',
    kicker: 'Перед дорогой',
    title: 'До\nпоездки',
    status: 'Некоторые вещи вспоминаются слишком поздно',
    text: [
      'В детстве ты проводил у бабушки каждое лето. Она записывала сны в толстый дневник, а нужные страницы перевязывала красной нитью. Над её кроватью висела маленькая деревянная иконка.',
      'Ты отчётливо помнил ещё одну деталь: узкую дверь в конце коридора. Родители говорили, что этого не могло быть: за той стеной сразу начинался двор.',
      'Если просыпался ночью, она учила не отвечать на голос из коридора. Потом ты решил, что это была игра, и почти перестал ей звонить.',
      'Неделю назад из посёлка сообщили, что бабушку нашли в доме. Электричество отключили в тот же день. Тебе осталось забрать её вещи и дневник.'
    ],
    choices: [{ title: 'Сесть в автобус', hint: 'До конечной остался один рейс', next: 'busRide' }],
  },
  busRide: {
    backdrop: 'bus-letter',
    kicker: 'Пролог',
    title: 'Письмо',
    status: 'До конечной осталось сорок минут',
    text: [
      'В автобусе не было никого, кроме тебя и водителя. За мокрыми окнами тянулся тёмный лес, изредка разрезанный светом фар.',
      'На коленях лежало извещение из поселковой администрации. В нём стояли дата смерти, адрес дома и просьба забрать вещи до конца месяца.',
      'Внизу кто-то дописал от руки: «Она просила, чтобы приехал именно ты». В администрации не знали, кто это сделал.'
    ],
    choices: [{ title: 'Сложить письмо', hint: 'Автобус уже замедляется', next: 'intro' }],
  },
  intro: {
    backdrop: 'bus-stop',
    kicker: 'Пролог',
    title: 'Последний\nрейс',
    status: () => state.previousScene === 'loopRoad' ? 'Дорога вернула тебя к началу' : 'Дальше только пешком',
    text: () => state.previousScene === 'loopRoad'
      ? [
          'Ты повернул обратно и шёл, не сворачивая. Сначала дом остался за спиной. Потом между деревьями снова показался его свет.',
          'Через несколько минут ты вышел к той же остановке. На мокрой земле всё ещё были видны следы, которые ты оставил, выйдя из автобуса.',
          'Автобус не вернулся. Дом стоял на том же месте. Свет в окне не погас.'
        ]
      : [
          'Дверь автобуса закрылась за спиной. Водитель не дождался, пока ты отойдёшь от дороги.',
          'Красные огни исчезли между деревьями. Лес сомкнулся вокруг дороги, и стало тихо настолько, что ты услышал собственное дыхание.',
          'Вдали стоял дом. Он казался пустым, если бы не едва заметный свет в одном окне.'
        ],
    choices: [
      { title: 'Идти к дому', hint: 'Другой дороги здесь нет', next: 'approach' },
      { title: 'Идти от дома', hint: 'Попытаться выйти к большой дороге', next: 'forestRoad' },
    ],
  },
  forestRoad: {
    backdrop: 'forest-road',
    kicker: 'Пролог',
    title: 'Дорога\nв лес',
    status: 'Дом остался за спиной',
    text: [
      'Ты пошёл в другую сторону. Первые десять минут каждый шаг отдалял тебя от дома.',
      'Потом столбики у дороги начали повторяться. Сначала ты заметил скол на одном. Затем — ту же косую царапину на следующем.',
      'Лес не становился гуще. Он просто никак не заканчивался.'
    ],
    choices: [{ title: 'Идти дальше', hint: 'Позади всё ещё темнее', next: 'loopRoad' }],
  },
  loopRoad: {
    backdrop: 'loop-road',
    kicker: 'Пролог',
    title: 'Поворот',
    status: 'Этой стороны дома ты никогда не видел',
    text: [
      'Дорога изогнулась вокруг болота и вывела тебя к опушке.',
      'За канавой снова стоял бабушкин дом. Теперь ты видел его с другой стороны, хотя ни разу не сворачивал.',
      'В окне всё ещё горел слабый свет.'
    ],
    choices: [
      { title: 'Идти к дому', hint: 'Петля не оставила другого выбора', next: 'approach' },
      { title: 'Идти обратно', hint: 'Вернуться к месту остановки', next: 'intro' },
    ],
  },
  approach: {
    backdrop: 'arrival',
    kicker: 'Пролог',
    title: 'Дом\nбабушки',
    status: 'Свет всё ещё горит',
    text: [
      'Чем ближе ты подходил, тем меньше дом был похож на тот, который ты помнил.',
      'Свет горел в бабушкиной комнате. Из администрации звонили дважды: ток отключили ещё на прошлой неделе.',
      'От калитки к дому тянулась цепочка следов, направленных наружу. На левой подошве не хватало угла — как на твоём ботинке.'
    ],
    choices: [{ title: 'Войти во двор', hint: 'Осмотреться до того, как стучать', next: 'yard' }],
  },
  yard: {
    backdrop: 'yard',
    kicker: 'Сцена I',
    title: 'Двор',
    status: 'В окне по-прежнему горит свет',
    text: [
      'Во дворе пахло мокрой землёй и ржавым железом.',
      'Слева на гвозде у сарая что-то поблескивало. Под окном лежал смятый конверт. На крыльце темнела дверь.',
      'Свет не мерцал. Лампа горела ровно, хотя в доме не было тока.'
    ],
    choices: [
      {
        title: 'Осмотреть сарай',
        hint: 'Там может быть ключ',
        effect: () => pickupItem('key', 'Старый ключ', 'Тяжёлый ключ с потёртой бородкой. На головке выцарапаны три короткие черты и одна длинная. Ключ похож на тот, которым бабушка запирала дом.'),
        next: 'shed',
        showIf: () => !state.items.has('key'),
      },
      {
        title: 'Поднять письмо',
        hint: 'Чужой текст на сырой бумаге',
        effect: () => pickupItem('letter', 'Письмо из двора', 'Это не извещение из автобуса. На конверте — твоё имя и бабушкин знак: три короткие черты, одна длинная.'),
        next: 'letter',
        showIf: () => !state.items.has('letter'),
      },
      { title: 'Посмотреть в окно', hint: 'Проверить, есть ли кто-то внутри', next: 'window' },
      { title: 'Подойти к двери', hint: 'Войти в дом', next: 'porch' },
    ],
  },
  shed: {
    backdrop: 'shed',
    kicker: 'Сцена II',
    title: 'Сарай',
    status: 'Царапины сделаны изнутри',
    text: [
      'Ключ лежал рядом с керосиновой лампой. Пыль вокруг была смахнута ладонью.',
      'На досках повторялся бабушкин знак: три короткие черты, одна длинная. Им она отмечала страницы дневника, которые просила не читать вслух.',
      'За стеной дома тихо скрипнула половица.'
    ],
    choices: [{ title: 'Вернуться во двор', hint: 'Ключ уже у тебя', next: 'yard' }],
  },
  window: {
    backdrop: 'window',
    kicker: 'Сцена II',
    title: 'Окно',
    status: 'В комнате никого не видно',
    text: [
      'Стекло было холодным до боли. За ним — комната, стол, пустой стул и полоска света, в которой пыли было больше, чем воздуха.',
      'На миг тебе показалось, что в глубине комнаты кто-то отступил в тень ровно в тот момент, когда ты заглянул внутрь.',
      'Когда ты убрал ладонь от стекла, с внутренней стороны на том же месте остался влажный отпечаток.'
    ],
    choices: [
      { title: 'Отойти от окна', hint: 'Вернуться во двор', next: 'yard' },
      { title: 'Сразу к двери', hint: 'Больше тянуть нельзя', next: 'porch' },
    ],
  },
  letter: {
    backdrop: 'letter',
    kicker: 'Сцена III',
    title: 'Письмо',
    status: 'Текст тоже умеет выбирать за тебя',
    text: [
      'Ты развернул влажный лист.',
      '«Если услышишь меня в подвале — не верь. Когда выйдешь к развилке, иди налево».',
      'Внизу стояла дата — через три дня после смерти бабушки. Рядом были нарисованы три короткие черты и одна длинная. Под чёрными чернилами проступали более светлые строки.'
    ],
    choices: [
      {
        title: 'Поверить письму',
        hint: 'Сохранить предупреждение',
        effect: () => {
          state.trustedLetter = true;
        },
        next: 'yard',
      },
      {
        title: 'Поднести к свету',
        hint: 'Проверить скрытый слой чернил',
        effect: () => {
          state.trustedLetter = false;
          state.sawSecondHand = true;
          pickupItem('letter', 'Второй почерк', 'Под чужим текстом скрыто настоящее предупреждение бабушки.');
        },
        next: 'letterReveal',
      },
    ],
  },
  letterReveal: {
    backdrop: 'letter-reveal',
    kicker: 'Улика',
    title: 'Второй\nпочерк',
    status: 'Верхний слой написан после её смерти',
    text: [
      'Свет прошёл сквозь мокрую бумагу. Под чёрными строками проступил другой почерк — неровный и хорошо знакомый.',
      '«Если ты это читаешь, меня уже нет. Верхние строки написала не я. Оно повторяет то, что находит в памяти. Не называй его мной».',
      'Последняя строка была намного свежее остальных: «Не смотри в окно».'
    ],
    choices: [
      { title: 'Не оборачиваться', hint: 'Убрать письмо и вернуться во двор', next: 'yard' },
      { title: 'Посмотреть в окно', hint: 'Там кто-то стоит', next: 'window' },
    ],
  },
  porch: {
    backdrop: 'porch',
    kicker: 'Сцена IV',
    title: 'Крыльцо',
    status: 'Дверь еще не открыта',
    text: [
      'Ты поднялся на крыльцо. Под третьей ступенью что-то глухо щёлкнуло. В детстве она скрипела точно так же.',
      'На двери белели длинные параллельные царапины. Слишком тонкие для ножа — будто кто-то скрёб дерево ногтями, пока не перестал.',
      'Ручка не поддалась. За дверью скрипнула доска, затем такая же доска отозвалась под твоей ногой.'
    ],
    choices: [
      {
        title: 'Открыть ключом',
        hint: 'Использовать найденное',
        next: 'hall',
        disabledIf: () => !state.items.has('key'),
        disabledHint: 'Нужен ключ',
      },
      {
        title: 'Постучать',
        hint: 'Попросить дом ответить самому',
        next: 'doorFalls',
      },
      { title: 'Назад во двор', hint: 'Еще не поздно осмотреться', next: 'yard' },
    ],
  },
  doorFalls: {
    backdrop: 'door-fallen',
    kicker: 'Ответ',
    title: 'Дверь',
    status: 'Никто не подошёл с той стороны',
    text: [
      'Ты постучал три раза. Изнутри по дереву провели ногтем.',
      'Верхняя петля вышла из сгнившего косяка. За ней сорвалась нижняя, и дверь медленно легла на пол. Удара не было.',
      'Из открывшейся прихожей бабушкин голос негромко сказал: «Заходи».'
    ],
    choices: [{ title: 'Переступить порог', hint: 'Дом уже ответил', next: 'wetCoat' }],
  },
  wetCoat: {
    backdrop: 'wet-coat',
    kicker: 'Внутри',
    title: 'Мокрые\nследы',
    status: 'Ты всё ещё стоишь в своём пальто',
    text: [
      'На первом же гвозде висело мокрое пальто. Твоё — тот же цвет, та же надорванная петля у воротника.',
      'Ты коснулся собственного плеча. Пальто всё ещё было на тебе.',
      'От вещи по коридору тянулись свежие следы босых ног. Левая ступня была чуть развёрнута внутрь — совсем как твоя.'
    ],
    choices: [
      { title: 'Осмотреть пальто', hint: 'Проверить внутренний карман', next: 'coatLetter' },
      { title: 'Не прикасаться', hint: 'Пройти дальше по коридору', next: 'hall' },
    ],
  },
  coatLetter: {
    backdrop: 'wet-coat',
    kicker: 'Находка',
    title: 'Копия',
    status: 'На этот раз письмо ничего не просит',
    text: [
      'Во внутреннем кармане лежало письмо из автобуса. Совпадали все сгибы, потёртый угол и тёмное пятно от большого пальца.',
      'Ты проверил свой карман. Оригинал был там.',
      'Копия оставалась совершенно сухой, хотя с пальто продолжала капать вода.'
    ],
    choices: [{ title: 'Вернуть письмо в карман', hint: 'Не брать с собой ещё одну невозможную вещь', next: 'hall' }],
  },
  hall: {
    backdrop: 'hall',
    kicker: 'Сцена V',
    title: 'Прихожая',
    status: 'Внутри холоднее, чем снаружи',
    text: () => {
      if (state.previousScene === 'coatLetter') {
        return [
          'Ты вернул копию письма в карман мокрого пальто. Ткань сразу провисла сильнее, будто с другой стороны кармана кто-то принял его из твоих рук.',
          'Когда ты отвернулся, за спиной раздался ещё один влажный шаг. Следы на полу стали длиннее ровно на одну ступню.',
          'В глубине прихожей вниз уходила лестница. Чуть дальше темнела дверь бабушкиной комнаты, а за ней коридор расходился надвое.'
        ];
      }

      if (state.previousScene === 'wetCoat') {
        return [
          'Ты прошёл мимо пальто, стараясь не смотреть на следы. Позади вода продолжала капать, хотя сквозняка в доме не было.',
          'На третьем шаге к звуку капель добавился ещё один — тихий, босой шаг по мокрым доскам. Ты не обернулся.',
          'В глубине прихожей вниз уходила лестница. Чуть дальше темнела дверь бабушкиной комнаты, а за ней коридор расходился надвое.'
        ];
      }

      if (state.previousScene === 'porch') {
        return [
          'Ключ подошёл. Замок щёлкнул раньше, чем ты успел повернуть его до конца.',
          'В прихожей пахло мокрой древесиной и свечным дымом. Справа вниз уходила лестница. Дальше были дверь бабушкиной комнаты и коридор, уходивший в глубь дома.'
        ];
      }

      return [
        'Ты снова оказался в прихожей. Теперь она казалась уже, а потолок — немного ниже, хотя ты не мог объяснить, что именно изменилось.',
        'Лестница в подвал темнела справа. Дверь бабушкиной комнаты оставалась приоткрытой, а в глубине дома по-прежнему ждала развилка.'
      ];
    },
    choices: [
      {
        title: 'Осмотреть комнату',
        hint: 'Дверь бабушки осталась открытой',
        next: 'grandmaRoom',
        showIf: () => !state.knowsTruth,
      },
      {
        title: 'Спуститься в подвал',
        hint: state.trustedLetter ? 'Ты помнишь предупреждение, но идешь проверить' : 'Голос из темноты зовет вниз',
        next: 'cellar',
      },
      { title: 'Пройти к развилке', hint: 'Идти дальше по дому', next: 'crossroad' },
    ],
  },
  grandmaRoom: {
    backdrop: 'grandma-room',
    kicker: 'Сцена VI',
    title: 'Комната\nбабушки',
    status: 'Кто-то открывал дневник после её смерти',
    text: [
      'Кровать была заправлена. На столике лежал открытый дневник. Красная нить была продета сквозь отверстие в отмеченной странице.',
      '«Оно ничего не придумывает. Голос, лицо, вещь — всё берёт из памяти. Каждый ответ отдаёт ему ещё одну».',
      '«Имя открывает последнюю дверь. Не называй его мной. Красная нить ведёт к первому отражению. Там нужно разбить стекло».',
      'Последняя строка была подчёркнута дважды: «Чужой голос всегда ждёт ответа. Твоя мысль — нет». Конец нити тянулся со стола к щели между досками.'
    ],
    choices: [
      {
        title: 'Рассмотреть фотографию',
        hint: 'Стекло поцарапано изнутри',
        next: 'familyPhoto',
        showIf: () => !state.sawPhoto,
      },
      {
        title: 'Взять нить',
        hint: 'Последовать за ней в глубь дома',
        effect: () => {
          state.knowsTruth = true;
          pickupItem('thread', 'Красная нить', 'Один конец продет сквозь дневник. Другой уходит под пол и тянется к первому отражению.');
        },
        next: 'hall',
      },
    ],
  },
  familyPhoto: {
    backdrop: 'family-photo',
    kicker: 'Улика',
    title: 'Семейный\nснимок',
    status: 'Стекло помнит прикосновение',
    text: [
      'На снимке бабушка держала тебя за плечо. На стене за ней висели деревянная иконка и небольшое зеркало. На раме зеркала был вырезан бабушкин знак.',
      'Лицо бабушки исцарапали с внутренней стороны стекла. Бумага осталась целой.',
      'В тишине комнаты кто-то очень медленно повторил твоё детское имя.'
    ],
    choices: [{
      title: 'Положить снимок',
      hint: 'Не отвечать голосу',
      effect: () => { state.sawPhoto = true; },
      next: 'grandmaRoom',
    }],
  },
  cellar: {
    backdrop: 'cellar',
    kicker: 'Сцена VI',
    title: 'Подвал',
    status: 'Не всякое знание нужно принимать',
    text: [
      'Подвал встретил тебя влажным камнем и шепотом, в котором было слишком много ласки.',
      'Голос без тела произнёс твоё детское имя. Потом напомнил, как бабушка прятала для тебя конфеты в банке из-под чая.',
      '«Останься. Я покажу, где она». Ты попытался вспомнить цвет той банки и не смог.'
    ],
    choices: [
      {
        title: 'Слушать дальше',
        hint: 'Узнать, что он ещё помнит',
        next: 'endTrust',
      },
      {
        title: 'Подняться наверх',
        hint: state.trustedLetter || state.sawSecondHand ? 'Ты помнишь предупреждение' : 'Уйти, пока помнишь зачем',
        effect: () => { state.canReturnToHallFromCrossroad = true; },
        next: 'scare',
      },
    ],
  },
  scare: {
    backdrop: 'scare',
    kicker: '',
    title: 'Не называй\nменя',
    status: '',
    text: [''],
    choices: [],
  },
  crossroad: {
    backdrop: 'crossroad',
    kicker: 'Сцена VII',
    title: 'Развилка',
    status: () => state.items.has('thread') ? 'Красная нить уходит под плинтус' : 'Здесь заканчивается коридор',
    text: [
      'Коридор закончился пустой комнатой, из которой расходились два прохода.',
      'Из левого тянуло холодным воздухом. На косяке были нарисованы три короткие черты и одна длинная.',
      'Из правого пахло чаем и бабушкиным яблочным пирогом. Из темноты она позвала тебя детским именем.'
    ],
    choices: [
      {
        title: 'Налево',
        hint: state.trustedLetter ? 'Так было написано в письме' : 'За проходом чувствуется улица',
        next: 'endNeutral',
      },
      {
        title: 'Направо',
        hint: 'Голос обещает всё объяснить',
        next: 'endTrust',
      },
      {
        title: 'Пойти за нитью',
        hint: 'Она тянется не в один из проходов, а к стене',
        next: 'secretRoom',
        showIf: () => state.items.has('thread'),
      },
      {
        title: 'Вернуться в коридор',
        hint: 'Сначала осмотреть комнату бабушки',
        effect: () => { state.canReturnToHallFromCrossroad = false; },
        next: 'hall',
        showIf: () => state.canReturnToHallFromCrossroad,
      },
    ],
  },
  secretRoom: {
    backdrop: 'secret-room',
    kicker: 'Последняя сцена',
    title: 'Комната\nмежду стен',
    status: 'Нить привела к первому отражению',
    text: () => [
      'Нить заканчивалась на углах старого зеркала. Фотографии были прижаты к стеклу лицами внутрь. На раме повторялся знак из сарая.',
      state.sawPhoto
        ? 'Это было то самое зеркало, которое ты видел за бабушкой на снимке. Теперь в нём была её комната и фигура в твоём мокром пальто.'
        : 'Вместо твоего отражения в стекле была бабушкина комната и фигура в твоём мокром пальто.',
      'Фигура заговорила бабушкиным голосом: «Скажи, кто я. И мы уйдём вместе».'
    ],
    choices: [
      {
        title: 'Разбить зеркало',
        hint: 'Не отвечать голосу',
        next: 'mirrorBroken',
      },
      {
        title: 'Ответить: «Бабушка»',
        hint: 'Назвать фигуру в зеркале',
        next: 'endTrust',
      },
    ],
  },
  mirrorBroken: {
    backdrop: 'mirror-broken',
    kicker: 'Последняя сцена',
    title: 'Осколки',
    status: 'В доме впервые стало просто тихо',
    text: [
      'Зеркало треснуло не громче обычного стекла. Но все голоса в доме оборвались одновременно.',
      'Красные нити обмякли. Фотографии отклеились от стекла и упали лицами вверх. Царапины на них исчезли.',
      'В самом большом осколке наконец появилось твоё собственное отражение.'
    ],
    choices: [{ title: 'Выйти из комнаты', hint: 'Дом больше не удерживает тебя', next: 'exitHouse' }],
  },
  exitHouse: {
    backdrop: 'good-exit',
    kicker: 'Эпилог',
    title: 'Снаружи',
    status: 'Холодный воздух больше не кажется живым',
    text: [
      'Задняя дверь открылась от одного прикосновения. Доски, казавшиеся заколоченными, лежали на полу.',
      'На пороге лежала бабушкина деревянная иконка — та самая, что висела над её кроватью.',
      'На улице начали возвращаться настоящие воспоминания: рисунок на бабушкиной скатерти, трещина на её чашке, запах мокрых яблок в сенях. Ни одно из них не просило тебя обернуться.'
    ],
    choices: [
      {
        title: 'Поднять икону',
        hint: 'Взять с собой последнюю вещь бабушки',
        effect: () => {
          state.items.add('icon');
          renderInventory();
        },
        next: 'iconMemory',
      },
      {
        title: 'Оставить на пороге',
        hint: 'Отойти от дома и не тревожить мёртвых',
        next: 'endGood',
      },
    ],
  },
  iconMemory: {
    backdrop: 'icon-memory',
    kicker: 'Эпилог',
    title: 'Последнее\nслово',
    status: 'На этот раз ты узнал её голос',
    text: [
      'Старое дерево было таким холодным, что заболели пальцы. Затем иконка на мгновение стала тёплой.',
      'Ты вспомнил, как бабушка снимала иконку со стены, вытирала с неё пыль и возвращала на место.',
      'Потом вспомнились её слова у калитки: «Не стой на холоде. Иди». Это не был голос из дома. Никто не ждал ответа.',
      'В память возвращались обычные вещи: запах яблочного пирога, шершавая скатерть, холодная ладонь на твоём лбу.'
    ],
    choices: [{ title: 'Отойти от дома', hint: 'И только потом оглянуться', next: 'endGood' }],
  },
  endTrust: {
    backdrop: 'bad-scare',
    kicker: 'Финал I',
    title: 'Голосу поверили',
    status: 'Оно получило то, чего ждало',
    ending: true,
    text: () => state.previousScene === 'secretRoom'
      ? [
          'Ты произнёс: «Бабушка». Фигура в зеркале повернулась, и у неё оказалось твоё лицо.',
          'В памяти исчез бабушкин голос. Затем — дорога к дому, автобус и твоё собственное имя.',
          'Под утро из дома вышел человек в мокром пальто. Он закрыл дверь и пошёл к остановке.'
        ]
      : state.previousScene === 'crossroad'
        ? [
            'Ты пошёл на запах яблочного пирога. За поворотом бабушка стояла к тебе спиной.',
            '«Ты всё-таки приехал», — сказала она и попросила назвать её. Ты ответил раньше, чем вспомнил дневник.',
            'Под утро из дома вышел человек в мокром пальто. В окне за его спиной по-прежнему горел свет.'
          ]
        : [
          'Ты остался слушать. Голос назвал цвет банки из-под чая, но ты уже не мог вспомнить, был ли он зелёным на самом деле.',
          'Он задал ещё один вопрос. Ты ответил. После пятого ты забыл, зачем спустился в подвал.',
          'Утром в пустом доме горел свет. Из подвала кто-то негромко позвал тебя детским именем.'
          ],
  },
  endNeutral: {
    backdrop: 'end-neutral',
    kicker: 'Финал II',
    title: 'Выход',
    status: 'Ты спасся. Дом остался ждать',
    ending: true,
    text: [
      'Левый проход вывел к задней двери. Доски были прибиты гвоздями без шляпок; ты вытолкнул их наружу одним ударом.',
      'На пороге лежала бабушкина деревянная иконка. Та самая, что висела над её кроватью. Ты не стал её поднимать.',
      'Ты вышел и не обернулся. За спиной остались дневник, зеркало и голос, который теперь знал о тебе больше, чем до твоего приезда.'
    ],
  },
  endGood: {
    backdrop: 'end-good',
    kicker: 'Финал III',
    title: 'Тишина',
    status: 'В окне больше нет света',
    ending: true,
    text: [
      'Ты оглянулся только у поворота. Дом всё ещё стоял между лесом и дорогой, но теперь был просто старым пустым домом.',
      'В окне бабушкиной комнаты больше не было света. Ни тени. Ни чужого голоса.',
      'Ты мысленно повторил последнюю строку дневника: «Чужой голос всегда ждёт ответа. Твоя мысль — нет». На этот раз слова не требовали ответа.'
    ],
  },
  fifthPhoto01: {
    backdrop: 'fifth-photo-01',
    asset: 'assets/scenes/fifth-photo/01-arrival-v1.png',
    kicker: 'Сцена 1',
    title: 'Приезд',
    status: 'Новый дом',
    text: ['Семья приехала к новому дому. Лера фотографирует родителей и Мишу перед тем, как они заходят внутрь.'],
    choices: [{ title: 'Далее', hint: 'Зайти в дом', next: 'fifthPhoto02' }],
  },
  fifthPhoto02: {
    backdrop: 'fifth-photo-02',
    asset: 'assets/scenes/fifth-photo/02-lera-bedroom-v2.png',
    kicker: 'Сцена 2',
    title: 'Комната',
    status: 'Первый вечер',
    text: ['Лера разбирает вещи в своей новой комнате. Отец собирает мебель, родители разговаривают в коридоре.'],
    choices: [{ title: 'Далее', hint: 'Спуститься к семье', next: 'fifthPhoto03' }],
  },
  fifthPhoto03: {
    backdrop: 'fifth-photo-03',
    asset: 'assets/scenes/fifth-photo/03-dinner-v1.png',
    kicker: 'Сцена 3',
    title: 'Ужин',
    status: 'Все дома',
    text: ['Семья ужинает после переезда. Миша молча отодвигает кусок хлеба к пустому краю стола.'],
    choices: [{ title: 'Далее', hint: 'Закончить ужин', next: 'fifthPhoto04' }],
  },
  fifthPhoto04: {
    backdrop: 'fifth-photo-04',
    asset: 'assets/scenes/fifth-photo/04-empty-frame-v2.png',
    kicker: 'Сцена 4',
    title: 'Рамка',
    status: 'Оставленные вещи',
    text: ['Мать разбирает вещи прежних хозяев. Пустую деревянную рамку она оставляет на шкафу.'],
    choices: [{ title: 'Далее', hint: 'Вернуться в комнату', next: 'fifthPhoto05' }],
  },
  fifthPhoto05: {
    backdrop: 'fifth-photo-05',
    asset: 'assets/scenes/fifth-photo/05-first-night-v2.png',
    kicker: 'Сцена 5',
    title: 'Первая ночь',
    status: 'Дом затих',
    text: ['Лера лежит в новой комнате и долго не может уснуть. Фотография остаётся забытой в телефоне.'],
    choices: [{ title: 'Далее', hint: 'Дождаться утра', next: 'fifthPhoto06' }],
  },
  fifthPhoto06: {
    backdrop: 'fifth-photo-06',
    asset: 'assets/scenes/fifth-photo/06-first-morning-v1.png',
    kicker: 'Сцена 6',
    title: 'Утро',
    status: 'Обычный дом',
    text: ['Утром ночная тревога кажется глупой. Лера собирается и возвращается к домашним делам.'],
    choices: [{ title: 'Далее', hint: 'Выйти во двор', next: 'fifthPhoto07' }],
  },
  fifthPhoto07: {
    backdrop: 'fifth-photo-07',
    asset: 'assets/scenes/fifth-photo/07-yard-chores-v1.png',
    kicker: 'Сцена 7',
    title: 'Во дворе',
    status: 'Домашние дела',
    text: ['Родители занимаются хозяйством. Миша катает машинку к закрытой калитке и ждёт, будто кто-то должен вернуть её обратно.'],
    choices: [{ title: 'Далее', hint: 'Помочь матери', next: 'fifthPhoto08' }],
  },
  fifthPhoto08: {
    backdrop: 'fifth-photo-08',
    asset: 'assets/scenes/fifth-photo/08-wet-mitten-v1.png',
    kicker: 'Сцена 8',
    title: 'Варежка',
    status: 'Чужая вещь',
    text: ['Среди сухих вещей прежних хозяев Лера находит одну влажную детскую варежку. Миша говорит, что она не его.'],
    choices: [{ title: 'Далее', hint: 'Убрать находку', next: 'fifthPhoto09' }],
  },
  fifthPhoto09: {
    backdrop: 'fifth-photo-09',
    asset: 'assets/scenes/fifth-photo/09-drawing-v1.png',
    kicker: 'Сцена 9',
    title: 'Рисунок',
    status: 'Тихий вечер',
    text: ['Миша рисует новый дом. Возле калитки он долго закрашивает одно место простым карандашом.'],
    choices: [{ title: 'Далее', hint: 'Разойтись по комнатам', next: 'fifthPhoto10' }],
  },
  fifthPhoto10: {
    backdrop: 'fifth-photo-10',
    asset: 'assets/scenes/fifth-photo/10-corridor-toy-v1.png',
    kicker: 'Сцена 10',
    title: 'Коридор',
    status: 'После полуночи',
    text: ['Ночью Лера находит в пустом коридоре красную машинку Миши. Входная дверь остаётся закрытой.'],
    choices: [{ title: 'Далее', hint: 'Вернуться в комнату', next: 'fifthPhoto11' }],
  },
  fifthPhoto11: {
    backdrop: 'fifth-photo-11',
    asset: 'assets/scenes/fifth-photo/11-family-leaves-v3.png',
    kicker: 'Сцена 11',
    title: 'Одна дома',
    status: 'Следующий день',
    text: ['Родители и Миша уезжают в магазин. Лера остаётся дома одна.'],
    choices: [{ title: 'Далее', hint: 'Вернуться к книге', next: 'fifthPhoto12' }],
  },
  fifthPhoto12: {
    backdrop: 'fifth-photo-12',
    asset: 'assets/scenes/fifth-photo/12-reading-alone-v1.png',
    kicker: 'Сцена 12',
    title: 'Шаги',
    status: 'Дом должен быть пуст',
    text: ['Лера читает в гостиной. Из глубины дома доносятся несколько быстрых шагов.'],
    choices: [{ title: 'Далее', hint: 'Проверить коридор', next: 'fifthPhoto13' }],
  },
  fifthPhoto13: {
    backdrop: 'fifth-photo-13',
    asset: 'assets/scenes/fifth-photo/13-corridor-glimpse-v1.png',
    kicker: 'Сцена 13',
    title: 'Миша',
    status: 'Он уехал с родителями',
    text: ['В дальнем конце коридора пробегает мальчик, похожий на Мишу. Он исчезает за дверью раньше, чем Лера успевает рассмотреть его.'],
    choices: [{ title: 'Далее', hint: 'Пойти следом', next: 'fifthPhoto14' }],
  },
  fifthPhoto14: {
    backdrop: 'fifth-photo-14',
    asset: 'assets/scenes/fifth-photo/14-observer-drawing-v1.png',
    kicker: 'Сцена 14',
    title: 'Наблюдатель',
    status: 'В комнате никого',
    text: ['Комната оказывается пустой. На полу лежит рисунок Леры, читающей в гостиной, будто кто-то наблюдал за ней из коридора.'],
    choices: [{ title: 'Далее', hint: 'Забрать рисунок', next: 'fifthPhoto15' }],
  },
  fifthPhoto15: {
    backdrop: 'fifth-photo-15',
    asset: 'assets/scenes/fifth-photo/15-family-returns-v2.png',
    kicker: 'Сцена 15',
    title: 'Возвращение',
    status: 'Семья снова дома',
    text: ['Семья возвращается к вечеру. Миша уже вышел из машины и стоит рядом с родителями.'],
    choices: [{ title: 'Далее', hint: 'Вернуться в дом', next: 'fifthPhoto16' }],
  },
  fifthPhoto16: {
    backdrop: 'fifth-photo-16',
    asset: 'assets/scenes/fifth-photo/16-last-evening-v1.png',
    kicker: 'Сцена 16',
    title: 'Последний вечер',
    status: 'Миша ещё здесь',
    text: ['Миша играет с красной машинкой. Лера показывает ему найденный рисунок.'],
    choices: [{ title: 'Далее', hint: 'Дождаться утра', next: 'fifthPhoto17' }],
  },
  fifthPhoto17: {
    backdrop: 'fifth-photo-17',
    asset: 'assets/scenes/fifth-photo/17-empty-bed-v1.png',
    kicker: 'Сцена 17',
    title: 'Пустая кровать',
    status: 'Утро',
    text: ['Миши нет в комнате. На подушке осталась его мокрая красная машинка.'],
    choices: [{ title: 'Далее', hint: 'Позвать родителей', next: 'fifthPhoto18' }],
  },
  fifthPhoto18: {
    backdrop: 'fifth-photo-18',
    asset: 'assets/scenes/fifth-photo/18-parents-forgot-v3.png',
    kicker: 'Сцена 18',
    title: 'Разговор',
    status: 'Они не понимают',
    text: ['Родители спокойно отвечают, что никакого Миши никогда не было.'],
    choices: [{ title: 'Далее', hint: 'Проверить телефон', next: 'fifthPhoto19' }],
  },
  fifthPhoto19: {
    backdrop: 'fifth-photo-19',
    asset: 'assets/scenes/fifth-photo/19-phone-photo-v1.png',
    kicker: 'Сцена 19',
    title: 'Снимок',
    status: 'Его больше нет',
    text: ['Лера открывает фотографию в телефоне. На снимке остались только родители.'],
    choices: [{ title: 'Далее', hint: 'Найти семейную фотографию', next: 'fifthPhoto20' }],
  },
  fifthPhoto20: {
    backdrop: 'fifth-photo-20',
    asset: 'assets/scenes/fifth-photo/20-birthday-empty-chair-v2.png',
    kicker: 'Сцена 20',
    title: 'Пустой стул',
    status: 'День рождения',
    text: ['На семейной фотографии возле торта стоит пустой стул. Никто не помнит, для кого он был поставлен.'],
    choices: [{ title: 'Далее', hint: 'Спуститься к ужину', next: 'fifthPhoto21' }],
  },
  fifthPhoto21: {
    backdrop: 'fifth-photo-21',
    asset: 'assets/scenes/fifth-photo/21-dinner-without-misha-v2.png',
    kicker: 'Сцена 21',
    title: 'Ужин',
    status: 'Теперь их трое',
    text: ['Родители спокойно ужинают. Лера не притрагивается к еде.'],
    choices: [{ title: 'Далее', hint: 'Вернуться в комнату', next: 'fifthPhoto22' }],
  },
  fifthPhoto22: {
    backdrop: 'fifth-photo-22',
    asset: 'assets/scenes/fifth-photo/22-dark-bedroom-v1.png',
    kicker: 'Сцена 22',
    title: 'Ночь',
    status: 'Дом снова тих',
    text: ['Ночью дом кажется темнее. В коридоре ничего не происходит.'],
    choices: [{ title: 'К историям', hint: 'Продолжение будет позже', effect: () => openLibrary() }],
  },
};

function renderInventory() {
  const items = [...state.items];
  inventoryEl.innerHTML = items.length
    ? items.map((item) => `<span class="inventory__item">${inventoryLabels[item]}</span>`).join('')
    : '<span class="inventory__item">Инвентарь пуст</span>';
}

function hidePickup() {
  pickupEl.hidden = true;
  pickupNameEl.textContent = '';
  pickupDescEl.textContent = '';
}

function pickupItem(key, title, description) {
  state.items.add(key);
  pickupEl.hidden = false;
  pickupNameEl.textContent = title;
  pickupDescEl.textContent = description;
  renderInventory();
}

function typeText(paragraphs) {
  typingToken += 1;
  const token = typingToken;
  const fullText = paragraphs.map((p) => `<p>${p}</p>`).join('');
  const plainText = paragraphs.join('\n\n');

  textEl.innerHTML = '<span class="cursor">|</span>';

  let index = 0;
  const speed = 18;

  finishTyping = () => {
    typingToken += 1;
    textEl.innerHTML = fullText;
    finishTyping = null;
  };

  function step() {
    if (token !== typingToken) return;

    if (index >= plainText.length) {
      textEl.innerHTML = fullText;
      finishTyping = null;
      return;
    }

    const current = plainText.slice(0, index + 1)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    textEl.innerHTML = `<p>${current}</p><span class="cursor">|</span>`;
    index += 1;

    const char = plainText[index - 1];
    const delay = char === '.' || char === ',' ? speed * 3 : speed;
    setTimeout(step, delay);
  }

  step();
}

function getChoices(scene) {
  return (scene.choices || []).filter((choice) => {
    if (choice.showIf) return choice.showIf();
    return true;
  });
}

function renderChoices(scene) {
  const choices = getChoices(scene);
  choicesEl.innerHTML = '';

  choices.forEach((choice, index) => {
    const isDisabled = choice.disabledIf ? choice.disabledIf() : false;
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.disabled = isDisabled;
    button.dataset.choiceIndex = String(index + 1);
    button.setAttribute('aria-keyshortcuts', String(index + 1));

    const hint = isDisabled && choice.disabledHint ? choice.disabledHint : choice.hint;

    button.innerHTML = `
      <span class="choice__title">${choice.title}</span>
      <span class="choice__hint">${hint}</span>
    `;

    button.addEventListener('click', () => {
      if (isDisabled) return;
      if (choice.effect) choice.effect();
      if (choice.next) goTo(choice.next);
    });

    choicesEl.appendChild(button);
  });
}

function goTo(sceneKey) {
  state.previousScene = state.current;
  state.current = sceneKey;
  const scene = scenes[sceneKey];

  if (sceneKey === 'grandmaRoom') {
    state.knowsTruth = true;
  }

  document.body.classList.remove('is-bad-ending-intro', 'is-bad-ending-fade');
  document.body.classList.toggle('is-scare', sceneKey === 'scare');
  document.body.classList.toggle('is-bad-ending-intro', sceneKey === 'endTrust');

  backdropEl.dataset.scene = scene.backdrop;
  const sceneAssetUrl = getSceneAssetUrl(scene);
  backdropEl.style.backgroundImage = sceneAssetUrl ? `url('${sceneAssetUrl}')` : 'none';
  kickerEl.textContent = scene.kicker;
  statusEl.textContent = typeof scene.status === 'function' ? scene.status() : scene.status;
  titleEl.innerHTML = scene.title.replace(/\n/g, '<br>');

  const activeSceneOrder = storySceneOrders[activeStory];
  const orderIndex = activeSceneOrder.indexOf(sceneKey);
  const displayIndex = orderIndex >= 0 ? orderIndex : scene.ending ? activeSceneOrder.length : 0;
  progressBarEl.style.width = `${Math.max(7, ((displayIndex + 1) / activeSceneOrder.length) * 100)}%`;
  progressLabelEl.textContent = `${scene.kicker} · ${String(displayIndex + 1).padStart(2, '0')}`;

  if (!pickupEl.hidden && !['yard', 'letter'].includes(sceneKey)) {
    hidePickup();
  }

  typeText(typeof scene.text === 'function' ? scene.text() : scene.text);
  renderChoices(scene);
  preloadUpcomingScenes(sceneKey, scene);
  restartEl.hidden = !scene.ending;
  syncOutdoorWind(sceneKey);
  syncHouseCreaks(sceneKey);
  syncIndoorCrying(sceneKey);

  if (sceneKey === 'endNeutral') {
    playFemaleCry(0.22);
  }

  if (jumpscareScenes.has(sceneKey)) {
    playJumpscareSound();
  }

  if (sceneKey === 'scare') {
    setTimeout(() => {
      if (state.current === 'scare') goTo('crossroad');
    }, 620);
  }

  if (sceneKey === 'endTrust') {
    setTimeout(() => {
      if (state.current !== 'endTrust') return;
      document.body.classList.remove('is-bad-ending-intro');
      document.body.classList.add('is-bad-ending-fade');
    }, 1000);
  }

  if (sceneKey === 'intro' && !state.busDeparturePlayed) {
    playBusDepartureSound();
  }

  if (disturbingSoundScenes.has(sceneKey) && !state.disturbingSoundScenesPlayed.has(sceneKey)) {
    playDisturbingSound(sceneKey);
  }
}

function resetGame() {
  state.items = new Set();
  state.trustedLetter = false;
  state.knowsTruth = false;
  state.sawPhoto = false;
  state.sawSecondHand = false;
  state.busDeparturePlayed = false;
  state.disturbingSoundScenesPlayed = new Set();
  state.canReturnToHallFromCrossroad = false;
  state.previousScene = null;
  state.current = null;
  stopBusDepartureSound();
  stopDisturbingSounds();
  stopJumpscareSounds();
  stopHouseCreaks();
  stopFemaleCries();
  renderInventory();
  hidePickup();
  goTo(storyStartScenes[activeStory]);
}

function requestStoryStart(event) {
  soundPromptTrigger = event?.currentTarget || document.activeElement;
  soundIntroEl.hidden = false;
  document.body.classList.add('is-sound-prompt-open');
  enableStorySoundEl.focus({ preventScroll: true });
}

function closeSoundPrompt() {
  soundIntroEl.hidden = true;
  document.body.classList.remove('is-sound-prompt-open');
}

function dismissSoundPrompt() {
  closeSoundPrompt();
  soundPromptTrigger?.focus({ preventScroll: true });
}

function startStory(withSound = false) {
  closeSoundPrompt();
  activeStory = 'grandma';
  document.body.classList.remove('is-library-open');
  document.body.classList.remove('is-silent-story');
  storyBrandEl.innerHTML = 'Назови меня <em>бабушкой</em>';
  soundEnabled = withSound;
  ambientSoundEl.currentTime = 0;
  renderSoundState();
  if (soundEnabled) playAmbientSound();
  resetGame();
  textEl.focus({ preventScroll: true });
}

function startFifthPhotoStory() {
  closeSoundPrompt();
  activeStory = 'fifthPhoto';
  document.body.classList.remove('is-library-open');
  document.body.classList.add('is-silent-story');
  storyBrandEl.innerHTML = 'Пятый на <em>фотографии</em>';
  soundEnabled = false;
  renderSoundState();
  ambientSoundEl.pause();
  ambientSoundEl.currentTime = 0;
  stopBusDepartureSound();
  stopOutdoorWind(true);
  stopDisturbingSounds();
  stopJumpscareSounds();
  stopHouseCreaks();
  stopFemaleCries();
  resetGame();
  textEl.focus({ preventScroll: true });
}

function openLibrary() {
  typingToken += 1;
  finishTyping = null;
  document.body.classList.remove('is-scare', 'is-bad-ending-intro', 'is-bad-ending-fade');
  document.body.classList.remove('is-silent-story');
  document.body.classList.add('is-library-open');
  soundEnabled = false;
  renderSoundState();
  ambientSoundEl.pause();
  ambientSoundEl.currentTime = 0;
  stopBusDepartureSound();
  stopOutdoorWind(true);
  stopDisturbingSounds();
  stopJumpscareSounds();
  stopHouseCreaks();
  stopFemaleCries();
  window.scrollTo({ top: 0, behavior: 'auto' });
  playStoryEl.focus({ preventScroll: true });
}

restartEl.addEventListener('click', resetGame);
playStoryEl.addEventListener('click', requestStoryStart);
playStoryCardEl.addEventListener('click', requestStoryStart);
playFifthPhotoCardEl.addEventListener('click', startFifthPhotoStory);
enableStorySoundEl.addEventListener('click', () => startStory(true));
startStoryMutedEl.addEventListener('click', () => startStory(false));
soundIntroBackdropEl.addEventListener('click', dismissSoundPrompt);
backToLibraryEl.addEventListener('click', openLibrary);
soundToggleEl.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  renderSoundState();

  if (soundEnabled) {
    playAmbientSound();
    syncOutdoorWind(state.current);
    syncHouseCreaks(state.current);
    syncIndoorCrying(state.current);
  } else {
    ambientSoundEl.pause();
    stopBusDepartureSound();
    stopOutdoorWind();
    stopDisturbingSounds();
    stopJumpscareSounds();
    stopHouseCreaks();
    stopFemaleCries();
  }
});
textEl.addEventListener('click', () => finishTyping?.());
textEl.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && finishTyping) {
    event.preventDefault();
    finishTyping();
  }
});

document.addEventListener('keydown', (event) => {
  if (!soundIntroEl.hidden) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissSoundPrompt();
    }
    return;
  }

  if (document.body.classList.contains('is-library-open')) return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;

  if ((event.key === 'Enter' || event.key === ' ') && finishTyping) {
    event.preventDefault();
    finishTyping();
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    const choice = choicesEl.querySelector(`.choice[data-choice-index="${event.key}"]:not(:disabled)`);
    if (choice) {
      event.preventDefault();
      choice.click();
    }
  }
});

renderInventory();
renderSoundState();
goTo('storyPrelude');
