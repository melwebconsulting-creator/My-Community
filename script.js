/**
 * ==============================================================================
 * HANGOUT + PANG FOREVER ♡
 * Main Frontend Application Script (Vanilla JavaScript - GitHub Pages Compatible)
 * Integrates with Supabase Auth, PostgreSQL, Realtime, & Storage
 * ==============================================================================
 */

(function () {
  'use strict';

  // Sound synthesis using Web Audio API (cozy cute chimes)
  let audioCtx = null;
  function playCozyChime(type = 'success') {
    const soundEnabled = document.getElementById('pref-sound-effects')?.checked ?? true;
    if (!soundEnabled) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'pop') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      // Audio playback silent fallback
    }
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '🌸' : type === 'error' ? '⚠️' : '✨';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    playCozyChime(type === 'error' ? 'pop' : 'success');

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ----------------------------------------------------------------------------
  // Application State
  // ----------------------------------------------------------------------------
  const State = {
    user: null,
    profile: null,
    isAdmin: false,
    currentView: 'home',
    activeGroupId: null,
    activeGroupData: null,
    activeConversationId: null,
    replyTargetMessage: null,
    
    // Avatar Configuration
    avatarConfig: {
      skin: '#ffe0bd',
      hair: 'bubblegum',
      hairColor: '#ffb3ba',
      eyes: 'sparkle',
      clothes: 'hoodie',
      clothesColor: '#baffc9',
      accessory: 'cat_ears',
      background: 'pastel_clouds'
    },

    // In-memory demo data (ensures the site is fully functional & tested immediately)
    groups: [
      {
        id: 'grp-1',
        name: 'The Cozy Tea Lounge',
        description: 'Sip warm tea, share calm thoughts, and discuss favorite books and relaxing moments ♡',
        category: 'General Hangout',
        icon: '🍵',
        member_count: 42,
        is_private: false,
        rules: 'Be kind, respectful, and cozy ♡'
      },
      {
        id: 'grp-2',
        name: 'Study Buddies & Lo-Fi',
        description: 'Pomodoro sessions, study goals, gentle accountability, and lo-fi beats playlists.',
        category: 'Study Buddies',
        icon: '📚',
        member_count: 68,
        is_private: false,
        rules: 'Focus sessions, support each other, share study tips.'
      },
      {
        id: 'grp-3',
        name: 'Pixel & Pastel Artists',
        description: 'A safe haven for digital artists, traditional painters, animators, and cozy doodle lovers!',
        category: 'Art and Creativity',
        icon: '🎨',
        member_count: 54,
        is_private: false,
        rules: 'Constructive feedback only, credit artists.'
      },
      {
        id: 'grp-4',
        name: 'Indie Game Sanctuary',
        description: 'Discuss cozy games (Animal Crossing, Stardew Valley, cozy RPGs) and find co-op buddies.',
        category: 'Gaming',
        icon: '🎮',
        member_count: 39,
        is_private: false,
        rules: 'No spoilers without warnings, friendly play only.'
      },
      {
        id: 'grp-5',
        name: 'Melody & Chill',
        description: 'Share ambient tracks, city pop gems, bedroom indie, and relaxing music recommendations.',
        category: 'Music',
        icon: '🎵',
        member_count: 31,
        is_private: false,
        rules: 'Share songs with links, respect musical tastes.'
      }
    ],

    myJoinedGroupIds: ['grp-1', 'grp-2'],

    chatMessages: {
      'grp-1': [
        {
          id: 'm1',
          sender_name: 'Mochi Bun',
          sender_avatar: '🐰',
          content: 'Good morning everyone! Making myself some warm matcha latte right now 🍵',
          created_at: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          is_own: false,
          reactions: { '❤️': 3, '🌸': 2 }
        },
        {
          id: 'm2',
          sender_name: 'Cloudy Bear',
          sender_avatar: '🧸',
          content: 'Matcha sounds heavenly! Don\'t forget to take cozy study breaks today.',
          created_at: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          is_own: false,
          reactions: { '✨': 4 }
        }
      ]
    },

    posts: [
      {
        id: 'p1',
        author_name: 'Luna Kitten',
        author_handle: '@lunakitten',
        author_avatar: '🐱',
        category: 'Random Thoughts',
        content: 'Gentle reminder: It is completely okay to go slow today. You are doing wonderfully just by being here and resting ♡',
        likes: 19,
        is_liked: false,
        created_at: '2 hours ago',
        comments: [
          { author: 'Mochi Bun', text: 'Thank you for this sweet reminder! Needed to read it today.' }
        ]
      },
      {
        id: 'p2',
        author_name: 'Study Owl',
        author_handle: '@studyowl',
        author_avatar: '🦉',
        category: 'Questions',
        content: 'What is your go-to cozy comfort drink when you want to unwind after a busy day? Mine is chamomile tea with honey 🍯',
        likes: 27,
        is_liked: true,
        created_at: '4 hours ago',
        comments: []
      }
    ],

    // PANG FOREVER Library
    pangTemplates: [
      {
        id: 'pang-1',
        title: 'Send a Genuine Compliment',
        description: 'Leave a heartfelt compliment on someone\'s post or send a gentle encouraging message to a friend.',
        category: 'Friendship',
        xp: 30,
        type: 'individual'
      },
      {
        id: 'pang-2',
        title: 'Share a Happy Memory',
        description: 'Write down a cozy or funny memory from your childhood or recent week that brought a smile to your face.',
        category: 'Personal',
        xp: 25,
        type: 'individual'
      },
      {
        id: 'pang-3',
        title: 'Three Grateful Moments',
        description: 'Name 3 little things that you are deeply grateful for right now (e.g. warm tea, good music, cozy blanket).',
        category: 'Personal',
        xp: 25,
        type: 'individual'
      },
      {
        id: 'pang-4',
        title: 'Sentence Without the Letter A',
        description: 'Write a funny or poetic sentence without using the letter \'A\' even once!',
        category: 'Funny Random Tasks',
        xp: 40,
        type: 'individual'
      },
      {
        id: 'pang-5',
        title: 'Invent a Brand New Holiday',
        description: 'Create a silly or lovely new holiday (e.g. International Cozy Socks Day) and how it should be celebrated.',
        category: 'Creative',
        xp: 35,
        type: 'individual'
      }
    ],

    activeMission: null,
    completedMissions: [],

    groupMissions: [
      {
        id: 'gm-1',
        group_name: 'The Cozy Tea Lounge',
        title: 'Pass-the-Story Relay',
        description: 'Each member contributes one sentence to create a whimsical cozy tale about a tea dragon.',
        target: 4,
        contributions: [
          { name: 'Mochi Bun', text: 'Once upon a misty morning, a tiny mint-colored dragon hatched inside a ceramic teapot.' },
          { name: 'Cloudy Bear', text: 'Instead of breathing fire, it sneezed fragrant cinnamon sparkles.' }
        ]
      }
    ],

    // HIGH PRIORITY Admin Registration Notifications
    adminNotifications: [
      {
        id: 'reg-notif-1',
        title: 'NEW MEMBER REGISTERED! 🎉',
        display_name: 'Mochi Bun',
        username: 'mochibun',
        email: 'mochi@example.com',
        registered_at: new Date(Date.now() - 3600000 * 3).toLocaleString(),
        verification: 'Verified',
        status: 'Active',
        is_read: false
      },
      {
        id: 'reg-notif-2',
        title: 'NEW MEMBER REGISTERED! 🎉',
        display_name: 'Cloudy Bear',
        username: 'cloudybear',
        email: 'bear@example.com',
        registered_at: new Date(Date.now() - 3600000 * 12).toLocaleString(),
        verification: 'Verified',
        status: 'Active',
        is_read: true
      }
    ],

    registeredUsers: [
      { id: 'u1', display_name: 'Mochi Bun', username: 'mochibun', email: 'mochi@example.com', joined: 'Nov 1, 2026', xp: 240, level: 3, status: 'Active' },
      { id: 'u2', display_name: 'Cloudy Bear', username: 'cloudybear', email: 'bear@example.com', joined: 'Oct 28, 2026', xp: 480, level: 5, status: 'Active' },
      { id: 'u3', display_name: 'Luna Kitten', username: 'lunakitten', email: 'luna@example.com', joined: 'Oct 30, 2026', xp: 190, level: 2, status: 'Active' }
    ],

    reports: [
      { id: 'rep-1', reporter: '@mochibun', target: 'Spam post test', reason: 'Unsolicited advertising link', status: 'Pending' }
    ],

    badges: [
      { id: 'b1', name: 'Pang Pioneer', icon: '🌟', desc: 'Completed your first cozy mission' },
      { id: 'b2', name: 'Tea Clubber', icon: '🍵', desc: 'Joined a cozy hangout circle' },
      { id: 'b3', name: 'Kind Heart', icon: '💖', desc: 'Sent compliments to friends' }
    ]
  };

  // ----------------------------------------------------------------------------
  // Navigation & View Routing
  // ----------------------------------------------------------------------------
  function navigateTo(viewName) {
    if (!viewName) viewName = 'home';
    State.currentView = viewName;

    // Update active nav links
    document.querySelectorAll('.sidebar-nav .nav-item, .mobile-bottom-nav .mobile-nav-link').forEach(link => {
      const target = link.getAttribute('data-view');
      if (target === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle views
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
      activeView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh view-specific contents
    if (viewName === 'discover') renderDiscoverGroups();
    if (viewName === 'groups') renderMyGroups();
    if (viewName === 'community') renderCommunityPosts();
    if (viewName === 'pang') renderPangView();
    if (viewName === 'avatar-studio') renderAvatarStudio();
    if (viewName === 'profile') renderProfileView();
    if (viewName === 'admin') renderAdminDashboard();
    if (viewName === 'friends') renderFriendsView();

    // Sync window hash
    if (window.location.hash !== `#${viewName}`) {
      window.location.hash = `#${viewName}`;
    }
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    navigateTo(hash);
  });

  // ----------------------------------------------------------------------------
  // Cute SVG Avatar Generator & Customizer
  // ----------------------------------------------------------------------------
  function renderSvgAvatar(config, size = 180) {
    const skin = config.skin || '#ffe0bd';
    const hairStyle = config.hair || 'bubblegum';
    const hairColor = config.hairColor || '#ffb3ba';
    const eyes = config.eyes || 'sparkle';
    const clothes = config.clothes || 'hoodie';
    const clothesColor = config.clothesColor || '#baffc9';
    const accessory = config.accessory || 'cat_ears';
    const bg = config.background || 'pastel_clouds';

    let bgContent = '';
    if (bg === 'pastel_clouds') {
      bgContent = `
        <defs>
          <linearGradient id="avatarBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffd1dc"/>
            <stop offset="100%" stop-color="#d8bbff"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="url(#avatarBgGrad)"/>
        <circle cx="50" cy="150" r="28" fill="#ffffff" opacity="0.35"/>
        <circle cx="150" cy="150" r="32" fill="#ffffff" opacity="0.35"/>
      `;
    } else if (bg === 'starlit_night') {
      bgContent = `
        <defs>
          <linearGradient id="avatarBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2d1b4e"/>
            <stop offset="100%" stop-color="#4a287a"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="url(#avatarBgGrad)"/>
        <circle cx="45" cy="55" r="2" fill="#fff" opacity="0.9"/>
        <circle cx="155" cy="45" r="2.5" fill="#fff" opacity="0.9"/>
        <circle cx="165" cy="85" r="1.5" fill="#fff" opacity="0.7"/>
      `;
    } else {
      bgContent = `<circle cx="100" cy="100" r="94" fill="#e8f5e9"/>`;
    }

    // Accessory bottom layer (e.g. cat ears behind hair)
    let accessoryBehind = '';
    if (accessory === 'cat_ears') {
      accessoryBehind = `
        <polygon points="60,65 42,28 78,48" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
        <polygon points="58,60 46,35 72,48" fill="#ffb7b2"/>
        <polygon points="140,65 158,28 122,48" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
        <polygon points="142,60 154,35 128,48" fill="#ffb7b2"/>
      `;
    } else if (accessory === 'headphones') {
      accessoryBehind = `
        <path d="M 45 105 A 58 58 0 0 1 155 105" fill="none" stroke="#60a5fa" stroke-width="7" stroke-linecap="round"/>
        <rect x="36" y="90" width="16" height="30" rx="8" fill="#93c5fd" stroke="#3b2a45" stroke-width="2"/>
        <rect x="148" y="90" width="16" height="30" rx="8" fill="#93c5fd" stroke="#3b2a45" stroke-width="2"/>
      `;
    }

    // Body & Clothes
    let clothesMarkup = '';
    if (clothes === 'hoodie') {
      clothesMarkup = `
        <path d="M 58 152 Q 100 138 142 152 L 158 200 L 42 200 Z" fill="${clothesColor}" stroke="#3b2a45" stroke-width="2.5"/>
        <path d="M 90 148 L 92 178" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 110 148 L 108 178" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="100" cy="172" r="5" fill="#f43f5e" opacity="0.8"/>
      `;
    } else if (clothes === 'sweater') {
      clothesMarkup = `
        <path d="M 56 150 Q 100 142 144 150 L 160 200 L 40 200 Z" fill="${clothesColor}" stroke="#3b2a45" stroke-width="2.5"/>
        <ellipse cx="100" cy="150" rx="20" ry="8" fill="#ffffff" opacity="0.4"/>
      `;
    } else {
      clothesMarkup = `
        <path d="M 60 152 Q 100 140 140 152 L 155 200 L 45 200 Z" fill="${clothesColor}" stroke="#3b2a45" stroke-width="2.5"/>
      `;
    }

    // Head, Cheeks & Eyes
    let eyesMarkup = '';
    if (eyes === 'sparkle') {
      eyesMarkup = `
        <circle cx="82" cy="108" r="5.5" fill="#2d283b"/>
        <circle cx="80" cy="106" r="2" fill="#ffffff"/>
        <circle cx="118" cy="108" r="5.5" fill="#2d283b"/>
        <circle cx="116" cy="106" r="2" fill="#ffffff"/>
      `;
    } else if (eyes === 'wink') {
      eyesMarkup = `
        <circle cx="82" cy="108" r="5.5" fill="#2d283b"/>
        <circle cx="80" cy="106" r="2" fill="#ffffff"/>
        <path d="M 112 108 Q 118 103 124 108" fill="none" stroke="#2d283b" stroke-width="3" stroke-linecap="round"/>
      `;
    } else {
      eyesMarkup = `
        <path d="M 76 109 Q 82 104 88 109" fill="none" stroke="#2d283b" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M 112 109 Q 118 104 124 109" fill="none" stroke="#2d283b" stroke-width="2.8" stroke-linecap="round"/>
      `;
    }

    // Hair Top & Bangs
    let hairMarkup = '';
    if (hairStyle === 'bubblegum') {
      hairMarkup = `
        <!-- Buns -->
        <circle cx="58" cy="62" r="20" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
        <circle cx="142" cy="62" r="20" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
        <!-- Bangs -->
        <path d="M 62 82 Q 100 70 138 82 Q 130 102 120 102 Q 100 90 80 102 Z" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
      `;
    } else if (hairStyle === 'fluffy_bob') {
      hairMarkup = `
        <path d="M 60 76 Q 100 52 140 76 Q 148 116 138 126 Q 100 92 62 126 Q 52 116 60 76 Z" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
      `;
    } else {
      hairMarkup = `
        <path d="M 64 80 Q 100 60 136 80 Q 144 110 132 118 Q 100 90 68 118 Z" fill="${hairColor}" stroke="#3b2a45" stroke-width="2.5"/>
      `;
    }

    // Front Accessory (Star clip / Glasses / Beret)
    let accessoryFront = '';
    if (accessory === 'star_clip') {
      accessoryFront = `
        <polygon points="68,82 72,74 76,82 66,77 78,77" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
      `;
    } else if (accessory === 'glasses') {
      accessoryFront = `
        <circle cx="82" cy="108" r="11" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
        <circle cx="118" cy="108" r="11" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
        <line x1="93" y1="108" x2="107" y2="108" stroke="#8b5cf6" stroke-width="2.5"/>
      `;
    }

    return `
      <svg viewBox="0 0 200 200" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        ${bgContent}
        ${accessoryBehind}
        ${clothesMarkup}
        <!-- Head / Face -->
        <ellipse cx="100" cy="112" rx="38" ry="34" fill="${skin}" stroke="#3b2a45" stroke-width="2.5"/>
        <!-- Soft Blush Cheeks -->
        <circle cx="74" cy="118" r="7" fill="#f43f5e" opacity="0.3"/>
        <circle cx="126" cy="118" r="7" fill="#f43f5e" opacity="0.3"/>
        <!-- Cute Smile -->
        <path d="M 95 122 Q 100 126 105 122" fill="none" stroke="#3b2a45" stroke-width="2.2" stroke-linecap="round"/>
        ${eyesMarkup}
        ${hairMarkup}
        ${accessoryFront}
      </svg>
    `;
  }

  function updateAllAvatarDisplays() {
    const svgCode = renderSvgAvatar(State.avatarConfig, 40);
    const lgSvgCode = renderSvgAvatar(State.avatarConfig, 100);

    const sidebarPreview = document.getElementById('sidebar-avatar-preview');
    if (sidebarPreview) sidebarPreview.innerHTML = svgCode;

    const profileDisplay = document.getElementById('profile-avatar-display');
    if (profileDisplay) profileDisplay.innerHTML = lgSvgCode;

    const liveStudioRender = document.getElementById('live-svg-avatar-container');
    if (liveStudioRender) liveStudioRender.innerHTML = renderSvgAvatar(State.avatarConfig, 220);
  }

  // ----------------------------------------------------------------------------
  // Avatar Studio Palette Tabs & Customizer Options
  // ----------------------------------------------------------------------------
  const avatarOptions = {
    hair: [
      { id: 'bubblegum', name: 'Twintails', icon: '🍡' },
      { id: 'fluffy_bob', name: 'Fluffy Bob', icon: '☁️' },
      { id: 'sleek', name: 'Sleek Bangs', icon: '🎀' }
    ],
    eyes: [
      { id: 'sparkle', name: 'Sparkle', icon: '✨' },
      { id: 'wink', name: 'Wink', icon: '😉' },
      { id: 'cozy_smile', name: 'Cozy Arc', icon: '😊' }
    ],
    clothes: [
      { id: 'hoodie', name: 'Cozy Hoodie', icon: '🧥' },
      { id: 'sweater', name: 'Warm Sweater', icon: '🧶' },
      { id: 'basic', name: 'Pastel Tee', icon: '👕' }
    ],
    accessory: [
      { id: 'cat_ears', name: 'Cat Ears', icon: '🐱' },
      { id: 'headphones', name: 'Headphones', icon: '🎧' },
      { id: 'star_clip', name: 'Star Clip', icon: '⭐' },
      { id: 'glasses', name: 'Cute Glasses', icon: '👓' },
      { id: 'none', name: 'None', icon: '🌸' }
    ],
    skin: [
      { id: '#ffe0bd', name: 'Cream', icon: '🧋', color: '#ffe0bd' },
      { id: '#ffd1dc', name: 'Rose', icon: '🌸', color: '#ffd1dc' },
      { id: '#f5cba7', name: 'Honey', icon: '🍯', color: '#f5cba7' },
      { id: '#d7a174', name: 'Caramel', icon: '🍪', color: '#d7a174' },
      { id: '#8d5b4c', name: 'Cocoa', icon: '🍫', color: '#8d5b4c' }
    ],
    bg: [
      { id: 'pastel_clouds', name: 'Pastel Sky', icon: '⛅' },
      { id: 'starlit_night', name: 'Starlight', icon: '🌌' },
      { id: 'mint_room', name: 'Cozy Mint', icon: '🌿' }
    ]
  };

  let activeAvatarLayer = 'hair';

  function renderAvatarStudio() {
    const grid = document.getElementById('avatar-options-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const list = avatarOptions[activeAvatarLayer] || [];
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'avatar-item-choice';
      
      const isSelected = 
        (activeAvatarLayer === 'skin' && State.avatarConfig.skin === item.id) ||
        (activeAvatarLayer === 'hair' && State.avatarConfig.hair === item.id) ||
        (activeAvatarLayer === 'eyes' && State.avatarConfig.eyes === item.id) ||
        (activeAvatarLayer === 'clothes' && State.avatarConfig.clothes === item.id) ||
        (activeAvatarLayer === 'accessory' && State.avatarConfig.accessory === item.id) ||
        (activeAvatarLayer === 'bg' && State.avatarConfig.background === item.id);

      if (isSelected) card.classList.add('selected');

      card.innerHTML = `
        <span class="item-choice-icon">${item.icon}</span>
        <span class="item-choice-name">${item.name}</span>
      `;

      card.onclick = () => {
        if (activeAvatarLayer === 'skin') State.avatarConfig.skin = item.id;
        if (activeAvatarLayer === 'hair') State.avatarConfig.hair = item.id;
        if (activeAvatarLayer === 'eyes') State.avatarConfig.eyes = item.id;
        if (activeAvatarLayer === 'clothes') State.avatarConfig.clothes = item.id;
        if (activeAvatarLayer === 'accessory') State.avatarConfig.accessory = item.id;
        if (activeAvatarLayer === 'bg') State.avatarConfig.background = item.id;

        updateAllAvatarDisplays();
        renderAvatarStudio();
        playCozyChime('pop');
      };

      grid.appendChild(card);
    });

    updateAllAvatarDisplays();
  }

  // ----------------------------------------------------------------------------
  // Communities & Group Chat
  // ----------------------------------------------------------------------------
  function renderDiscoverGroups(category = 'All') {
    const grid = document.getElementById('discover-groups-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = category === 'All' 
      ? State.groups 
      : State.groups.filter(g => g.category.toLowerCase() === category.toLowerCase());

    filtered.forEach(group => {
      const isJoined = State.myJoinedGroupIds.includes(group.id);
      const card = document.createElement('div');
      card.className = 'group-card';
      card.innerHTML = `
        <div>
          <div class="group-card-header">
            <div class="group-icon-avatar">${group.icon}</div>
            <div class="group-title-group">
              <h3>${escapeHtml(group.name)}</h3>
              <div class="group-category-unboxed">${group.category}</div>
            </div>
          </div>
          <p class="group-card-desc">${escapeHtml(group.description)}</p>
        </div>
        <div class="group-card-footer">
          <span class="group-member-count">${group.member_count} members</span>
          <button class="btn-sm-primary" data-grp-id="${group.id}">
            ${isJoined ? 'Open Chat →' : '+ Join Group'}
          </button>
        </div>
      `;

      card.querySelector('button').onclick = () => {
        if (!isJoined) {
          State.myJoinedGroupIds.push(group.id);
          group.member_count++;
          showToast(`Joined ${group.name}! Welcome to the circle ♡`, 'success');
        }
        openGroupChat(group.id);
      };

      grid.appendChild(card);
    });
  }

  function renderFeaturedHomeGroups() {
    const grid = document.getElementById('home-featured-groups-grid');
    if (!grid) return;
    grid.innerHTML = '';

    State.groups.slice(0, 3).forEach(group => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.innerHTML = `
        <div>
          <div class="group-card-header">
            <div class="group-icon-avatar">${group.icon}</div>
            <div class="group-title-group">
              <h3>${escapeHtml(group.name)}</h3>
              <div class="group-category-unboxed">${group.category}</div>
            </div>
          </div>
          <p class="group-card-desc">${escapeHtml(group.description)}</p>
        </div>
        <div class="group-card-footer">
          <span class="group-member-count">${group.member_count} members</span>
          <button class="btn-sm-primary" data-grp-id="${group.id}">Enter Circle →</button>
        </div>
      `;
      card.querySelector('button').onclick = () => openGroupChat(group.id);
      grid.appendChild(card);
    });
  }

  function renderMyGroups() {
    const grid = document.getElementById('my-groups-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const joined = State.groups.filter(g => State.myJoinedGroupIds.includes(g.id));
    if (joined.length === 0) {
      grid.innerHTML = `<div class="cozy-info-box">You haven't joined any groups yet! Visit Discover to find a cozy community.</div>`;
      return;
    }

    joined.forEach(group => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.innerHTML = `
        <div>
          <div class="group-card-header">
            <div class="group-icon-avatar">${group.icon}</div>
            <div class="group-title-group">
              <h3>${escapeHtml(group.name)}</h3>
              <div class="group-category-unboxed">${group.category}</div>
            </div>
          </div>
          <p class="group-card-desc">${escapeHtml(group.description)}</p>
        </div>
        <div class="group-card-footer">
          <span class="group-member-count">${group.member_count} members</span>
          <button class="btn-sm-primary" data-grp-id="${group.id}">Open Chat →</button>
        </div>
      `;
      card.querySelector('button').onclick = () => openGroupChat(group.id);
      grid.appendChild(card);
    });
  }

  function openGroupChat(groupId) {
    State.activeGroupId = groupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;

    State.activeGroupData = group;

    document.getElementById('groups-list-container').classList.add('hidden');
    document.getElementById('group-chat-room').classList.remove('hidden');

    document.getElementById('chat-group-name').textContent = group.name;
    document.getElementById('chat-group-category').textContent = group.category;
    document.getElementById('chat-member-count').textContent = `${group.member_count} members`;
    document.getElementById('chat-group-rules-preview').textContent = group.rules;

    navigateTo('groups');
    renderChatMessages(groupId);
  }

  function renderChatMessages(groupId) {
    const stream = document.getElementById('chat-messages-stream');
    if (!stream) return;
    stream.innerHTML = '';

    const messages = State.chatMessages[groupId] || [];
    if (messages.length === 0) {
      stream.innerHTML = `<div class="cozy-info-box" style="margin: auto;">No messages yet! Say hello to start the cozy conversation ♡</div>`;
      return;
    }

    messages.forEach(msg => {
      const row = document.createElement('div');
      row.className = `chat-message-row ${msg.is_own ? 'is-own' : ''}`;
      
      let reactionsHtml = '';
      if (msg.reactions) {
        reactionsHtml = Object.entries(msg.reactions).map(([emoji, count]) => `
          <button class="reaction-chip" data-msg-id="${msg.id}" data-emoji="${emoji}">
            <span>${emoji}</span>
            <span>${count}</span>
          </button>
        `).join('');
      }

      let imageHtml = '';
      if (msg.image_url) {
        imageHtml = `<img src="${escapeHtml(msg.image_url)}" alt="Chat attachment" class="msg-image-attachment" />`;
      }

      row.innerHTML = `
        <div class="msg-avatar">${msg.sender_avatar || '🌸'}</div>
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-author">${escapeHtml(msg.sender_name)}</span>
            <span aria-hidden="true">·</span>
            <span class="msg-time">${msg.created_at}</span>
          </div>
          <div class="msg-bubble">${escapeHtml(msg.content)}${imageHtml}</div>
          <div class="msg-reactions-row">
            ${reactionsHtml}
            <button class="btn-icon-subtle reaction-trigger-btn" data-msg-id="${msg.id}" title="Add reaction">+</button>
          </div>
        </div>
      `;

      // Reaction toggle handler
      row.querySelectorAll('.reaction-chip').forEach(btn => {
        btn.onclick = () => {
          const emoji = btn.getAttribute('data-emoji');
          msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
          renderChatMessages(groupId);
          playCozyChime('pop');
        };
      });

      row.querySelector('.reaction-trigger-btn').onclick = () => {
        const defaultEmoji = '❤️';
        msg.reactions = msg.reactions || {};
        msg.reactions[defaultEmoji] = (msg.reactions[defaultEmoji] || 0) + 1;
        renderChatMessages(groupId);
        playCozyChime('pop');
      };

      stream.appendChild(row);
    });

    stream.scrollTop = stream.scrollHeight;
  }

  function sendChatMessage() {
    const textarea = document.getElementById('chat-input-textarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text || !State.activeGroupId) return;

    const newMsg = {
      id: 'msg-' + Date.now(),
      sender_name: State.profile?.display_name || 'Cozy Friend',
      sender_avatar: '🐰',
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_own: true,
      reactions: {}
    };

    if (!State.chatMessages[State.activeGroupId]) {
      State.chatMessages[State.activeGroupId] = [];
    }
    State.chatMessages[State.activeGroupId].push(newMsg);

    textarea.value = '';
    renderChatMessages(State.activeGroupId);
    playCozyChime('pop');

    // Supabase Realtime synchronization if configured
    const client = window.HangoutConfig?.getClient();
    if (client && State.user) {
      client.from('messages').insert({
        group_id: State.activeGroupId,
        sender_id: State.user.id,
        content: text
      }).then(({ error }) => {
        if (error) console.error('Error inserting message to Supabase:', error);
      });
    }
  }

  // ----------------------------------------------------------------------------
  // PANG FOREVER ♡ Signature Task Engine & Gamification
  // ----------------------------------------------------------------------------
  function renderPangView() {
    if (!State.activeMission) {
      rollRandomMission();
    }
    renderActiveMissionCard();
    renderGroupChallenges();
    renderMissionHistory();
    renderLeaderboard();
  }

  function rollRandomMission() {
    const list = State.pangTemplates;
    const randomIdx = Math.floor(Math.random() * list.length);
    State.activeMission = list[randomIdx];
  }

  function renderActiveMissionCard() {
    const m = State.activeMission;
    if (!m) return;

    document.getElementById('mission-category').textContent = m.category;
    document.getElementById('mission-xp-badge').textContent = `+${m.xp} XP`;
    document.getElementById('mission-title').textContent = m.title;
    document.getElementById('mission-desc').textContent = m.description;
    document.getElementById('mission-answer-input').value = '';
  }

  function completeActiveMission() {
    const m = State.activeMission;
    if (!m) return;

    const answer = document.getElementById('mission-answer-input').value.trim();

    // Award XP and calculate rank
    if (!State.profile) {
      State.profile = { display_name: 'Cozy Friend', xp: 0, level: 1, friendship_points: 0 };
    }
    State.profile.xp = (State.profile.xp || 0) + m.xp;
    State.profile.friendship_points = (State.profile.friendship_points || 0) + 15;
    State.profile.level = Math.max(1, Math.floor(Math.sqrt(State.profile.xp / 50)) + 1);

    // Save to history
    State.completedMissions.unshift({
      title: m.title,
      category: m.category,
      xp: m.xp,
      answer: answer || 'Completed with warmth ♡',
      completed_at: new Date().toLocaleDateString()
    });

    // Update UI widgets
    updateUserWidgets();

    // Trigger celebration confetti
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffb7b2', '#c7ceea', '#b5ead7', '#ffdac1']
      });
    }

    // Show celebration modal
    document.getElementById('celebration-xp-text').textContent = `+${m.xp} XP Earned!`;
    document.getElementById('celebration-overlay').classList.remove('hidden');
    playCozyChime('success');

    // Roll new mission for next time
    rollRandomMission();
  }

  function renderGroupChallenges() {
    const container = document.getElementById('group-missions-grid');
    if (!container) return;
    container.innerHTML = '';

    State.groupMissions.forEach(gm => {
      const count = gm.contributions.length;
      const pct = Math.min(100, Math.round((count / gm.target) * 100));

      const card = document.createElement('div');
      card.className = 'group-mission-card';
      
      const contribsList = gm.contributions.map(c => `
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
          <strong>${escapeHtml(c.name)}:</strong> "${escapeHtml(c.text)}"
        </div>
      `).join('');

      card.innerHTML = `
        <div>
          <span class="mission-category-tag">${escapeHtml(gm.group_name)}</span>
          <h3 style="font-size: 18px; margin: 6px 0;">${escapeHtml(gm.title)}</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">${escapeHtml(gm.description)}</p>
          
          <div class="contrib-progress-wrap">
            <div class="contrib-progress-text">
              <span>Goal: ${gm.target} member sentences</span>
              <span>${count} / ${gm.target} completed</span>
            </div>
            <div class="xp-bar-bg">
              <div class="xp-bar-fill" style="width: ${pct}%"></div>
            </div>
          </div>

          <div style="background-color: var(--bg-surface-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
            ${contribsList}
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <input type="text" id="gm-input-${gm.id}" placeholder="Add your one sentence..." style="flex:1; padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: 13px;" />
          <button class="btn-primary" data-gm-id="${gm.id}" style="padding: 8px 16px; font-size: 13px;">Contribute</button>
        </div>
      `;

      card.querySelector('button').onclick = () => {
        const input = document.getElementById(`gm-input-${gm.id}`);
        const text = input ? input.value.trim() : '';
        if (!text) return;

        gm.contributions.push({
          name: State.profile?.display_name || 'Cozy Friend',
          text: text
        });

        showToast('Thank you for contributing to the group challenge! ♡', 'success');
        renderGroupChallenges();
      };

      container.appendChild(card);
    });
  }

  function renderMissionHistory() {
    const list = document.getElementById('mission-history-list');
    if (!list) return;
    list.innerHTML = '';

    if (State.completedMissions.length === 0) {
      list.innerHTML = `<div class="cozy-info-box">No missions completed yet. Try your first mission today!</div>`;
      return;
    }

    State.completedMissions.forEach(m => {
      const item = document.createElement('div');
      item.className = 'post-card';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span class="mission-category-tag">${m.category}</span>
          <span style="font-size: 12px; color: var(--text-muted);">${m.completed_at}</span>
        </div>
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${escapeHtml(m.title)}</h3>
        <p style="font-size: 14px; color: var(--text-main); font-style: italic;">"${escapeHtml(m.answer)}"</p>
        <div style="margin-top: 10px; font-size: 12px; font-weight: 700; color: #b45309;">+${m.xp} XP Claimed</div>
      `;
      list.appendChild(item);
    });
  }

  function renderLeaderboard() {
    const container = document.getElementById('leaderboard-table-container');
    if (!container) return;

    const sortedUsers = [...State.registeredUsers].sort((a, b) => b.xp - a.xp);

    let rowsHtml = sortedUsers.map((u, i) => `
      <tr>
        <td style="font-weight: 700;">#${i + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>🌸</span>
            <div>
              <div style="font-weight: 600;">${escapeHtml(u.display_name)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">@${escapeHtml(u.username)}</div>
            </div>
          </div>
        </td>
        <td>Level ${u.level}</td>
        <td class="tabular-nums font-bold" style="color: var(--accent-primary);">${u.xp} XP</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Member</th>
            <th>Level</th>
            <th>Experience Points</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // ----------------------------------------------------------------------------
  // Community Feed & Social Posts
  // ----------------------------------------------------------------------------
  function renderCommunityPosts(filterCat = 'All') {
    const stream = document.getElementById('community-posts-stream');
    if (!stream) return;
    stream.innerHTML = '';

    const list = filterCat === 'All' 
      ? State.posts 
      : State.posts.filter(p => p.category === filterCat);

    list.forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';

      let commentsHtml = '';
      if (post.comments && post.comments.length > 0) {
        commentsHtml = post.comments.map(c => `
          <div style="font-size: 13px; margin-top: 8px; padding-left: 12px; border-left: 2px solid var(--border-subtle);">
            <strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}
          </div>
        `).join('');
      }

      card.innerHTML = `
        <div class="post-header">
          <div class="post-author-lockup">
            <div class="post-avatar">${post.author_avatar}</div>
            <div>
              <div class="post-author-name">${escapeHtml(post.author_name)}</div>
              <div class="post-meta-sub">${post.author_handle} · ${post.created_at}</div>
            </div>
          </div>
          <span class="group-category-unboxed">${post.category}</span>
        </div>
        <div class="post-content-text">${escapeHtml(post.content)}</div>
        <div class="post-actions-bar">
          <button class="post-action-btn ${post.is_liked ? 'liked' : ''}" data-action="like">
            <span>${post.is_liked ? '❤️' : '🤍'}</span>
            <span>${post.likes}</span>
          </button>
          <button class="post-action-btn" data-action="comment">
            <span>💬</span>
            <span>${post.comments.length} Comments</span>
          </button>
          <button class="post-action-btn" data-action="share">
            <span>✨</span>
            <span>Share</span>
          </button>
        </div>
        <div class="post-comments-section" style="margin-top: 10px;">
          ${commentsHtml}
        </div>
      `;

      card.querySelector('[data-action="like"]').onclick = () => {
        post.is_liked = !post.is_liked;
        post.likes += post.is_liked ? 1 : -1;
        renderCommunityPosts(filterCat);
        playCozyChime('pop');
      };

      stream.appendChild(card);
    });
  }

  function renderRecentHomePosts() {
    const list = document.getElementById('home-recent-posts-list');
    if (!list) return;
    list.innerHTML = '';

    State.posts.slice(0, 2).forEach(post => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.innerHTML = `
        <div class="post-header">
          <div class="post-author-lockup">
            <div class="post-avatar">${post.author_avatar}</div>
            <div>
              <div class="post-author-name">${escapeHtml(post.author_name)}</div>
              <div class="post-meta-sub">${post.created_at}</div>
            </div>
          </div>
          <span class="group-category-unboxed">${post.category}</span>
        </div>
        <div class="post-content-text">${escapeHtml(post.content)}</div>
      `;
      list.appendChild(card);
    });
  }

  // ----------------------------------------------------------------------------
  // Friends View
  // ----------------------------------------------------------------------------
  function renderFriendsView() {
    const grid = document.getElementById('friends-card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    State.registeredUsers.forEach(friend => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.innerHTML = `
        <div class="group-card-header">
          <div class="avatar-circle-sm" style="font-size: 20px;">🌸</div>
          <div>
            <h3>${escapeHtml(friend.display_name)}</h3>
            <div class="group-category-unboxed">@${escapeHtml(friend.username)}</div>
          </div>
        </div>
        <div class="group-card-footer">
          <span style="font-size: 12px; color: var(--text-muted);">Level ${friend.level}</span>
          <button class="btn-sm-primary" onclick="window.HangoutApp.startDirectMessage('${friend.username}')">Message</button>
        </div>
      `;
      grid.appendChild(card);
    });

    document.getElementById('friends-count-num').textContent = State.registeredUsers.length;
  }

  // ----------------------------------------------------------------------------
  // Profile View
  // ----------------------------------------------------------------------------
  function renderProfileView() {
    if (!State.profile) {
      State.profile = {
        display_name: 'Cozy Friend',
        username: 'friend',
        bio: 'Hello! I just joined HANGOUT ♡ Let\'s be friends!',
        xp: 150,
        level: 2,
        friendship_points: 40
      };
    }

    document.getElementById('profile-display-name-text').textContent = State.profile.display_name;
    document.getElementById('profile-username-text').textContent = `@${State.profile.username || 'friend'}`;
    document.getElementById('profile-bio-text').textContent = State.profile.bio;
    document.getElementById('profile-level-num').textContent = `Level ${State.profile.level}`;
    document.getElementById('profile-xp-num').textContent = `${State.profile.xp} XP`;
    document.getElementById('profile-fp-num').textContent = State.profile.friendship_points;
    document.getElementById('profile-tasks-done-num').textContent = State.completedMissions.length;

    // Render Badges
    const badgesGrid = document.getElementById('profile-badges-shelf');
    if (badgesGrid) {
      badgesGrid.innerHTML = '';
      State.badges.forEach(b => {
        const item = document.createElement('div');
        item.className = 'badge-item-card';
        item.innerHTML = `
          <div class="badge-item-icon">${b.icon}</div>
          <div class="badge-item-title">${escapeHtml(b.name)}</div>
          <div class="badge-item-desc">${escapeHtml(b.desc)}</div>
        `;
        badgesGrid.appendChild(item);
      });
    }

    updateAllAvatarDisplays();
  }

  function updateUserWidgets() {
    if (!State.profile) return;
    document.getElementById('sidebar-display-name').textContent = State.profile.display_name;
    document.getElementById('sidebar-user-level').textContent = `Level ${State.profile.level} · ${State.profile.xp} XP`;
    const nextLevelXp = (State.profile.level + 1) * 100;
    const progress = Math.min(100, Math.round((State.profile.xp / nextLevelXp) * 100));
    document.getElementById('sidebar-xp-progress').style.width = `${progress}%`;
  }

  // ----------------------------------------------------------------------------
  // OWNER ADMIN DASHBOARD & HIGH PRIORITY REGISTRATION NOTIFICATIONS
  // ----------------------------------------------------------------------------
  function renderAdminDashboard() {
    // Render Stats KPIs
    document.getElementById('adm-kpi-total-users').textContent = State.registeredUsers.length;
    document.getElementById('adm-kpi-total-groups').textContent = State.groups.length;
    document.getElementById('adm-kpi-completed-tasks').textContent = 480 + State.completedMissions.length;

    renderAdminRegistrationNotifications();
    renderAdminUsersTable();
    renderAdminTasksTable();
    renderAdminModeration();
  }

  function renderAdminRegistrationNotifications() {
    const list = document.getElementById('admin-registration-notifications-list');
    const overviewList = document.getElementById('admin-overview-reg-alerts');
    if (!list) return;

    list.innerHTML = '';
    if (overviewList) overviewList.innerHTML = '';

    const unreadCount = State.adminNotifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('admin-unread-badge');
    const regBadge = document.getElementById('admin-reg-badge');
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
      if (regBadge) {
        regBadge.textContent = unreadCount;
        regBadge.classList.remove('hidden');
      }
    } else {
      badge.classList.add('hidden');
      if (regBadge) regBadge.classList.add('hidden');
    }

    State.adminNotifications.forEach(notif => {
      const card = document.createElement('div');
      card.className = `reg-alert-card ${notif.is_read ? '' : 'unread'}`;
      card.innerHTML = `
        <div class="reg-card-left">
          <span class="reg-badge-icon">🎉</span>
          <div>
            <div class="reg-name">${escapeHtml(notif.display_name)}</div>
            <div class="reg-username">@${escapeHtml(notif.username)} · ${escapeHtml(notif.email)}</div>
            <div class="reg-meta-details">
              Registered: ${notif.registered_at} · Verification: <strong>${notif.verification}</strong> · Status: ${notif.status}
            </div>
          </div>
        </div>
        <div>
          ${notif.is_read 
            ? '<span style="font-size: 12px; color: var(--text-light);">Read</span>' 
            : `<button class="btn-sm-primary mark-read-btn" data-id="${notif.id}">Mark as Read</button>`}
        </div>
      `;

      const btn = card.querySelector('.mark-read-btn');
      if (btn) {
        btn.onclick = () => {
          notif.is_read = true;
          renderAdminRegistrationNotifications();
        };
      }

      list.appendChild(card);
      if (overviewList) {
        overviewList.appendChild(card.cloneNode(true));
      }
    });
  }

  function renderAdminUsersTable() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    State.registeredUsers.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(u.display_name)}</strong><br/>
          <span style="font-size: 11px; color: var(--text-muted);">@${escapeHtml(u.username)}</span>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.joined}</td>
        <td>Level ${u.level} (${u.xp} XP)</td>
        <td><span style="color: var(--accent-mint); font-weight: 600;">${u.status}</span></td>
        <td>
          <button class="btn-subtle" onclick="window.HangoutApp.toggleUserStatus('${u.id}')">
            ${u.status === 'Active' ? 'Suspend' : 'Reactivate'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderAdminTasksTable() {
    const tbody = document.getElementById('admin-tasks-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    State.pangTemplates.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(t.title)}</strong><br/>
          <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(t.description)}</span>
        </td>
        <td>${t.category}</td>
        <td>${t.type}</td>
        <td>+${t.xp} XP</td>
        <td><span style="color: var(--status-active); font-weight: 600;">Active</span></td>
        <td>
          <button class="btn-subtle text-danger" onclick="window.HangoutApp.deleteTaskTemplate('${t.id}')">Remove</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderAdminModeration() {
    const stream = document.getElementById('admin-reports-stream');
    if (!stream) return;
    stream.innerHTML = '';

    State.reports.forEach(r => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <strong>Reported Target: ${escapeHtml(r.target)}</strong>
          <span style="color: #f87171; font-weight: 700;">${r.status}</span>
        </div>
        <p style="font-size: 13px; margin: 8px 0; color: var(--text-muted);">Reason: "${escapeHtml(r.reason)}" reported by ${r.reporter}</p>
        <div style="display: flex; gap: 8px;">
          <button class="btn-sm-primary" onclick="window.HangoutApp.resolveReport('${r.id}', 'dismissed')">Dismiss Report</button>
          <button class="btn-subtle text-danger" onclick="window.HangoutApp.resolveReport('${r.id}', 'removed')">Remove Content</button>
        </div>
      `;
      stream.appendChild(card);
    });
  }

  // ----------------------------------------------------------------------------
  // Supabase Authentication & Realtime Listeners
  // ----------------------------------------------------------------------------
  async function initSupabaseSession() {
    const client = window.HangoutConfig?.getClient();
    const statusBtn = document.getElementById('btn-db-status');
    const pill = document.getElementById('supabase-status-pill');

    if (!client) {
      if (statusBtn) {
        statusBtn.innerHTML = `<span class="status-dot status-offline"></span><span class="status-label">Demo Mode</span>`;
      }
      if (pill) {
        pill.className = 'pill-indicator offline';
        pill.textContent = 'Status: Demo Mode (Offline Storage)';
      }
      return;
    }

    if (statusBtn) {
      statusBtn.innerHTML = `<span class="status-dot status-online"></span><span class="status-label">Supabase Connected</span>`;
    }
    if (pill) {
      pill.className = 'pill-indicator online';
      pill.textContent = 'Status: Connected to Supabase';
    }

    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        handleUserSignedIn(session.user);
      }

      // Listen for auth changes
      client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          handleUserSignedIn(session.user);
        } else {
          handleUserSignedOut();
        }
      });

      // Subscribe to Realtime Admin Registration Notifications
      client
        .channel('admin-registrations-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, payload => {
          console.log('🎉 New Admin Notification received via Supabase Realtime:', payload);
          const newNotif = {
            id: payload.new.id,
            title: payload.new.title,
            display_name: payload.new.data?.display_name || 'New Member',
            username: payload.new.data?.username || 'member',
            email: payload.new.data?.email || '',
            registered_at: new Date(payload.new.created_at).toLocaleString(),
            verification: payload.new.data?.email_confirmed ? 'Verified' : 'Pending',
            status: 'Active',
            is_read: false
          };
          State.adminNotifications.unshift(newNotif);
          renderAdminRegistrationNotifications();
          showToast(`NEW MEMBER: ${newNotif.display_name} (@${newNotif.username}) just registered!`, 'success');
        })
        .subscribe();

    } catch (err) {
      console.error('Supabase init error:', err);
    }
  }

  async function handleUserSignedIn(user) {
    State.user = user;
    const client = window.HangoutConfig?.getClient();

    // Check if user has admin role
    if (client) {
      const { data: roles } = await client.from('user_roles').select('role').eq('user_id', user.id);
      if (roles && roles.some(r => r.role === 'admin')) {
        State.isAdmin = true;
      }

      // Load profile
      const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        State.profile = profile;
        if (profile.avatar_config) {
          State.avatarConfig = profile.avatar_config;
        }
      }
    }

    if (!State.profile) {
      State.profile = {
        display_name: user.user_metadata?.display_name || 'Cozy Friend',
        username: user.user_metadata?.username || 'friend',
        bio: 'Hello! I just joined HANGOUT ♡ Let\'s be friends!',
        xp: 0,
        level: 1,
        friendship_points: 0
      };
    }

    // Update Topbar Auth section
    const authSec = document.getElementById('topbar-auth-section');
    if (authSec) {
      authSec.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="window.HangoutApp.navigateTo('profile')">
          <span style="font-size: 13px; font-weight: 600;">${escapeHtml(State.profile.display_name)}</span>
          <div class="avatar-circle-sm">🌸</div>
        </div>
      `;
    }

    // Toggle Admin navigation item
    if (State.isAdmin) {
      document.querySelectorAll('.admin-only-item, #btn-admin-nav').forEach(el => el.classList.remove('hidden'));
    }

    document.getElementById('sidebar-user-card')?.classList.remove('hidden');
    updateUserWidgets();
    updateAllAvatarDisplays();
  }

  function handleUserSignedOut() {
    State.user = null;
    State.profile = null;
    State.isAdmin = false;

    const authSec = document.getElementById('topbar-auth-section');
    if (authSec) {
      authSec.innerHTML = `<button id="btn-open-login" class="btn-primary-pill" onclick="window.HangoutApp.openAuthModal('login')">Log In</button>`;
    }

    document.querySelectorAll('.admin-only-item, #btn-admin-nav').forEach(el => el.classList.add('hidden'));
    document.getElementById('sidebar-user-card')?.classList.add('hidden');
    showToast('You have logged out. See you soon! ♡', 'info');
  }

  // ----------------------------------------------------------------------------
  // Event Listeners & Interactive Handlers
  // ----------------------------------------------------------------------------
  function setupEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    const lightBtn = document.getElementById('btn-theme-light');
    const darkBtn = document.getElementById('btn-theme-dark');

    function setTheme(theme) {
      document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
      localStorage.setItem('hangout_theme', theme);
      if (lightBtn && darkBtn) {
        lightBtn.classList.toggle('active', theme === 'light');
        darkBtn.classList.toggle('active', theme === 'dark');
      }
    }

    const savedTheme = localStorage.getItem('hangout_theme') || 'light';
    setTheme(savedTheme);

    if (themeBtn) {
      themeBtn.onclick = () => {
        const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        setTheme(next);
      };
    }
    if (lightBtn) lightBtn.onclick = () => setTheme('light');
    if (darkBtn) darkBtn.onclick = () => setTheme('dark');

    // Announcement banner close
    const closeBannerBtn = document.getElementById('btn-close-banner');
    if (closeBannerBtn) {
      closeBannerBtn.onclick = () => {
        document.getElementById('site-announcement-banner').style.display = 'none';
      };
    }

    // Topbar Search filter
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (State.currentView === 'discover') {
          const cards = document.querySelectorAll('#discover-groups-grid .group-card');
          cards.forEach(c => {
            const txt = c.textContent.toLowerCase();
            c.style.display = txt.includes(q) ? 'flex' : 'none';
          });
        }
      };
    }

    // Discover category filters
    document.querySelectorAll('#discover-categories .filter-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('#discover-categories .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderDiscoverGroups(tab.getAttribute('data-category'));
      };
    });

    // Feed category filters
    document.querySelectorAll('#feed-categories .filter-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('#feed-categories .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderCommunityPosts(tab.getAttribute('data-category'));
      };
    });

    // PANG FOREVER Tab switcher
    document.querySelectorAll('#pang-tabs .seg-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#pang-tabs .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.pang-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`pang-tab-${tab}`)?.classList.add('active');
      };
    });

    // PANG Mission actions
    document.getElementById('btn-surprise-mission')?.addEventListener('click', () => {
      rollRandomMission();
      renderActiveMissionCard();
      playCozyChime('pop');
    });

    document.getElementById('btn-skip-mission')?.addEventListener('click', () => {
      showToast('Mission skipped! No worries, you can take any mission anytime ♡', 'info');
      rollRandomMission();
      renderActiveMissionCard();
    });

    document.getElementById('btn-complete-mission')?.addEventListener('click', completeActiveMission);

    // Chat Composer
    document.getElementById('btn-send-message')?.addEventListener('click', sendChatMessage);
    document.getElementById('chat-input-textarea')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });

    document.getElementById('btn-chat-emoji')?.addEventListener('click', () => {
      const tray = document.getElementById('chat-quick-emojis');
      tray.classList.toggle('hidden');
    });

    document.querySelectorAll('.emoji-opt').forEach(emojiSpan => {
      emojiSpan.onclick = () => {
        const textarea = document.getElementById('chat-input-textarea');
        if (textarea) textarea.value += emojiSpan.textContent;
        document.getElementById('chat-quick-emojis').classList.add('hidden');
      };
    });

    document.getElementById('btn-back-to-groups')?.addEventListener('click', () => {
      document.getElementById('group-chat-room').classList.add('hidden');
      document.getElementById('groups-list-container').classList.remove('hidden');
    });

    // Avatar studio tabs
    document.querySelectorAll('#avatar-layer-tabs .seg-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#avatar-layer-tabs .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeAvatarLayer = btn.getAttribute('data-layer');
        renderAvatarStudio();
      };
    });

    document.getElementById('btn-randomize-avatar')?.addEventListener('click', () => {
      const skins = ['#ffe0bd', '#ffd1dc', '#f5cba7', '#d7a174'];
      const hairs = ['bubblegum', 'fluffy_bob', 'sleek'];
      const clothes = ['hoodie', 'sweater', 'basic'];
      const accessories = ['cat_ears', 'headphones', 'star_clip', 'glasses'];
      const colors = ['#ffb3ba', '#baffc9', '#bae1ff', '#ffffba'];

      State.avatarConfig.skin = skins[Math.floor(Math.random() * skins.length)];
      State.avatarConfig.hair = hairs[Math.floor(Math.random() * hairs.length)];
      State.avatarConfig.clothes = clothes[Math.floor(Math.random() * clothes.length)];
      State.avatarConfig.accessory = accessories[Math.floor(Math.random() * accessories.length)];
      State.avatarConfig.hairColor = colors[Math.floor(Math.random() * colors.length)];

      updateAllAvatarDisplays();
      renderAvatarStudio();
      playCozyChime('pop');
    });

    document.getElementById('btn-save-avatar')?.addEventListener('click', () => {
      showToast('Avatar saved successfully! ♡', 'success');
      const client = window.HangoutConfig?.getClient();
      if (client && State.user) {
        client.from('profiles').update({ avatar_config: State.avatarConfig }).eq('id', State.user.id);
      }
    });

    // Admin Dashboard Tabs
    document.querySelectorAll('#admin-tabs .seg-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#admin-tabs .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`admin-tab-${tab}`)?.classList.add('active');
      };
    });

    document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
      State.adminNotifications.forEach(n => n.is_read = true);
      renderAdminRegistrationNotifications();
      showToast('All registration alerts marked as read.', 'info');
    });

    document.getElementById('btn-export-reg-csv')?.addEventListener('click', () => {
      let csv = 'Display Name,Username,Email,Registration Date,Status\n';
      State.adminNotifications.forEach(n => {
        csv += `"${n.display_name}","@${n.username}","${n.email}","${n.registered_at}","${n.status}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hangout_registrations_${Date.now()}.csv`;
      a.click();
    });

    // Admin Website Editor Save
    document.getElementById('btn-save-website-settings')?.addEventListener('click', () => {
      const siteName = document.getElementById('edit-site-name').value;
      const tagline = document.getElementById('edit-site-tagline').value;
      const banner = document.getElementById('edit-announcement-text').value;

      document.querySelector('.brand-wordmark').textContent = siteName;
      document.getElementById('announcement-text').textContent = banner;

      showToast('Website content published successfully! ♡', 'success');
    });

    // Supabase Connection Manager in Settings
    const cfgUrlInput = document.getElementById('cfg-supabase-url');
    const cfgAnonInput = document.getElementById('cfg-supabase-anon');
    if (cfgUrlInput && cfgAnonInput) {
      cfgUrlInput.value = window.HangoutConfig?.supabaseUrl || '';
      cfgAnonInput.value = window.HangoutConfig?.supabaseAnonKey || '';
    }

    document.getElementById('btn-save-supabase-config')?.addEventListener('click', () => {
      const url = cfgUrlInput.value.trim();
      const key = cfgAnonInput.value.trim();
      if (!url || !key) {
        showToast('Please enter both Supabase URL and Anon key.', 'error');
        return;
      }
      window.HangoutConfig.saveCredentials(url, key);
      showToast('Configuration saved! Reloading client...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    });

    document.getElementById('btn-clear-supabase-config')?.addEventListener('click', () => {
      window.HangoutConfig.clearCredentials();
      showToast('Reset to Demo Mode.', 'info');
      setTimeout(() => window.location.reload(), 1000);
    });

    // Modals handlers
    setupFormsAndModals();
  }

  function setupFormsAndModals() {
    // Auth Modal Tabs
    document.querySelectorAll('#auth-tabs .seg-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#auth-tabs .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-auth-tab');
        document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
        document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
      };
    });

    // Login Form Submit
    document.getElementById('form-login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      const client = window.HangoutConfig?.getClient();
      if (client) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          showToast(`Login failed: ${error.message}`, 'error');
          return;
        }
        showToast('Welcome back! ♡', 'success');
        closeAuthModal();
      } else {
        // Demo mode login
        handleUserSignedIn({
          id: 'demo-user-1',
          email: email,
          user_metadata: { display_name: email.split('@')[0], username: email.split('@')[0] }
        });
        showToast('Logged in (Demo Mode)! Welcome to HANGOUT ♡', 'success');
        closeAuthModal();
      }
    });

    // Register Form Submit
    document.getElementById('form-register')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('reg-display-name').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      const client = window.HangoutConfig?.getClient();
      if (client) {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              username: username
            }
          }
        });
        if (error) {
          showToast(`Registration failed: ${error.message}`, 'error');
          return;
        }
        showToast('Account created! Please verify your email or sign in ♡', 'success');
        closeAuthModal();
      } else {
        // Offline / Demo Registration Trigger Simulation
        const newNotif = {
          id: 'reg-' + Date.now(),
          title: 'NEW MEMBER REGISTERED! 🎉',
          display_name: displayName,
          username: username,
          email: email,
          registered_at: new Date().toLocaleString(),
          verification: 'Verified (Demo)',
          status: 'Active',
          is_read: false
        };
        State.adminNotifications.unshift(newNotif);
        State.registeredUsers.unshift({
          id: 'u-' + Date.now(),
          display_name: displayName,
          username: username,
          email: email,
          joined: 'Today',
          xp: 50,
          level: 1,
          status: 'Active'
        });

        handleUserSignedIn({
          id: 'u-' + Date.now(),
          email: email,
          user_metadata: { display_name: displayName, username: username }
        });

        renderAdminRegistrationNotifications();
        showToast('Account created successfully! Welcome to HANGOUT ♡', 'success');
        closeAuthModal();
        navigateTo('avatar-studio');
      }
    });

    // Create Group Form
    document.getElementById('form-create-group')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('grp-name').value.trim();
      const desc = document.getElementById('grp-desc').value.trim();
      const category = document.getElementById('grp-category').value;
      const rules = document.getElementById('grp-rules').value.trim();
      const isPrivate = document.getElementById('grp-is-private').checked;

      const newGrp = {
        id: 'grp-' + Date.now(),
        name,
        description: desc,
        category,
        icon: '✨',
        member_count: 1,
        is_private: isPrivate,
        rules: rules || 'Be kind and cozy ♡'
      };

      State.groups.unshift(newGrp);
      State.myJoinedGroupIds.push(newGrp.id);

      showToast(`Group "${name}" created!`, 'success');
      closeCreateGroupModal();
      openGroupChat(newGrp.id);
    });

    // Create Post Form
    document.getElementById('form-create-post')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const content = document.getElementById('post-content').value.trim();
      const category = document.getElementById('post-category').value;
      const isAnon = document.getElementById('post-is-anon').checked;

      const newPost = {
        id: 'post-' + Date.now(),
        author_name: isAnon ? 'Gentle Anonymous' : (State.profile?.display_name || 'Cozy Friend'),
        author_handle: isAnon ? '@cozy_anon' : `@${State.profile?.username || 'friend'}`,
        author_avatar: isAnon ? '🌸' : '🐰',
        category,
        content,
        likes: 1,
        is_liked: false,
        created_at: 'Just now',
        comments: []
      };

      State.posts.unshift(newPost);
      showToast('Note published to Cozy Feed! ♡', 'success');
      closeCreatePostModal();
      renderCommunityPosts();
    });
  }

  // Global Helpers attached to window.HangoutApp
  window.HangoutApp = {
    navigateTo,
    openAuthModal: (tab = 'login') => {
      const modal = document.getElementById('modal-auth');
      modal.classList.remove('hidden');
      document.querySelector(`[data-auth-tab="${tab}"]`)?.click();
    },
    closeAuthModal: () => document.getElementById('modal-auth').classList.add('hidden'),
    openCreateGroupModal: () => document.getElementById('modal-create-group').classList.remove('hidden'),
    closeCreateGroupModal: () => document.getElementById('modal-create-group').classList.add('hidden'),
    openCreatePostModal: () => document.getElementById('modal-create-post').classList.remove('hidden'),
    closeCreatePostModal: () => document.getElementById('modal-create-post').classList.add('hidden'),
    closeCelebration: () => document.getElementById('celebration-overlay').classList.add('hidden'),
    switchAdminTab: (tabName) => {
      document.querySelector(`[data-tab="${tabName}"]`)?.click();
    },
    toggleUserStatus: (userId) => {
      const u = State.registeredUsers.find(x => x.id === userId);
      if (u) {
        u.status = u.status === 'Active' ? 'Suspended' : 'Active';
        renderAdminUsersTable();
        showToast(`User ${u.display_name} is now ${u.status}.`, 'info');
      }
    },
    deleteTaskTemplate: (taskId) => {
      State.pangTemplates = State.pangTemplates.filter(t => t.id !== taskId);
      renderAdminTasksTable();
      showToast('Task removed from PANG FOREVER pool.', 'info');
    },
    resolveReport: (reportId, action) => {
      State.reports = State.reports.filter(r => r.id !== reportId);
      renderAdminModeration();
      showToast(`Report ${action}.`, 'info');
    },
    startDirectMessage: (username) => {
      navigateTo('messages');
      showToast(`Started private conversation with @${username}`, 'info');
    }
  };

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(b => {
    b.addEventListener('click', (e) => {
      if (e.target === b) {
        b.classList.add('hidden');
      }
    });
  });

  // Topbar auth button
  document.getElementById('btn-open-login')?.addEventListener('click', () => {
    window.HangoutApp.openAuthModal('login');
  });

  // Admin nav button in topbar
  document.getElementById('btn-admin-nav')?.addEventListener('click', () => {
    navigateTo('admin');
  });

  // DB status button
  document.getElementById('btn-db-status')?.addEventListener('click', () => {
    navigateTo('settings');
  });

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initSupabaseSession();

    // Initial renders
    renderFeaturedHomeGroups();
    renderRecentHomePosts();
    renderDiscoverGroups();
    renderMyGroups();
    updateAllAvatarDisplays();

    // Check initial route
    const hash = window.location.hash.replace('#', '') || 'home';
    navigateTo(hash);
  });

})();
