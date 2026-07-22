const state = {
  items: new Set(),
  trustedLetter: false,
  knowsTruth: false,
  sawPhoto: false,
  sawSecondHand: false,
  busDeparturePlayed: false,
  disturbingSoundScenesPlayed: new Set(),
  canReturnToHallFromCrossroad: false,
  current: 'busRide',
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
const sceneIndexEl = document.getElementById('sceneIndex');
const progressBarEl = document.getElementById('progressBar');
const progressLabelEl = document.getElementById('progressLabel');
const playStoryEl = document.getElementById('playStory');
const playStoryCardEl = document.getElementById('playStoryCard');
const backToLibraryEl = document.getElementById('backToLibrary');
const ambientSoundEl = document.getElementById('ambientSound');
const busDepartureSoundEl = document.getElementById('busDepartureSound');
const outdoorWindSoundEl = document.getElementById('outdoorWindSound');
const disturbingRoomSoundEl = document.getElementById('disturbingRoomSound');
const jumpscareSoundEl = document.getElementById('jumpscareSound');
const houseCreakSoundEl = document.getElementById('houseCreakSound');
const soundToggleEl = document.getElementById('soundToggle');
const soundToggleIconEl = soundToggleEl.querySelector('.sound-toggle__icon');
const soundToggleLabelEl = soundToggleEl.querySelector('.sound-toggle__label');

let typingToken = 0;
let finishTyping = null;
let soundEnabled = true;
let busDepartureFadeTimer = null;
let busDepartureFadeFrame = null;
let windFadeFrame = null;
let windSyncToken = 0;
const activeDisturbingSounds = new Set();
const activeJumpscareSounds = new Set();
const activeHouseCreakSounds = new Set();
let houseCreakInterval = null;

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
  'endBad',
  'endNeutral',
]);

const disturbingSoundScenes = new Set(['cellar', 'secretRoom']);
const jumpscareScenes = new Set(['scare', 'endTrust']);
const indoorHouseScenes = new Set([
  'hall',
  'grandmaRoom',
  'familyPhoto',
  'cellar',
  'scare',
  'crossroad',
  'secretRoom',
  'mirrorBroken',
]);

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
  soundToggleIconEl.textContent = soundEnabled ? '◖' : '×';
  soundToggleLabelEl.textContent = soundEnabled ? 'Звук' : 'Без звука';
}

function playAmbientSound() {
  if (!soundEnabled) return;
  ambientSoundEl.play().catch(() => {
    soundEnabled = false;
    renderSoundState();
  });
}

const sceneOrder = ['busRide', 'intro', 'forestRoad', 'loopRoad', 'approach', 'yard', 'shed', 'window', 'letter', 'letterReveal', 'porch', 'doorFalls', 'hall', 'grandmaRoom', 'cellar', 'crossroad'];

// Decode scene art before it is needed so a choice never reveals a blank stage.
['bus-letter-v1.png', 'bus-stop-v1.png', 'forest-road-v1.png', 'loop-road-v1.png', 'arrival-v1.png', 'yard-v1.png', 'shed-v1.png', 'window-v1.png', 'porch-v1.png', 'door-fallen-v1.png', 'hall-v1.png', 'grandma-room-v1.png', 'family-photo-v1.png', 'letter-v1.png', 'letter-reveal-v1.png', 'cellar-v1.png', 'scare-v1.png', 'scare-bad-v1.png', 'crossroad-v1.png', 'secret-room-v1.png', 'mirror-broken-v1.png', 'end-good-v1.png', 'icon-memory-v1.png', 'house-calm-v1.png', 'end-bad-v1.png', 'end-trust-v1.png'].forEach((file) => {
  const image = new Image();
  image.src = `assets/scenes/${file}`;
});

const inventoryLabels = {
  key: 'Ключ',
  letter: 'Письмо',
  faith: 'Вера',
  thread: 'Красная нить',
  icon: 'Иконка',
};

