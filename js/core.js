/* =========================================================================
   FormaFit — shared core (window.App)
   Public API:
   App.store        { get, set, update, subscribe, reset }  (localStorage-backed)
   App.seed()       re-initialize starter data (returns fresh state)
   App.renderShell(activePage)  inject sidebar + topbar + mobile nav
   App.el(tag, attrs, ...kids)  tiny DOM builder
   App.icon(name)   inline SVG icon (returns <svg>)
   App.openDialog({title,body,actions,foot}) -> {close, el}
   App.confirmDialog({title,message,confirmLabel,danger}) -> Promise<boolean>
   App.toast(msg, type)  type: success|warning|danger
   App.formatDate(d) / App.relativeTime(d)
   App.applyTheme() / App.applyUnits()
   App.addNotification({title,body,type})
   App.chart.bar(el,opts) / App.chart.line(el,opts) / App.chart.donut(el,opts)
   App.utils        { clamp, pct, sum, avg, uid, today, daysAgo, weekKey,
                      weekLabel, weekStart, weekEnd, workoutById,
                      completedThisWeek, activeGoal, goalProgress,
                      nutritionTotal, calorieTarget, macroTarget,
                      streak, unreadCount, nextScheduled, weekVolume }
   ========================================================================= */
(function () {
  "use strict";
  var LS_KEY = "formafit.v2";
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- icons ---------- */
  var ICONS = {
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    library: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    detail: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    planner: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    active: '<polygon points="6 4 20 12 6 20 6 4"/>',
    analytics: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    nutrition: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    profile: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    flame: '<path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-1-2-1-3 2 1 4 3 4 6a6 6 0 0 1-12 0c0-5 5-7 6-12z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    reset: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    dumbbell: '<path d="M6.5 6.5 17.5 17.5"/><path d="M3 9.5 9.5 3l3 3L6 12.5 3 9.5z"/><path d="M14.5 18 21 11.5 18 8.5 11.5 15 14.5 18z"/>',
    water: '<path d="M12 2s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    dots: '<circle cx="5" y="12" r="1.6"/><circle cx="12" y="12" r="1.6"/><circle cx="19" y="12" r="1.6"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  };

  var ICON_ALIAS = { "chevron-left": "arrowLeft", "chevron-right": "arrowRight", "chevron-down": "chevronDown" };
  function icon(name) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.classList.add("icon");
    var key = ICON_ALIAS[name] || String(name).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
    s.innerHTML = ICONS[key] || ICONS.info;
    return s;
  }

  /* ---------- dom builder ---------- */
  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null) continue;
        if (k === "class") n.className = v;
        else if (k === "html") n.innerHTML = v;
        else if (k === "style") n.setAttribute("style", v);
        else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "value") n.value = v;
        else if (k === "checked") n.checked = !!v;
        else if (k === "selected") n.selected = !!v;
        else if (k === "disabled") n.disabled = !!v;
        else n.setAttribute(k, v);
      }
    }
    (function add(list) {
      list.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return add(c);
        n.appendChild(c.nodeType ? c : document.createTextNode(c));
      });
    })([].slice.call(arguments, 2));
    return n;
  }

  /* ---------- store ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || typeof p !== "object" || !p.profile) return null;
      return p;
    } catch (e) { return null; }
  }
  function save(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { /* quota / private mode */ }
  }

  var state = load() || seed();
  if (!load()) save(state);

  var subs = [];
  var store = {
    get: function (key) { return key ? state[key] : state; },
    set: function (key, val) { state[key] = val; save(state); emit(); },
    update: function (key, fn) { state[key] = fn(state[key]); save(state); emit(); },
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (s) { return s !== fn; }); }; },
    reset: function () { state = seed(); save(state); emit(); }
  };
  function emit() { subs.forEach(function (f) { try { f(state); } catch (e) {} }); }

  /* ---------- seed ---------- */
  function seed() {
    var now = Date.now();
    var d = function (days) { return new Date(now - days * 864e5).toISOString(); };
    var workouts = [
      { id: "w-push", name: "Push Power", category: "Strength", level: "Intermediate", duration: 55, calories: 420,
        focus: ["Chest", "Shoulders", "Triceps"],
        exercises: [
          { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: 90 },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: 75 },
          { name: "Cable Lateral Raise", sets: 3, reps: "12-15", rest: 45 },
          { name: "Overhead Triceps Extension", sets: 3, reps: "10-12", rest: 60 }
        ] },
      { id: "w-pull", name: "Pull Strength", category: "Strength", level: "Intermediate", duration: 55, calories: 410,
        focus: ["Back", "Biceps"],
        exercises: [
          { name: "Pull-Ups", sets: 4, reps: "6-8", rest: 90 },
          { name: "Barbell Row", sets: 4, reps: "8-10", rest: 75 },
          { name: "Face Pull", sets: 3, reps: "12-15", rest: 45 },
          { name: "Barbell Curl", sets: 3, reps: "10-12", rest: 60 }
        ] },
      { id: "w-legs", name: "Leg Day", category: "Strength", level: "Advanced", duration: 60, calories: 520,
        focus: ["Quads", "Glutes", "Hamstrings"],
        exercises: [
          { name: "Back Squat", sets: 5, reps: "5-6", rest: 120 },
          { name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: 90 },
          { name: "Walking Lunge", sets: 3, reps: "12/leg", rest: 75 },
          { name: "Standing Calf Raise", sets: 4, reps: "15-20", rest: 45 }
        ] },
      { id: "w-hiit", name: "HIIT Burn", category: "Cardio", level: "Beginner", duration: 25, calories: 340,
        focus: ["Full Body", "Conditioning"],
        exercises: [
          { name: "Burpees", sets: 4, reps: "30s", rest: 30 },
          { name: "Mountain Climbers", sets: 4, reps: "40s", rest: 30 },
          { name: "Jump Squats", sets: 4, reps: "20", rest: 30 },
          { name: "Plank Shoulder Taps", sets: 3, reps: "30", rest: 30 }
        ] },
      { id: "w-core", name: "Core & Stability", category: "Mobility", level: "Beginner", duration: 20, calories: 150,
        focus: ["Core", "Posture"],
        exercises: [
          { name: "Dead Bug", sets: 3, reps: "10/side", rest: 45 },
          { name: "Pallof Press", sets: 3, reps: "12/side", rest: 45 },
          { name: "Hanging Knee Raise", sets: 3, reps: "12", rest: 60 },
          { name: "Side Plank", sets: 3, reps: "30s/side", rest: 45 }
        ] },
      { id: "w-run", name: "Tempo Run", category: "Cardio", level: "Intermediate", duration: 40, calories: 480,
        focus: ["Endurance"],
        exercises: [
          { name: "Easy Warm-up", sets: 1, reps: "10 min", rest: 0 },
          { name: "Tempo Intervals", sets: 5, reps: "4 min", rest: 90 },
          { name: "Cool-down Jog", sets: 1, reps: "8 min", rest: 0 }
        ] },
      { id: "w-yoga", name: "Full-Body Yoga Flow", category: "Mobility", level: "Beginner", duration: 35, calories: 180,
        focus: ["Flexibility", "Recovery"],
        exercises: [
          { name: "Sun Salutation A", sets: 3, reps: "8 rounds", rest: 30 },
          { name: "Warrior II Hold", sets: 2, reps: "45s/side", rest: 30 },
          { name: "Pigeon Pose", sets: 2, reps: "60s/side", rest: 30 },
          { name: "Seated Forward Fold", sets: 2, reps: "60s", rest: 30 }
        ] },
      { id: "w-shoulders", name: "Shoulder Sculpt", category: "Strength", level: "Intermediate", duration: 45, calories: 330,
        focus: ["Shoulders", "Arms"],
        exercises: [
          { name: "Seated Overhead Press", sets: 4, reps: "8-10", rest: 75 },
          { name: "Dumbbell Lateral Raise", sets: 4, reps: "12-15", rest: 45 },
          { name: "Rear Delt Fly", sets: 3, reps: "12-15", rest: 45 },
          { name: "Hammer Curl", sets: 3, reps: "10-12", rest: 60 }
        ] },
      { id: "w-kb", name: "Kettlebell Full Body", category: "Full Body", level: "Intermediate", duration: 40, calories: 380,
        focus: ["Glutes", "Core", "Shoulders"],
        exercises: [
          { name: "Kettlebell Swing", sets: 5, reps: "15", rest: 45 },
          { name: "Goblet Squat", sets: 4, reps: "10-12", rest: 60 },
          { name: "Kettlebell Clean & Press", sets: 3, reps: "8/side", rest: 60 },
          { name: "Farmer's Carry", sets: 3, reps: "40 m", rest: 45 }
        ] },
      { id: "w-circuit", name: "Total Body Circuit", category: "Full Body", level: "Beginner", duration: 35, calories: 320,
        focus: ["Full Body", "Conditioning"],
        exercises: [
          { name: "Battle Rope Waves", sets: 4, reps: "30s", rest: 30 },
          { name: "Box Step-Ups", sets: 3, reps: "12/leg", rest: 45 },
          { name: "Medicine Ball Slam", sets: 3, reps: "12", rest: 45 },
          { name: "Bodyweight Row", sets: 3, reps: "10-12", rest: 45 }
        ] },
      { id: "w-foam", name: "Foam Roll Recovery", category: "Recovery", level: "Beginner", duration: 20, calories: 90,
        focus: ["Quads", "Back", "Calves"],
        exercises: [
          { name: "Quad Foam Roll", sets: 2, reps: "60s/side", rest: 15 },
          { name: "Upper Back Roll", sets: 2, reps: "60s", rest: 15 },
          { name: "Calf Release", sets: 2, reps: "45s/side", rest: 15 },
          { name: "Glute Ball Release", sets: 2, reps: "60s/side", rest: 15 }
        ] },
      { id: "w-stretch", name: "Evening Stretch & Breathe", category: "Recovery", level: "Beginner", duration: 25, calories: 100,
        focus: ["Hips", "Spine", "Breathing"],
        exercises: [
          { name: "Box Breathing", sets: 1, reps: "3 min", rest: 0 },
          { name: "Child's Pose", sets: 2, reps: "60s", rest: 15 },
          { name: "Supine Twist", sets: 2, reps: "45s/side", rest: 15 },
          { name: "Legs Up the Wall", sets: 1, reps: "5 min", rest: 0 }
        ] },
      { id: "w-sprint", name: "Sprint Intervals", category: "Cardio", level: "Advanced", duration: 30, calories: 450,
        focus: ["Speed", "Endurance"],
        exercises: [
          { name: "Dynamic Warm-up", sets: 1, reps: "8 min", rest: 0 },
          { name: "Sprint 200 m", sets: 8, reps: "200 m", rest: 90 },
          { name: "Walk-back Recovery", sets: 1, reps: "5 min", rest: 0 }
        ] }
    ];
    var sessions = [
      { id: "s1", workoutId: "w-push", date: d(1), duration: 52, calories: 430, volume: 3120, rating: 4 },
      { id: "s2", workoutId: "w-legs", date: d(2), duration: 58, calories: 510, volume: 4200, rating: 5 },
      { id: "s3", workoutId: "w-hiit", date: d(3), duration: 26, calories: 350, volume: 0, rating: 4 },
      { id: "s4", workoutId: "w-pull", date: d(4), duration: 54, calories: 415, volume: 2980, rating: 4 },
      { id: "s5", workoutId: "w-run", date: d(5), duration: 41, calories: 470, volume: 0, rating: 3 },
      { id: "s6", workoutId: "w-core", date: d(6), duration: 21, calories: 155, volume: 0, rating: 5 },
      { id: "s7", workoutId: "w-push", date: d(8), duration: 50, calories: 405, volume: 2890, rating: 4 },
      { id: "s8", workoutId: "w-shoulders", date: d(9), duration: 46, calories: 335, volume: 1720, rating: 4 },
      { id: "s9", workoutId: "w-yoga", date: d(10), duration: 34, calories: 175, volume: 0, rating: 5 },
      { id: "s10", workoutId: "w-legs", date: d(12), duration: 55, calories: 495, volume: 3980, rating: 4 }
    ];
    var goals = [
      { id: "g1", name: "Weekly Training Volume", type: "workouts", target: 5, current: 4, unit: "sessions", period: "week",
        createdAt: d(30), updatedAt: d(1), status: "active" },
      { id: "g2", name: "Bodyweight Goal", type: "weight", target: 74, current: 78.2, unit: "kg", period: "month",
        createdAt: d(45), updatedAt: d(2), status: "active" },
      { id: "g3", name: "Daily Step Target", type: "steps", target: 10000, current: 8420, unit: "steps", period: "day",
        createdAt: d(20), updatedAt: d(0), status: "active" },
      { id: "g4", name: "10k Run", type: "distance", target: 10, current: 7.5, unit: "km", period: "month",
        createdAt: d(60), updatedAt: d(5), status: "active" }
    ];
    var nutrition = [
      { id: "n1", date: d(0), meal: "Breakfast", food: "Oatmeal with berries & walnuts", calories: 420, protein: 18, carbs: 58, fat: 12 },
      { id: "n2", date: d(0), meal: "Lunch", food: "Grilled chicken bowl", calories: 560, protein: 42, carbs: 48, fat: 18 },
      { id: "n3", date: d(0), meal: "Snack", food: "Greek yogurt & honey", calories: 210, protein: 16, carbs: 22, fat: 5 },
      { id: "n4", date: d(1), meal: "Breakfast", food: "Eggs & whole-grain toast", calories: 380, protein: 24, carbs: 30, fat: 18 },
      { id: "n5", date: d(1), meal: "Lunch", food: "Salmon, quinoa & greens", calories: 610, protein: 40, carbs: 44, fat: 26 },
      { id: "n6", date: d(1), meal: "Dinner", food: "Turkey stir-fry", calories: 520, protein: 38, carbs: 40, fat: 16 },
      { id: "n7", date: d(2), meal: "Breakfast", food: "Protein smoothie", calories: 340, protein: 30, carbs: 38, fat: 8 },
      { id: "n8", date: d(2), meal: "Lunch", food: "Chicken & rice", calories: 590, protein: 44, carbs: 55, fat: 15 },
      { id: "n9", date: d(2), meal: "Snack", food: "Apple & peanut butter", calories: 240, protein: 6, carbs: 24, fat: 14 }
    ];
    var notifications = [
      { id: "nt1", title: "Weekly goal reached", body: "You completed 4 of 5 scheduled sessions this week. Keep the streak alive!", type: "success", read: false, time: d(0) },
      { id: "nt2", title: "New workout added", body: "Shoulder Sculpt is now in your library. Add it to your plan.", type: "info", read: false, time: d(1) },
      { id: "nt3", title: "Nutrition reminder", body: "You're 320 kcal under your target today. Log your dinner.", type: "warning", read: false, time: d(0) },
      { id: "nt4", title: "Session completed", body: "Leg Day finished — 58 min, 510 kcal logged.", type: "success", read: true, time: d(2) },
      { id: "nt5", title: "Streak milestone", body: "6 days in a row. Consistency is compounding.", type: "info", read: true, time: d(3) },
      { id: "nt6", title: "Weekly summary ready", body: "Your progress report for last week is available in Analytics.", type: "info", read: true, time: d(7) }
    ];
    var schedule = [
      { id: "sc1", workoutId: "w-push", date: new Date(now + 864e5).toISOString(), time: "07:00" },
      { id: "sc2", workoutId: "w-pull", date: new Date(now + 2 * 864e5).toISOString(), time: "18:30" },
      { id: "sc3", workoutId: "w-legs", date: new Date(now + 3 * 864e5).toISOString(), time: "07:00" },
      { id: "sc4", workoutId: "w-hiit", date: new Date(now + 4 * 864e5).toISOString(), time: "12:00" },
      { id: "sc5", workoutId: "w-run", date: new Date(now + 5 * 864e5).toISOString(), time: "06:30" },
      { id: "sc6", workoutId: "w-shoulders", date: new Date(now + 6 * 864e5).toISOString(), time: "18:00" }
    ];
    return {
      version: 1,
      profile: { name: "Alex Rivera", email: "alex@formafit.app", avatar: "AR",
        theme: "light", units: "metric", weight: 78.2, height: 178, age: 30,
        experience: "Intermediate", weeklyTarget: 5, calorieTarget: 2400,
        macroTarget: { protein: 150, carbs: 220, fat: 70 } },
      favorites: ["w-push", "w-legs", "w-hiit"],
      workouts: workouts,
      sessions: sessions,
      goals: goals,
      nutrition: nutrition,
      notifications: notifications,
      schedule: schedule
    };
  }

  /* ---------- utils ---------- */
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function sum(arr, fn) { return arr.reduce(function (t, x) { return t + (fn ? fn(x) : x); }, 0); }
  function avg(arr) { return arr.length ? sum(arr) / arr.length : 0; }
  function uid(p) { return (p || "id") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today() { return new Date(new Date().setHours(0, 0, 0, 0)); }
  function daysAgo(n) { return new Date(today().getTime() - n * 864e5); }
  function weekStart(d) { var x = new Date(d); var day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
  function weekEnd(d) { var e = new Date(weekStart(d).getTime() + 6 * 864e5); e.setHours(23, 59, 59, 999); return e; }
  function weekKey(d) { var s = weekStart(d); return s.getFullYear() + "-" + (s.getMonth() + 1) + "-" + s.getDate(); }
  function weekLabel(d) { var s = weekStart(d), e = weekEnd(d); var m = function (x) { return x.toLocaleDateString('en-GB', { month: "short", day: "numeric" }); }; return m(s) + " – " + m(e); }
  function workoutById(id) { return state.workouts.filter(function (w) { return w.id === id; })[0]; }
  function completedThisWeek() { var s = weekStart(new Date()), e = weekEnd(new Date()); return state.sessions.filter(function (x) { var t = new Date(x.date); return t >= s && t <= e; }); }
  function activeGoal(type) { return state.goals.filter(function (g) { return g.type === type && g.status === "active"; })[0]; }
  function periodRange(p) {
    var n = new Date();
    if (p === "day") { var s = new Date(n); s.setHours(0, 0, 0, 0); return [s, new Date(s.getTime() + 864e5 - 1)]; }
    if (p === "month") return [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999)];
    return [weekStart(n), weekEnd(n)];
  }
  // goals of type workouts/volume are derived from saved sessions; other types keep their manually stored value
  function goalCurrent(g) {
    if (g.type !== "workouts" && g.type !== "volume") return g.current;
    var r = periodRange(g.period);
    var list = state.sessions.filter(function (x) { var t = new Date(x.date); return t >= r[0] && t <= r[1]; });
    return g.type === "workouts" ? list.length : sum(list, function (x) { return x.volume || 0; });
  }
  // weight goals can aim below the current value, so compare the smaller to the larger
  function goalProgress(g) {
    var cur = goalCurrent(g);
    if (g.type === "weight") return clamp(Math.round((Math.min(cur, g.target) / Math.max(cur, g.target, 1)) * 100), 0, 100);
    return clamp(Math.round((cur / g.target) * 100), 0, 100);
  }
  function goalRemaining(g) {
    var cur = goalCurrent(g), r = g.type === "weight" ? Math.abs(cur - g.target) : Math.max(0, g.target - cur);
    return Math.round(r * 100) / 100;
  }
  function goalDone(g) { return g.status === "completed" || (g.type === "weight" ? goalRemaining(g) === 0 : goalProgress(g) >= 100); }
  function nutritionTotal(dateStr) { var d = new Date(dateStr); var key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); return state.nutrition.filter(function (n) { var t = new Date(n.date); return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate() === key; }); }
  function calorieTarget() { return state.profile.calorieTarget || 2400; }
  function macroTarget() { return state.profile.macroTarget || { protein: 150, carbs: 220, fat: 70 }; }
  function streak() { var set = {}; state.sessions.forEach(function (s) { var t = new Date(s.date); set[t.getFullYear() + "-" + t.getMonth() + "-" + t.getDate()] = 1; }); var n = 0, cur = today(); if (!set[cur.getFullYear() + "-" + cur.getMonth() + "-" + cur.getDate()]) cur = new Date(cur.getTime() - 864e5); while (set[cur.getFullYear() + "-" + cur.getMonth() + "-" + cur.getDate()]) { n++; cur = new Date(cur.getTime() - 864e5); } return n; }
  function unreadCount() { return state.notifications.filter(function (n) { return !n.read; }).length; }
  function nextScheduled() { var now = Date.now(); var list = state.schedule.filter(function (s) { return new Date(s.date).getTime() >= now - 36e5; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); }); return list[0]; }
  function weekVolume() { var s = completedThisWeek(); return sum(s, function (x) { return x.volume || 0; }); }

  /* ---------- formatting ---------- */
  function formatDate(d) { var t = d instanceof Date ? d : new Date(d); return t.toLocaleDateString('en-GB', { month: "short", day: "numeric", year: "numeric" }); }
  function relativeTime(d) {
    var t = d instanceof Date ? d : new Date(d); var diff = Date.now() - t.getTime();
    var m = Math.floor(diff / 6e4), h = Math.floor(diff / 36e5), day = Math.floor(diff / 864e5);
    if (m < 1) return "just now"; if (m < 60) return m + "m ago";
    if (h < 24) return h + "h ago"; if (day < 7) return day + "d ago";
    return formatDate(t);
  }

  /* ---------- theme / units ---------- */
  function applyTheme() {
    var t = state.profile.theme || "light";
    document.documentElement.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#171923" : "#F7F8FA");
  }
  function applyUnits() {
    var u = state.profile.units || "metric";
    document.documentElement.setAttribute("data-units", u);
    return u;
  }

  /* ---------- notifications ---------- */
  function addNotification(o) {
    var n = { id: uid("nt"), title: o.title || "Update", body: o.body || "", type: o.type || "info", read: false, time: new Date().toISOString() };
    store.update("notifications", function (arr) { return [n].concat(arr || []); });
    return n;
  }

  /* ---------- toast ---------- */
  function toast(msg, type) {
    type = type || "success";
    var region = document.querySelector(".toast-region");
    if (!region) { region = el("div", { "class": "toast-region", role: "status", "aria-live": "polite" }); document.body.appendChild(region); }
    var t = el("div", { "class": "toast toast--" + type, role: "status" },
      [el("span", { "class": "icon-btn", html: "" }, icon(type === "danger" ? "close" : type === "warning" ? "info" : "check")),
       el("span", { "class": "text-sm" }, msg)]);
    region.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-in"); });
    setTimeout(function () { t.classList.remove("is-in"); setTimeout(function () { t.remove(); }, 320); }, 3600);
  }

  /* ---------- dialogs ---------- */
  function openDialog(opts) {
    opts = opts || {};
    var backdrop = el("div", { "class": "dialog-backdrop", role: "presentation" });
    var box = el("div", { "class": "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": opts.titleId || null });
    var head = el("div", { "class": "dialog__head" },
      [el("h2", { "class": "dialog__title", id: opts.titleId || "dlg-title" }, opts.title || "Dialog"),
       el("button", { "class": "icon-btn", type: "button", "aria-label": "Close dialog", onclick: close }, icon("close"))]);
    var body = el("div", { "class": "dialog__body" });
    if (opts.body) (Array.isArray(opts.body) ? opts.body : [opts.body]).forEach(function (c) { body.appendChild(c.nodeType ? c : el("p", { "class": "text-sm text-2" }, c)); });
    box.appendChild(head); box.appendChild(body);
    if (opts.foot) box.appendChild(el("div", { "class": "dialog__foot" }, opts.foot));
    var dlgForm = body.querySelector("form");
    if (dlgForm) { // footer buttons live outside the form: link submit buttons to it so they submit
      if (!dlgForm.id) dlgForm.id = "dlg-form-" + Math.random().toString(36).slice(2, 7);
      box.querySelectorAll('.dialog__foot button[type="submit"]').forEach(function (b) { b.setAttribute("form", dlgForm.id); });
    }
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add("is-open"); });
    var lastFocus = document.activeElement;
    var focusables = function () { return box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'); };
    setTimeout(function () { var f = focusables(); (f[0] || box).focus(); }, 30);
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { var f = focusables(); if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);
    function close() {
      backdrop.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { backdrop.remove(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }, 220);
    }
    return { close: close, el: box, body: body };
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var actions = [
        el("button", { "class": "btn btn-ghost", type: "button" }, "Cancel"),
        el("button", { "class": "btn " + (opts.danger ? "btn-danger" : "btn-primary"), type: "button" }, opts.confirmLabel || "Confirm")
      ];
      var dlg = openDialog({
        title: opts.title || "Are you sure?",
        body: opts.message || "This action cannot be undone.",
        foot: actions
      });
      actions[0].addEventListener("click", function () { dlg.close(); resolve(false); });
      actions[1].addEventListener("click", function () { dlg.close(); resolve(true); });
    });
  }

  /* ---------- charts ---------- */
  function chartTip(text) {
    var tip = el("div", { "class": "chart-tip", role: "status" });
    tip.style.opacity = "0";
    function show(e, txt) {
      tip.textContent = txt; tip.style.opacity = "1";
      var host = tip.parentNode.getBoundingClientRect();
      tip.style.left = clamp(e.clientX - host.left, 8, host.width - 8) + "px";
      tip.style.top = (e.clientY - host.top - 34) + "px";
    }
    function hide() { tip.style.opacity = "0"; }
    return { el: tip, show: show, hide: hide };
  }
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }

  function niceScale(max) {
    max = Math.max(max, 4);
    var exp = Math.pow(10, Math.floor(Math.log10(max))), f = max / exp;
    var top = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10) * exp;
    return { max: top, step: top / 4 };
  }
  function fmtTick(v) { return v >= 1000 ? (Math.round(v / 100) / 10) + "k" : String(Math.round(v * 10) / 10); }
  function axisLabel(l) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(l || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-GB', { month: "short", day: "numeric" }) : l;
  }
  function drawAxes(svg, W, H, L, R, T, B, sc) {
    for (var i = 0; i <= 4; i++) {
      var y = H - B - (i / 4) * (H - T - B);
      var ln = svgEl("line", { x1: L, y1: y, x2: W - R, y2: y, "stroke-width": 1 });
      ln.style.stroke = "var(--border)"; if (i) ln.setAttribute("stroke-dasharray", "3 4");
      svg.appendChild(ln);
      var t = svgEl("text", { x: L - 8, y: y + 4, "text-anchor": "end" }); t.textContent = fmtTick(sc.step * i); svg.appendChild(t);
    }
  }

  var chart = {
    bar: function (host, opts) {
      opts = opts || {};
      var data = opts.data || [];
      var W = host.clientWidth || 320, H = opts.height || 220, L = 38, R = 6, T = 14, B = 24;
      host.innerHTML = "";
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": opts.label || "Bar chart" });
      var sc = niceScale(Math.max.apply(null, data.map(function (d) { return d.value; }).concat([0])));
      drawAxes(svg, W, H, L, R, T, B, sc, opts.unit);
      var bw = (W - L - R) / Math.max(1, data.length), tip = chartTip();
      var every = Math.ceil(data.length / Math.max(1, Math.floor((W - L) / 44)));
      var showVals = data.length <= 12 && bw >= 30;
      data.forEach(function (d, i) {
        var h = (d.value / sc.max) * (H - T - B), w = Math.min(bw * 0.62, 46);
        var x = L + i * bw + (bw - w) / 2, y = H - B - h;
        var r = svgEl("rect", { x: x, y: y, width: w, height: Math.max(h, d.value ? 2 : 0), rx: 5, fill: d.color || "#6757E8" });
        r.style.transformOrigin = "50% " + (H - B) + "px"; r.style.transition = "opacity .2s";
        if (!REDUCED) { r.style.transition += ", transform .7s cubic-bezier(.2,.8,.2,1) " + (i * 45) + "ms"; r.style.transform = "scaleY(0)"; }
        var msg = d.label + ": " + d.value + (d.suffix || "");
        r.addEventListener("mouseenter", function (e) { tip.show(e, msg); r.style.opacity = ".8"; });
        r.addEventListener("mousemove", function (e) { tip.show(e, msg); });
        r.addEventListener("mouseleave", function () { tip.hide(); r.style.opacity = "1"; });
        svg.appendChild(r);
        if (showVals && d.value) { var v = svgEl("text", { x: x + w / 2, y: y - 5, "text-anchor": "middle", "font-weight": 700 }); v.textContent = d.value; svg.appendChild(v); }
        if (i % every === 0) { var t = svgEl("text", { x: x + w / 2, y: H - 7, "text-anchor": "middle" }); t.textContent = axisLabel(d.short || d.label); svg.appendChild(t); }
      });
      host.appendChild(svg); host.appendChild(tip.el);
      if (!REDUCED) requestAnimationFrame(function () { svg.querySelectorAll("rect").forEach(function (r) { r.style.transform = "scaleY(1)"; }); });
      return svg;
    },
    line: function (host, opts) {
      opts = opts || {};
      var data = opts.data || [];
      var W = host.clientWidth || 320, H = opts.height || 220, L = 38, R = 12, T = 14, B = 24;
      host.innerHTML = "";
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": opts.label || "Line chart" });
      var sc = niceScale(Math.max.apply(null, data.map(function (d) { return d.value; }).concat([0])));
      drawAxes(svg, W, H, L, R, T, B, sc, opts.unit);
      var step = (W - L - R) / Math.max(1, data.length - 1);
      var pts = data.map(function (d, i) { return [L + i * step, H - B - (d.value / sc.max) * (H - T - B)]; });
      if (!pts.length) { host.appendChild(svg); return svg; }
      var path = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      var area = path + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (H - B) + " L" + pts[0][0].toFixed(1) + " " + (H - B) + " Z";
      var defs = svgEl("defs", {});
      var grad = svgEl("linearGradient", { id: "lg" + Math.random().toString(36).slice(2), x1: 0, y1: 0, x2: 0, y2: 1 });
      grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#6757E8", "stop-opacity": "0.22" }));
      grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#6757E8", "stop-opacity": "0" }));
      defs.appendChild(grad); svg.appendChild(defs);
      var a = svgEl("path", { d: area, fill: "url(#" + grad.id + ")" });
      var ln = svgEl("path", { d: path, fill: "none", stroke: "#6757E8", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
      svg.appendChild(a); svg.appendChild(ln);
      var every = Math.ceil(data.length / Math.max(1, Math.floor((W - L) / 56))), tip = chartTip(), dots = data.length <= 16;
      pts.forEach(function (p, i) {
        var msg = data[i].label + ": " + data[i].value + (data[i].suffix || "");
        var dot = svgEl("circle", { cx: p[0], cy: p[1], r: dots ? 4 : 3, fill: "#fff", stroke: "#6757E8", "stroke-width": 2, opacity: dots ? 1 : 0 });
        var hit = svgEl("circle", { cx: p[0], cy: p[1], r: 10, fill: "transparent" });
        hit.addEventListener("mouseenter", function (e) { tip.show(e, msg); dot.setAttribute("opacity", 1); dot.setAttribute("r", 5); });
        hit.addEventListener("mousemove", function (e) { tip.show(e, msg); });
        hit.addEventListener("mouseleave", function () { tip.hide(); dot.setAttribute("opacity", dots ? 1 : 0); dot.setAttribute("r", dots ? 4 : 3); });
        svg.appendChild(dot); svg.appendChild(hit);
        if (i % every === 0) { var t = svgEl("text", { x: p[0], y: H - 7, "text-anchor": i === 0 ? "start" : "middle" }); t.textContent = axisLabel(data[i].short || data[i].label); svg.appendChild(t); }
      });
      host.appendChild(svg); host.appendChild(tip.el);
      if (!REDUCED) {
        var len = ln.getTotalLength ? ln.getTotalLength() : 1000;
        ln.style.strokeDasharray = len; ln.style.strokeDashoffset = len;
        ln.style.transition = "stroke-dashoffset 1.1s ease";
        a.style.opacity = "0"; a.style.transition = "opacity .9s ease .3s";
        requestAnimationFrame(function () { ln.style.strokeDashoffset = "0"; a.style.opacity = "1"; });
      }
      return svg;
    },
    donut: function (host, opts) {
      opts = opts || {};
      var data = opts.data || [];
      var size = opts.size || 160, sw = opts.thickness || 20, r = (size - sw) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
      host.innerHTML = "";
      var svg = svgEl("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size, role: "img", "aria-label": opts.label || "Donut chart" });
      svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "#F0EEFF", "stroke-width": sw }));
      var total = sum(data, function (d) { return d.value; }) || 1;
      var offset = 0, tip = chartTip();
      data.forEach(function (d, i) {
        var frac = d.value / total, len = frac * C;
        var c = svgEl("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: d.color || "#6757E8", "stroke-width": sw,
          "stroke-dasharray": "0 " + C, "stroke-dashoffset": -offset, "stroke-linecap": "butt", transform: "rotate(-90 " + cx + " " + cy + ")" });
        c.addEventListener("mouseenter", function (e) { tip.show(e, d.label + ": " + Math.round(frac * 100) + "%"); });
        c.addEventListener("mousemove", function (e) { tip.show(e, d.label + ": " + Math.round(frac * 100) + "%"); });
        c.addEventListener("mouseleave", tip.hide);
        svg.appendChild(c);
        if (!REDUCED) { c.style.transition = "stroke-dasharray .9s ease " + (i * 120) + "ms"; requestAnimationFrame(function () { c.setAttribute("stroke-dasharray", len + " " + (C - len)); }); }
        else c.setAttribute("stroke-dasharray", len + " " + (C - len));
        offset += len;
      });
      var center = el("div", { "class": "donut-center" },
        [el("div", { "class": "num" }, opts.centerValue || Math.round(total)),
         el("div", { "class": "text-sm text-2" }, opts.centerLabel || "")]);
      host.appendChild(svg); host.appendChild(center); host.appendChild(tip.el);
      return svg;
    }
  };

  /* ---------- shell ---------- */
  var NAV = [
    { id: "dashboard", file: "dashboard.html", label: "Dashboard", icon: "dashboard" },
    { id: "library", file: "workout-library.html", label: "Workout Library", icon: "library" },
    { id: "detail", file: "workout-detail.html", label: "Workout Detail", icon: "detail" },
    { id: "planner", file: "training-planner.html", label: "Training Planner", icon: "planner" },
    { id: "active", file: "active-workout.html", label: "Active Workout", icon: "active" },
    { id: "analytics", file: "progress-analytics.html", label: "Progress Analytics", icon: "analytics" },
    { id: "goals", file: "goals.html", label: "Goals", icon: "goals" },
    { id: "nutrition", file: "nutrition-journal.html", label: "Nutrition Journal", icon: "nutrition" },
    { id: "profile", file: "profile-and-preferences.html", label: "Profile & Preferences", icon: "profile" },
    { id: "notifications", file: "notifications.html", label: "Notifications", icon: "bell" }
  ];
  var MOBILE = ["dashboard", "library", "planner", "active", "notifications"];

  function renderShell(activePage) {
    applyTheme(); applyUnits();
    var unread = unreadCount();
    var avatar = (state.profile.name || "U").split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();

    /* sidebar */
    var sideLinks = NAV.map(function (n) {
      var badge = n.id === "notifications" && unread ? el("span", { "class": "nav__badge" }, unread) : null;
      return el("a", { "class": "nav__link" + (n.id === activePage ? " is-active" : ""), href: n.file, "aria-current": n.id === activePage ? "page" : null },
        [icon(n.icon), el("span", { "class": "nav__label" }, n.label), badge]);
    });
    var sidebar = el("aside", { "class": "sidebar", "aria-label": "Primary" },
      [el("a", { "class": "brand", href: "dashboard.html" },
         [el("span", { "class": "brand__mark" }, icon("dumbbell")), el("span", { "class": "brand__name" }, "FormaFit")]),
       el("nav", { "class": "nav", "aria-label": "Primary" }, sideLinks),
       el("div", { "class": "sidebar__foot" },
         [el("div", { "class": "avatar" }, avatar),
          el("div", { "class": "stack" },
            [el("div", { "class": "text-sm" }, state.profile.name),
             el("div", { "class": "text-2 text-sm" }, state.profile.experience)])])]);

    /* topbar */
    var topbar = el("header", { "class": "topbar" },
      [el("button", { "class": "icon-btn menu-toggle", type: "button", "aria-label": "Open menu", "aria-expanded": "false", "data-menu-toggle": "true" }, icon("menu")),
       el("h1", { "class": "topbar__title" }, (NAV.filter(function (n) { return n.id === activePage; })[0] || {}).label || "FormaFit"),
       el("span", { "class": "topbar__spacer" }),
       el("a", { "class": "icon-btn", href: "notifications.html", "aria-label": "Notifications" + (unread ? " (" + unread + " unread)" : "") },
         [icon("bell"), unread ? el("span", { "class": "nav__badge" }, unread) : null]),
       el("a", { "class": "avatar", href: "profile-and-preferences.html", "aria-label": "Profile" }, avatar)]);

    /* mobile nav */
    var mobileLinks = MOBILE.map(function (id) {
      var n = NAV.filter(function (x) { return x.id === id; })[0];
      var badge = id === "notifications" && unread ? el("span", { "class": "nav__badge" }, unread) : null;
      return el("a", { "class": "nav__link" + (id === activePage ? " is-active" : ""), href: n.file, "aria-current": id === activePage ? "page" : null },
        [icon(n.icon), el("span", { "class": "nav__label" }, n.label), badge]);
    });
    var bottomNav = el("nav", { "class": "bottom-nav", "aria-label": "Primary" }, mobileLinks);

    var app = el("div", { "class": "app" }, [sidebar, topbar, el("div", { "class": "content" }, [el("main", { "class": "page", id: "page-root" })])]);
    document.body.innerHTML = "";
    document.body.appendChild(app);
    document.body.appendChild(bottomNav);

    /* keep the unread badges in sync with the store */
    function refreshBadges() {
      var n = unreadCount();
      document.querySelectorAll('a[href="notifications.html"]').forEach(function (link) {
        var b = link.querySelector(".nav__badge");
        if (!n) { if (b) b.remove(); }
        else if (b) b.textContent = n;
        else link.appendChild(el("span", { "class": "nav__badge" }, n));
      });
    }
    subs.push(refreshBadges);

    /* wire menu toggle */
    var toggle = document.querySelector("[data-menu-toggle]");
    if (toggle) toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("is-open")) { document.body.classList.remove("is-open"); if (toggle) toggle.setAttribute("aria-expanded", "false"); } });
  }

  /* ---------- expose ---------- */
  window.App = {
    store: store, seed: seed, renderShell: renderShell, el: el, icon: icon,
    openDialog: openDialog, confirmDialog: confirmDialog, toast: toast,
    formatDate: formatDate, relativeTime: relativeTime,
    applyTheme: applyTheme, applyUnits: applyUnits, addNotification: addNotification,
    chart: chart,
    utils: {
      clamp: clamp, pct: goalProgress, sum: sum, avg: avg, uid: uid, today: today, daysAgo: daysAgo,
      weekKey: weekKey, weekLabel: weekLabel, weekStart: weekStart, weekEnd: weekEnd,
      workoutById: workoutById, completedThisWeek: completedThisWeek, activeGoal: activeGoal,
      goalProgress: goalProgress, nutritionTotal: nutritionTotal, calorieTarget: calorieTarget,
      macroTarget: macroTarget, streak: streak, unreadCount: unreadCount, nextScheduled: nextScheduled, weekVolume: weekVolume, goalCurrent: goalCurrent, goalRemaining: goalRemaining, goalDone: goalDone
    }
  };
})();