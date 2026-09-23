const GAME_DURATION = 240;

const GAME_KEYS = [
  'brandLabEndTime',
  'gameFinished',
  'gameStoppedAt',
  'gameFrozenSeconds',
  'gameMarketFactor',
  'participant',
  'gameMode',
  'selectedProduct',
  'brandName',
  'audience',
  'personality',
  'positioning1',
  'positioning2',
  'strategySelections',
  'strategyCost',
  'simulationCompleted',
  'gameResults',
  'timerWarnings',
  'scoreSubmitted'
];

let pendingSpeech = '';
let femaleVoice = null;


// ============================================================
// VOICE
// ============================================================

function loadFemaleVoice() {
  if (!('speechSynthesis' in window)) return;

  femaleVoice = speechSynthesis
    .getVoices()
    .find(v =>
      /female|woman|zira|susan|samantha|hazel|aria|jenny|sonia|heera|priya|siri/i
        .test(v.name)
    );

  if (femaleVoice && pendingSpeech) {
    const message = pendingSpeech;
    pendingSpeech = '';
    speak(message);
  }
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = loadFemaleVoice;
}


// ============================================================
// RESET GAME
// ============================================================

function resetGame() {
  GAME_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });
}


// ============================================================
// START NEW GAME
// ============================================================

function startNewGame() {
  resetGame();

  localStorage.setItem(
    'brandLabEndTime',
    String(Date.now() + GAME_DURATION * 1000)
  );

  localStorage.setItem(
    'gameMarketFactor',
    String(Math.floor(Math.random() * 11) - 5)
  );

  localStorage.setItem('audioEnabled', 'true');

  loadFemaleVoice();

  speak(
    'You have four minutes. Create your brand and make smart decisions.'
  );
}


// ============================================================
// FORMAT TIMER
// ============================================================

function formatTime(seconds) {
  return (
    String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' +
    String(seconds % 60).padStart(2, '0')
  );
}


// ============================================================
// TEXT TO SPEECH
// ============================================================