const scenes = {
  busRide: {
    backdrop: 'bus-letter',
    kicker: 'Пролог',
    title: 'Письмо',
    status: 'До конечной осталось сорок минут',
    text: [
      'В автобусе не было никого, кроме тебя и водителя. За мокрыми окнами тянулся тёмный лес, изредка разрезанный светом фар.',
      'Конверт пришёл утром, без обратного адреса. Внутри сухим канцелярским языком сообщалось: бабушка умерла неделю назад. Дом остался заперт, вещи нужно забрать до конца месяца.',
      'Внизу была короткая приписка от руки: «Она просила, чтобы приехал именно ты». Подписи не было.'
    ],
    choices: [{ title: 'Сложить письмо', hint: 'Автобус уже замедляется', next: 'intro' }],
  },
  intro: {
    backdrop: 'bus-stop',
    kicker: 'Пролог',
    title: 'Последний\nрейс',
    status: 'Дальше только пешком',
    text: [
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
      'Свет горел в бабушкиной комнате. Электричество отключили сразу после её смерти.',
      'На мокрой земле у калитки тебя ждали следы. Твои следы. Они вели из дома.'
    ],
    choices: [{ title: 'Войти во двор', hint: 'Осмотреться до того, как стучать', next: 'yard' }],
  },
  yard: {
    backdrop: 'yard',
    kicker: 'Сцена I',
    title: 'Двор',
    status: 'Что-то ждет, пока ты сделаешь выбор',
    text: [
      'Во дворе пахло мокрой землей и старым железом.',
      'Слева на гвозде у сарая что-то поблескивало. Под окном лежал смятый конверт. На крыльце темнела дверь.',
      'Свет в доме не мерцал — он будто смотрел на тебя.'
    ],
    choices: [
      {
        title: 'Осмотреть сарай',
        hint: 'Там может быть ключ',
        effect: () => pickupItem('key', 'Старый ключ', 'Тяжелый ключ с потертой бородкой. Похоже, он подходит не к входной двери, а к чему-то внутри дома.'),
        next: 'shed',
        showIf: () => !state.items.has('key'),
      },
      {
        title: 'Поднять письмо',
        hint: 'Чужой текст на сырой бумаге',
        effect: () => pickupItem('letter', 'Письмо', 'Конверт адресован тебе. Почерк дрожащий, но уверенный, словно автор торопился и все же знал, что пишет.'),
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
      'Ключ лежал рядом с керосиновой лампой, словно их оставили для тебя.',
      'На досках повторялся один знак: три короткие черты, одна длинная. Так бабушка отмечала то, что нельзя называть вслух.',
      'За стеной дома тихо скрипнула половица.'
    ],
    choices: [{ title: 'Вернуться во двор', hint: 'Ключ уже у тебя', next: 'yard' }],
  },
  window: {
    backdrop: 'window',
    kicker: 'Сцена II',
    title: 'Окно',
    status: 'Дом замечает тебя',
    text: [
      'Стекло было холодным до боли. За ним — комната, стол, пустой стул и полоска света, в которой пыли было больше, чем воздуха.',
      'На миг тебе показалось, что в глубине комнаты кто-то отступил в тень ровно в тот момент, когда ты заглянул внутрь.',
      'Окно не дало ответа, но и не отпустило спокойно.'
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
      '«Если услышишь меня в подвале — не верь. На развилке иди налево».',
      'Внизу стояла дата — через три дня после смерти бабушки. Под чернилами что-то проступало.'
    ],
    choices: [
      {
        title: 'Поверить письму',
        hint: 'Сохранить предупреждение',
        effect: () => {
          state.trustedLetter = true;
          if (!state.items.has('faith')) {
            pickupItem('faith', 'Вера', 'Не предмет, а внутренняя опора. Иногда она работает лучше ключей.');
          }
        },
        next: 'yard',
      },
      {
        title: 'Поднести к свету',
        hint: 'Проверить скрытый слой чернил',
        effect: () => {
          state.trustedLetter = false;
          state.sawSecondHand = true;
          pickupItem('letter', 'Второй почерк', '«Я уже умерла. Оно не может выйти, пока ты не назовёшь его мной».');
        },
        next: 'letterReveal',
      },
    ],
  },
  letterReveal: {
    backdrop: 'letter-reveal',
    kicker: 'Улика',
    title: 'Второй\nпочерк',
    status: 'Эти строки писала бабушка',
    text: [
      'Свет прошёл сквозь мокрую бумагу. Под чёрными строками проступил другой почерк — неровный и хорошо знакомый.',
      '«Я уже умерла. Письмо написала не я. Оно не может выйти, пока ты сам не назовёшь его мной».',
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
      'Ты поднялся на крыльцо. Доски прогнулись так, будто узнали твой вес.',
      'На двери белели длинные параллельные царапины. Слишком тонкие для ножа — будто кто-то скрёб дерево ногтями, пока не перестал.',
      'Ручка не поддалась. За дверью было тихо, но это была не пустая тишина. Так молчат, когда прислушиваются.'
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
      'Ты постучал три раза. За дверью что-то тихо щёлкнуло.',
      'После третьего стука дверь открылась сама. Не распахнулась — полотно медленно накренилось внутрь и легло на пол целиком, будто петли просто перестали его помнить.',
      'Удара не было. Из открывшейся прихожей бабушкин голос негромко сказал: «Заходи».'
    ],
    choices: [{ title: 'Переступить порог', hint: 'Дом уже ответил', next: 'endTrust' }],
  },
  hall: {
    backdrop: 'hall',
    kicker: 'Сцена V',
    title: 'Прихожая',
    status: 'Внутри холоднее, чем снаружи',
    text: [
      'Ключ повернулся без сопротивления. Будто замок давно ждал именно тебя.',
      'Внутри пахло воском, сыростью и чем-то сладковато-гнилым. В глубине коридора вниз уходила лестница. Чуть дальше, за полуоткрытой дверью, виднелась развилка проходов.'
    ],
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
    status: 'Здесь не пахнет пылью',
    text: [
      'Кровать была заправлена. На столике лежал открытый дневник, перевязанный красной нитью.',
      '«Оно не может взять память силой. Ему нужно, чтобы ты сам назвал его мной».',
      'Нить соскользнула со стола, пересекла пол и ушла в трещину между досками.'
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
        hint: 'Запомнить правило бабушки',
        effect: () => {
          state.knowsTruth = true;
          pickupItem('thread', 'Красная нить', 'Она отмечает то, что дом хотел скрыть.');
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
      'На снимке бабушка держала тебя за плечо. Ты помнил этот день, но не помнил самой фотографии.',
      'Её лицо было исцарапано. Не бумага — внутренняя сторона стекла.',
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
      'Голос без тела предложил тебе правду: «Я скажу, где бабушка, если только останешься и дослушаешь».',
      'Чем дольше он говорил, тем меньше в тебе оставалось твоего собственного голоса.'
    ],
    choices: [
      {
        title: 'Слушать дальше',
        hint: 'Отдать внимание чужому голосу',
        next: 'endTrust',
      },
      {
        title: 'Подняться наверх',
        hint: state.items.has('faith') ? 'Сохранить себя' : 'Уйти, пока можешь',
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
    status: () => state.knowsTruth ? 'Красная нить натянулась между проходами' : 'Обе тропы выглядят одинаково неправдоподобно',
    text: [
      'Коридор закончился пустой комнатой, из которой расходились два прохода.',
      'Левый дышал сквозняком. Правый был теплее, и именно это настораживало.',
      'За стеной что-то медленно провело ногтем по дереву.'
    ],
    choices: [
      {
        title: 'Налево',
        hint: 'Выйти и не узнать всей правды',
        next: 'endNeutral',
      },
      {
        title: 'Направо',
        hint: 'Там тебя ждёт бабушкин голос',
        next: 'endTrust',
      },
      {
        title: 'Пойти за нитью',
        hint: 'В стене есть ещё одна дверь',
        next: 'secretRoom',
        showIf: () => state.knowsTruth && state.sawSecondHand,
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
    status: 'Бабушка не заперла голос. Она заперла его память',
    text: [
      'Нить заканчивалась у зеркала. К нему были привязаны фотографии, имена и чужие воспоминания.',
      'В зеркале не было твоего отражения. Только бабушкина комната и кто-то, стоящий к тебе спиной.',
      'Голос в последний раз попросил назвать его бабушкой.'
    ],
    choices: [
      {
        title: 'Разбить зеркало',
        hint: 'Не отвечать голосу',
        next: 'mirrorBroken',
      },
      {
        title: 'Ответить: «Бабушка»',
        hint: 'Позволить ей наконец выйти',
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
      'Красные нити обмякли. На пол посыпались фотографии — теперь на них были обычные лица умерших, а не их копии.',
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
      'На пороге осталась бабушкина деревянная иконка. На потемневшей от времени поверхности не было ничего необычного.',
      'За спиной ничего не закрыло дверь.'
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
      'Ты услышал бабушкин голос — не из дома и не из подвала. Он пришёл из памяти: тихий, усталый, настоящий.',
      '«Ты всё правильно сделал. Теперь иди».',
      'Вместе с теплом вернулись воспоминания о бабушке — не чужие, не подброшенные домом, а твои.'
    ],
    choices: [{ title: 'Отойти от дома', hint: 'И только потом оглянуться', next: 'endGood' }],
  },
  endBad: {
    backdrop: 'end-bad',
    kicker: 'Финал I',
    title: 'Плохой занавес',
    status: 'Дом дописал пьесу за тебя',
    ending: true,
    text: [
      'Ты сделал шаг, который хотел сделать дом, а не ты.',
      'Снаружи или внутри — уже не имело значения. Пространство сложилось, как декорация после спектакля, и оставило тебе только роль отсутствующего.',
      'Утром соседи скажут, что ночью здесь горел свет. Но никто не вспомнит, как ты вошел.'
    ],
  },
  endTrust: {
    backdrop: 'bad-scare',
    kicker: 'Финал II',
    title: 'Голосу поверили',
    status: 'Не всякая правда освобождает',
    ending: true,
    text: [
      'Ты подошел слишком близко к тому, что обещало объяснение.',
      'Голос оказался не ответом, а формой голода. Он не убил тебя сразу — он просто убедил перестать быть собой.',
      'Когда рассвело, дом был по-прежнему пуст. Но в подвале кто-то уже ждал следующего слушателя.'
    ],
  },
  endNeutral: {
    backdrop: 'end-neutral',
    kicker: 'Финал III',
    title: 'Выход',
    status: 'Ты спасся. Дом остался ждать',
    ending: true,
    text: [
      'Левая тропа вывела тебя к задней двери, заколоченной изнутри только на вид. Доска сошла легко, будто кто-то когда-то уже готовил этот путь.',
      'На пороге лежала бабушкина деревянная иконка. Не ответ, но знак, что она сопротивлялась до конца.',
      'Ты вышел в холодный воздух, и впервые за всю ночь тьма перестала казаться живой. Спектакль не закончился счастливо. Но хотя бы не доиграл тебя до конца.'
    ],
  },
  endGood: {
    backdrop: 'end-good',
    kicker: 'Истинный финал',
    title: 'Тишина',
    status: 'В окне больше нет света',
    ending: true,
    text: [
      'Ты оглянулся только у поворота. Дом всё ещё стоял между лесом и дорогой, но теперь был просто старым пустым домом.',
      'В окне бабушкиной комнаты больше не было света. Ни тени. Ни чужого голоса.',
      'И когда ты мысленно прочёл последнюю строку дневника, она прозвучала твоим собственным голосом.'
    ],
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
      goTo(choice.next);
    });

    choicesEl.appendChild(button);
  });
}

function goTo(sceneKey) {
  state.current = sceneKey;
  const scene = scenes[sceneKey];

  document.body.classList.remove('is-bad-ending-intro', 'is-bad-ending-fade');
  document.body.classList.toggle('is-scare', sceneKey === 'scare');
  document.body.classList.toggle('is-bad-ending-intro', sceneKey === 'endTrust');

  backdropEl.dataset.scene = scene.backdrop;
  kickerEl.textContent = scene.kicker;
  statusEl.textContent = typeof scene.status === 'function' ? scene.status() : scene.status;
  titleEl.innerHTML = scene.title.replace(/\n/g, '<br>');

  const orderIndex = sceneOrder.indexOf(sceneKey);
  const displayIndex = orderIndex >= 0 ? orderIndex : scene.ending ? sceneOrder.length : 0;
  sceneIndexEl.textContent = String(displayIndex).padStart(2, '0');
  progressBarEl.style.width = `${Math.max(7, ((displayIndex + 1) / (sceneOrder.length + 1)) * 100)}%`;
  progressLabelEl.textContent = `${scene.kicker} · ${String(displayIndex).padStart(2, '0')}`;

  if (!pickupEl.hidden && !['yard', 'letter'].includes(sceneKey)) {
    hidePickup();
  }

  typeText(scene.text);
  renderChoices(scene);
  restartEl.hidden = !scene.ending;
  syncOutdoorWind(sceneKey);
  syncHouseCreaks(sceneKey);

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
  stopBusDepartureSound();
  stopDisturbingSounds();
  stopJumpscareSounds();
  stopHouseCreaks();
  renderInventory();
  hidePickup();
  goTo('busRide');
}

function startStory() {
  document.body.classList.remove('is-library-open');
  soundEnabled = true;
  ambientSoundEl.currentTime = 0;
  renderSoundState();
  playAmbientSound();
  resetGame();
  textEl.focus({ preventScroll: true });
}

function openLibrary() {
  typingToken += 1;
  finishTyping = null;
  document.body.classList.remove('is-scare', 'is-bad-ending-intro', 'is-bad-ending-fade');
  document.body.classList.add('is-library-open');
  ambientSoundEl.pause();
  ambientSoundEl.currentTime = 0;
  stopBusDepartureSound();
  stopOutdoorWind(true);
  stopDisturbingSounds();
  stopJumpscareSounds();
  stopHouseCreaks();
  window.scrollTo({ top: 0, behavior: 'auto' });
  playStoryEl.focus({ preventScroll: true });
}

restartEl.addEventListener('click', resetGame);
playStoryEl.addEventListener('click', startStory);
playStoryCardEl.addEventListener('click', startStory);
backToLibraryEl.addEventListener('click', openLibrary);
soundToggleEl.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  renderSoundState();

  if (soundEnabled) {
    playAmbientSound();
    syncOutdoorWind(state.current);
    syncHouseCreaks(state.current);
  } else {
    ambientSoundEl.pause();
    stopBusDepartureSound();
    stopOutdoorWind();
    stopDisturbingSounds();
    stopJumpscareSounds();
    stopHouseCreaks();
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
goTo('busRide');