function speak(text) {
  if (
    localStorage.getItem('audioEnabled') === 'false' ||
    !('speechSynthesis' in window)
  ) {
    return;
  }

  loadFemaleVoice();

  if (!femaleVoice) {
    pendingSpeech = text;
    setTimeout(loadFemaleVoice, 350);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.voice = femaleVoice;
  utterance.pitch = 1.22;
  utterance.rate = 1.35;

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}


// ============================================================
// AUDIO TOGGLE
// ============================================================

function toggleAudio() {
  const on =
    localStorage.getItem('audioEnabled') === 'false';

  localStorage.setItem(
    'audioEnabled',
    String(on)
  );

  document
    .querySelectorAll('.audio-toggle')
    .forEach(button => {
      button.textContent = on
        ? '🔊 Audio on'
        : '🔇 Audio off';
    });

  if (on) {
    speak('Audio on.');
  }
}


// ============================================================
// SHOW TIMER
// ============================================================

function showTimer(seconds) {
  document
    .querySelectorAll('.game-timer')
    .forEach(element => {
      element.textContent = formatTime(seconds);

      element.classList.toggle(
        'warning',
        seconds <= 30
      );
    });
}


// ============================================================
// DISQUALIFY
// ============================================================

function disqualify() {
  if (!localStorage.getItem('gameStoppedAt')) {
    localStorage.setItem(
      'gameFinished',
      'true'
    );

    if (
      !location.pathname.endsWith(
        'disqualified.html'
      )
    ) {
      location.replace('disqualified.html');
    }
  }
}


// ============================================================
// START GAME TIMER
// ============================================================

function startGameTimer() {
  const end = Number(
    localStorage.getItem('brandLabEndTime')
  );

  if (localStorage.getItem('gameStoppedAt')) {
    showTimer(
      Number(
        localStorage.getItem(
          'gameFrozenSeconds'
        ) || 0
      )
    );

    return;
  }

  if (!end) return;

  let warned;

  try {
    warned = JSON.parse(
      localStorage.getItem(
        'timerWarnings'
      ) || '[]'
    );
  } catch {
    warned = [];
  }

  const tick = () => {

    // ----------------------------------------------------------
    // TIMER FROZEN
    // ----------------------------------------------------------

    if (localStorage.getItem('gameStoppedAt')) {

      showTimer(
        Number(
          localStorage.getItem(
            'gameFrozenSeconds'
          ) || 0
        )
      );

      clearInterval(timer);
      return;
    }


    // ----------------------------------------------------------
    // CALCULATE REMAINING TIME
    // ----------------------------------------------------------

    const seconds = Math.max(
      0,
      Math.ceil(
        (end - Date.now()) / 1000
      )
    );

    showTimer(seconds);


    // ----------------------------------------------------------
    // WARNING AUDIO
    // ----------------------------------------------------------

    const warnings = [
      [
        180,
        'Three minutes remaining. Stay focused.'
      ],
      [
        120,
        'Two minutes remaining.'
      ],
      [
        60,
        'One minute remaining. Make your final decisions.'
      ],
      [
        30,
        'Thirty seconds remaining. Time is running out.'
      ]
    ];

    warnings.forEach(
      ([mark, message]) => {

        if (
          seconds <= mark &&
          !warned.includes(mark)
        ) {
          warned.push(mark);

          localStorage.setItem(
            'timerWarnings',
            JSON.stringify(warned)
          );

          speak(message);
        }
      }
    );


    // ----------------------------------------------------------
    // TIME UP
    // ----------------------------------------------------------

    if (seconds === 0) {

      clearInterval(timer);

      speak("Time's up.");

      disqualify();
    }
  };


  tick();

  const timer = setInterval(
    tick,
    500
  );
}


// ============================================================
// STOP TIMER
// ============================================================

function stopGameTimer() {

  if (
    !localStorage.getItem(
      'gameStoppedAt'
    )
  ) {

    const seconds = Math.max(
      0,
      Math.ceil(
        (
          Number(
            localStorage.getItem(
              'brandLabEndTime'
            )
          ) - Date.now()
        ) / 1000
      )
    );

    localStorage.setItem(
      'gameFrozenSeconds',
      String(seconds)
    );

    localStorage.setItem(
      'gameStoppedAt',
      String(Date.now())
    );
  }

  showTimer(
    Number(
      localStorage.getItem(
        'gameFrozenSeconds'
      ) || 0
    )
  );
}


// ============================================================
// REQUIRE GAME DATA
// ============================================================

function requireGame(fields, redirect) {

  if (
    localStorage.getItem(
      'gameFinished'
    )
  ) {

    location.replace(
      'disqualified.html'
    );

    return false;
  }


  if (
    !fields.every(
      key => localStorage.getItem(key)
    )
  ) {

    location.replace(
      redirect
    );

    return false;
  }


  return true;
}


// ============================================================
// AUDIO BUTTON
// ============================================================

function addAudioControl() {

  const header =
    document.querySelector(
      '.topbar'
    );

  const page =
    location.pathname
      .split('/')
      .pop();


  if (
    !header ||
    page === 'leaderboard.html' ||
    document.querySelector(
      '.audio-toggle'
    )
  ) {
    return;
  }


  const button =
    document.createElement(
      'button'
    );

  button.className =
    'audio-toggle';

  button.type = 'button';

  button.textContent =
    localStorage.getItem(
      'audioEnabled'
    ) === 'false'
      ? '🔇 Audio off'
      : '🔊 Audio on';


  button.onclick =
    toggleAudio;


  header.insertBefore(
    button,
    header.querySelector(
      '.event'
    )
  );
}


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    // ----------------------------------------------------------
    // UI STYLES
    // ----------------------------------------------------------

    const uiStyle =
      document.createElement(
        'style'
      );

    uiStyle.textContent = `
      .btn {
        color: #fff;
        border: 0;
        cursor: pointer;
        font: inherit;
      }

      .choice,
      .choice span,
      .choice small {
        color: #f5f7ff !important;
        font: inherit;
      }

      .choice {
        cursor: pointer;
      }

      .audio-toggle {
        border: 1px solid #4866b8;
        border-radius: 20px;
        padding: 8px 13px;
        background: #0a1b3b;
        color: #dce7ff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 0 14px #315cff33;
      }

      .audio-toggle:hover {
        background: #132b59;
      }

      .disqualified {
        max-width: 680px;
        margin: 80px auto;
        padding: 48px 32px;
        text-align: center;
      }

      .disqualified h1 {
        font-size: clamp(42px, 8vw, 72px);
        line-height: 1.05;
        letter-spacing: -2px;
        margin: 12px 0 20px;
      }

      .disqualified p {
        color: #c4d0e9;
        line-height: 1.65;
        margin: 14px auto;
        max-width: 540px;
      }

      .disqualified .btn {
        margin-top: 14px;
      }

      .frozen-note {
        color: #aabaff;
        font-size: 12px;
        margin-top: 10px;
      }
    `;

    document.head.appendChild(
      uiStyle
    );


    // ----------------------------------------------------------
    // AUDIO CONTROL
    // ----------------------------------------------------------

    addAudioControl();


    const page =
      location.pathname
        .split('/')
        .pop();


    // ----------------------------------------------------------
    // FROZEN PAGE
    // ----------------------------------------------------------

    if (
      localStorage.getItem(
        'gameStoppedAt'
      ) &&
      ![
        'simulation.html',
        'results.html',
        'leaderboard.html',
        'disqualified.html'
      ].includes(page)
    ) {
      freezePreviousPage(page);
    }


    // ----------------------------------------------------------
    // LINK VALIDATION
    // ----------------------------------------------------------

    document.addEventListener(
      'click',
      event => {

        const link =
          event.target.closest(
            'a[href]'
          );

        if (!link) return;

        const href =
          link.getAttribute(
            'href'
          );


        // Back to main page
        if (
          href === 'index.html' &&
          page !== 'index.html'
        ) {
          resetGame();
        }


        // Identity → Strategy
        if (
          localStorage.getItem(
            'gameStoppedAt'
          ) &&
          page === 'identity.html' &&
          href === 'strategy.html'
        ) {

          event.preventDefault();
          event.stopImmediatePropagation();

          location.href =
            'strategy.html';

          return;
        }


        // Strategy → Simulation
        if (
          localStorage.getItem(
            'gameStoppedAt'
          ) &&
          page === 'strategy.html' &&
          href === 'simulation.html'
        ) {

          event.preventDefault();
          event.stopImmediatePropagation();

          location.href =
            'simulation.html';

          return;
        }


        // Brand name validation
        if (
          page === 'identity.html' &&
          href === 'strategy.html' &&
          !document
            .getElementById(
              'brandName'
            )
            .value
            .trim()
        ) {

          event.preventDefault();
          event.stopImmediatePropagation();

          alert(
            'Enter a brand name before continuing.'
          );
        }


        // Strategy validation
        if (
          page === 'strategy.html' &&
          href === 'simulation.html' &&
          !document.querySelector(
            '.strategy-card.active'
          )
        ) {

          event.preventDefault();
          event.stopImmediatePropagation();

          alert(
            'Select at least one marketing strategy before continuing.'
          );
        }
      },
      true
    );


    // ----------------------------------------------------------
    // STRATEGY OPTIONS
    // ----------------------------------------------------------

    if (page === 'strategy.html') {
      addStrategyOptions();
    }


    // ----------------------------------------------------------
    // MARKET SIMULATION
    // ----------------------------------------------------------

    if (
      page === 'simulation.html' &&
      requireGame(
        [
          'participant',
          'selectedProduct',
          'brandName',
          'audience',
          'strategySelections'
        ],
        'setup.html'
      )
    ) {

      stopGameTimer();

      speak(
        'Watch your brand enter the market.'
      );


      const complete =
        setInterval(() => {

          const button =
            document.getElementById(
              'resultsButton'
            );

          if (
            button &&
            button.style.display ===
              'inline-block'
          ) {

            localStorage.setItem(
              'simulationCompleted',
              'true'
            );

            clearInterval(
              complete
            );
          }

        }, 200);
    }


    // ----------------------------------------------------------
    // RESULTS
    // ----------------------------------------------------------

    if (
      page === 'results.html'
    ) {

      if (
        requireGame(
          ['simulationCompleted'],
          'simulation.html'
        )
      ) {

        speak(
          'Review your score and improvement areas.'
        );

        renderResults();
      }
    }


    // ----------------------------------------------------------
    // LEADERBOARD
    // ----------------------------------------------------------

    if (
      page === 'leaderboard.html'
    ) {

      if (
        requireGame(
          ['gameResults'],
          'results.html'
        )
      ) {

        renderLeaderboard();
      }
    }


    // ----------------------------------------------------------
    // PAGE DIRECTIONS
    // ----------------------------------------------------------

    const directions = {
      setup:
        'Enter your name and choose a product.',

      identity:
        'Name your brand and audience.',

      strategy:
        'Choose your marketing mix.'
    };


    const direction =
      directions[
        page.replace(
          '.html',
          ''
        )
      ];


    if (direction) {
      speak(direction);
    }
  }
);


// ============================================================
// ADD EXTRA STRATEGY OPTIONS
// ============================================================

function addStrategyOptions() {

  const grid =
    document.querySelector(
      '.strategy-grid'
    );

  if (!grid) return;


  const items = [
    [
      '🎬',
      'YouTube Shorts',
      'Reach +16',
      2200
    ],

    [
      '🎙️',
      'Podcast Sponsorship',
      'Trust +14',
      1800
    ],

    [
      '🔎',
      'Search Ads',
      'Intent +19',
      2400
    ],

    [
      '📧',
      'Email Loyalty',
      'Retention +17',
      1200
    ],

    [
      '🤝',
      'Community Partnership',
      'Trust +16',
      2000
    ],

    [
      '🛍️',
      'Pop-up Experience',
      'Engagement +22',
      3500
    ]
  ];


  items.forEach(
    ([icon, name, benefit, cost]) => {

      const card =
        document.createElement(
          'div'
        );

      card.className =
        'strategy-card';

      card.dataset.name =
        name;

      card.dataset.cost =
        cost;


      card.onclick = () =>
        toggleStrategy(card);


      card.innerHTML = `
        <div class="strategy-icon">
          ${icon}
        </div>

        <b>${name}</b>

        <span>
          ${benefit}
        </span>

        <div class="cost-line">
          <span>Cost</span>
          <b>
            ₹${cost.toLocaleString('en-IN')}
          </b>
        </div>
      `;


      grid.appendChild(card);
    }
  );


  let saved = [];

  try {
    saved = JSON.parse(
      localStorage.getItem(
        'strategySelections'
      ) || '[]'
    );
  } catch {
    saved = [];
  }


  saved.forEach(item => {

    document
      .querySelectorAll(
        '.strategy-card'
      )
      .forEach(card => {

        if (
          card.dataset.name ===
          item.name
        ) {
          card.classList.add(
            'active'
          );
        }
      });
  });


  if (
    typeof update === 'function'
  ) {
    update();
  }


  if (
    localStorage.getItem(
      'gameStoppedAt'
    )
  ) {

    document
      .querySelectorAll(
        '.strategy-card'
      )
      .forEach(card => {

        card.style.pointerEvents =
          'none';

        card.style.opacity =
          '.72';
      });
  }
}


// ============================================================
// FREEZE PREVIOUS PAGE
// ============================================================

function freezePreviousPage(page) {

  if (page === 'setup.html') {

    const input =
      document.getElementById(
        'participant'
      );

    if (input) {

      input.value =
        localStorage.getItem(
          'participant'
        ) || '';

      input.readOnly =
        true;
    }


    const product =
      localStorage.getItem(
        'selectedProduct'
      );


    document
      .querySelectorAll(
        '.grid3 .choice'
      )
      .forEach(card => {

        card.classList.toggle(
          'active',
          card.textContent.includes(
            product
          )
        );

        card.disabled = true;
      });


    document
      .querySelectorAll(
        '#individual, #group'
      )
      .forEach(card => {

        card.classList.toggle(
          'active',
          card.id.toLowerCase() ===
            String(
              localStorage.getItem(
                'gameMode'
              )
            ).toLowerCase()
        );

        card.disabled = true;
      });
  }


  if (page === 'identity.html') {

    const name =
      document.getElementById(
        'brandName'
      );

    if (name) {

      name.value =
        localStorage.getItem(
          'brandName'
        ) || '';

      name.readOnly =
        true;
    }


    [
      'position1',
      'position2'
    ].forEach(id => {

      const input =
        document.getElementById(
          id
        );

      if (input) {

        input.value =
          localStorage.getItem(
            id
          ) || input.value;

        input.disabled =
          true;
      }
    });


    const personality =
      localStorage.getItem(
        'personality'
      );

    const audience =
      localStorage.getItem(
        'audience'
      );


    document
      .querySelectorAll(
        '.pill'
      )
      .forEach(item => {

        item.classList.toggle(
          'active',
          item.textContent.includes(
            personality
          )
        );

        item.style.pointerEvents =
          'none';
      });


    document
      .querySelectorAll(
        '.grid3 .choice'
      )
      .forEach(item => {

        item.classList.toggle(
          'active',
          item.textContent.includes(
            audience ===
              'Young Professionals'
              ? 'Young Pros'
              : audience ===
                'Premium Customers'
                ? 'Premium'
                : audience ===
                  'Fitness Enthusiasts'
                  ? 'Fitness'
                  : audience
          )
        );

        item.style.pointerEvents =
          'none';
      });
  }


  const head =
    document.querySelector(
      '.page-head p'
    );


  if (
    head &&
    !document.querySelector(
      '.frozen-note'
    )
  ) {

    head.insertAdjacentHTML(
      'afterend',
      `
        <p class="frozen-note">
          Your choices and timer are frozen after market simulation.
        </p>
      `
    );
  }
}


// ============================================================
// CALCULATE RESULTS
// ============================================================

function calculateResults() {

  const product =
    localStorage.getItem(
      'selectedProduct'
    );

  const audience =
    localStorage.getItem(
      'audience'
    );

  const personality =
    localStorage.getItem(
      'personality'
    );

  const p1 =
    +localStorage.getItem(
      'positioning1'
    );

  const p2 =
    +localStorage.getItem(
      'positioning2'
    );


  let strategies = [];

  try {
    strategies = JSON.parse(
      localStorage.getItem(
        'strategySelections'
      ) || '[]'
    );
  } catch {
    strategies = [];
  }


  const names =
    strategies.map(
      x => x.name
    );


  const fit = {
    Sneakers: [
      'Students',
      'Fitness Enthusiasts'
    ],

    Coffee: [
      'Students',
      'Young Professionals'
    ],

    Perfume: [
      'Young Professionals',
      'Premium Customers'
    ],

    Chocolate: [
      'Students',
      'Families'
    ],

    Headphones: [
      'Students',
      'Young Professionals',
      'Fitness Enthusiasts'
    ],

    Skincare: [
      'Young Professionals',
      'Premium Customers',
      'Families'
    ]
  }[product] || [];


  const traits = {
    Sneakers: [
      'Energetic',
      'Bold'
    ],

    Coffee: [
      'Creative',
      'Trusted'
    ],

    Perfume: [
      'Premium',
      'Creative'
    ],

    Chocolate: [
      'Creative',
      'Trusted'
    ],

    Headphones: [
      'Bold',
      'Energetic',
      'Premium'
    ],

    Skincare: [
      'Sustainable',
      'Trusted',
      'Premium'
    ]
  }[product] || [];


  const reach =
    35 +
    strategies.filter(
      s =>
        /Instagram|Billboard|YouTube|Search|College|Pop-up/
          .test(s.name)
    ).length *
      11 +
    (fit.includes(audience)
      ? 12
      : 2);


  const trust =
    35 +
    strategies.filter(
      s =>
        /Influencer|Podcast|Community|Email/
          .test(s.name)
    ).length *
      12 +
    (traits.includes(personality)
      ? 10
      : 0);


  const appeal =
    36 +
    (traits.includes(personality)
      ? 18
      : 4) +
    (p1 > 45 && p1 < 85
      ? 8
      : 0) +
    (p2 > 35 && p2 < 90
      ? 6
      : 0);


  const engagement =
    30 +
    strategies.filter(
      s =>
        /College|Pop-up|Instagram|YouTube|Community/
          .test(s.name)
    ).length *
      13 +
    (audience === 'Students'
      ? 8
      : 3);


  const spend =
    +localStorage.getItem(
      'strategyCost'
    ) || 0;


  const efficiency =
    Math.max(
      35,
      Math.min(
        96,
        88 -
          Math.abs(
            spend - 7600
          ) /
            170 +
          (strategies.length >= 3
            ? 5
            : 0)
      )
    );


  const marketFactor =
    Number(
      localStorage.getItem(
        'gameMarketFactor'
      ) || 0
    );


  const metrics = {

    reach: Math.min(
      100,
      reach + marketFactor
    ),

    trust: Math.min(
      100,
      trust +
        Math.round(
          marketFactor / 2
        )
    ),

    appeal: Math.min(
      100,
      appeal - marketFactor
    ),

    engagement: Math.min(
      100,
      engagement + marketFactor
    ),

    efficiency:
      Math.round(efficiency)
  };


  const score =
    Math.round(
      (
        metrics.reach +
        metrics.trust +
        metrics.appeal +
        metrics.engagement +
        metrics.efficiency
      ) / 5
    );


  return {
    score,
    metrics,
    fit,
    traits,
    names,
    spend,
    marketFactor
  };
}


// ============================================================
// RENDER RESULTS
// ============================================================

function renderResults() {

  if (
    !requireGame(
      [
        'participant',
        'selectedProduct',
        'brandName',
        'audience',
        'strategySelections'
      ],
      'setup.html'
    )
  ) {
    return;
  }


  const r =
    calculateResults();


  localStorage.setItem(
    'gameResults',
    JSON.stringify(r)
  );


  submitScore(r);


  document.querySelector(
    '.score-number'
  ).innerHTML =
    `${r.score}<small>/100</small>`;


  const rows = [
    [
      'Market Reach',
      r.metrics.reach
    ],

    [
      'Customer Trust',
      r.metrics.trust
    ],

    [
      'Brand Appeal',
      r.metrics.appeal
    ],

    [
      'Engagement',
      r.metrics.engagement
    ],

    [
      'Budget Efficiency',
      r.metrics.efficiency
    ]
  ];


  document.querySelector(
    '.performance-card'
  ).innerHTML = `
    <h2 class="section-title">
      Brand Performance
    </h2>

    ${rows
      .map(
        ([label, value]) => `
          <div class="performance-row">

            <div class="performance-label">
              <span>${label}</span>
              <b>${value}</b>
            </div>

            <div class="performance-track">
              <div
                class="performance-fill"
                style="width:${value}%"
              ></div>
            </div>

          </div>
        `
      )
      .join('')}
  `;


  const weak =
    rows
      .sort(
        (a, b) => a[1] - b[1]
      )
      .slice(0, 2);


  document.querySelectorAll(
    '.insight-card'
  )[0].innerHTML = `
    <h2 class="section-title">
      Key Insights
    </h2>

    <p>
      🎯 ${
        r.fit.includes(
          localStorage.getItem(
            'audience'
          )
        )
          ? 'Your product and audience are well aligned.'
          : 'Your audience choice needs a tighter product fit.'
      }
    </p>

    <p>
      💡 ${
        r.traits.includes(
          localStorage.getItem(
            'personality'
          )
        )
          ? 'Your personality supports the product category.'
          : 'Try a personality that better supports this product.'
      }
    </p>

    <p>
      📣 ${
        r.names.length
      } selected channel${
        r.names.length === 1
          ? ''
          : 's'
      } shaped your market response.
    </p>
  `;


  document.querySelectorAll(
    '.insight-card'
  )[1].innerHTML = `
    <h2 class="section-title">
      Areas to Improve
    </h2>

    ${weak
      .map(
        ([label, value]) => `
          <p>
            ⚠ ${label} is ${value}/100 —
            add or refine strategies
            that strengthen it.
          </p>
        `
      )
      .join('')}
  `;
}


// ============================================================
// SUBMIT SCORE
// ============================================================

function submitScore(r) {

  if (
    localStorage.getItem(
      'scoreSubmitted'
    )
  ) {
    return;
  }


  const entry = {

    participant_name:
      localStorage.getItem(
        'participant'
      ),

    brand_name:
      localStorage.getItem(
        'brandName'
      ),

    product:
      localStorage.getItem(
        'selectedProduct'
      ),

    score:
      r.score,

    time_taken_seconds:
      Math.max(
        0,
        GAME_DURATION -
          Number(
            localStorage.getItem(
              'gameFrozenSeconds'
            ) || 0
          )
      )
  };


  let local = [];

  try {
    local = JSON.parse(
      localStorage.getItem(
        'brandLabLeaderboard'
      ) || '[]'
    );
  } catch {
    local = [];
  }


  local.push(entry);


  localStorage.setItem(
    'brandLabLeaderboard',
    JSON.stringify(local)
  );

  localStorage.setItem(
    'scoreSubmitted',
    'true'
  );


  fetch(
    'api/save_score.php',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        participant:
          entry.participant_name,

        brand:
          entry.brand_name,

        product:
          entry.product,

        score:
          entry.score,

        time_taken_seconds:
          entry.time_taken_seconds
      })
    }
  ).catch(() => {});
}


// ============================================================
// LEADERBOARD
// ============================================================

function paintLeaderboard(entries) {

  const body =
    document.querySelector(
      '.leaderboard-table tbody'
    );

  if (!body) return;


  body.innerHTML =
    entries
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.time_taken_seconds -
            b.time_taken_seconds
      )
      .map(
        (entry, index) => `
          <tr
            class="${
              entry.participant_name ===
              localStorage.getItem(
                'participant'
              )
                ? 'current'
                : ''
            }"
          >

            <td class="rank">
              ${index + 1}
            </td>

            <td>
              ${entry.participant_name}
            </td>

            <td>
              ${entry.brand_name}
            </td>

            <td>
              ${entry.product}
            </td>

            <td class="score">
              ${entry.score}
            </td>

            <td>
              ${formatTime(
                entry.time_taken_seconds
              )}
            </td>

          </tr>
        `
      )
      .join('');
}


function renderLeaderboard() {

  let local = [];

  try {
    local = JSON.parse(
      localStorage.getItem(
        'brandLabLeaderboard'
      ) || '[]'
    );
  } catch {
    local = [];
  }


  if (local.length) {
    paintLeaderboard(local);
  }


  fetch(
    'api/leaderboard.php'
  )
    .then(
      response =>
        response.json()
    )
    .then(data => {

      if (
        Array.isArray(
          data.entries
        ) &&
        data.entries.length
      ) {
        paintLeaderboard(
          data.entries
        );
      }

    })
    .catch(() => {});
}