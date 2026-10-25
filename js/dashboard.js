(function () {
  "use strict";

  // Initialize dashboard when the page loads
  document.addEventListener("DOMContentLoaded", function () {
    
    renderDashboard();
    
    // Subscribe to store changes to update the dashboard
    App.store.subscribe(renderDashboard);
  });

  let chartRange = "week";

  function renderDashboard() {
    const root = document.getElementById("page-root");
    if (!root) return;

    const state = App.store.get();
    const profile = state.profile;
    const sessions = state.sessions;
    const goals = state.goals;
    const schedule = state.schedule;
    const workouts = state.workouts;
    
    // Get current date
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Calculate metrics
    const completedThisWeek = App.utils.completedThisWeek();
    const weekMinutes = completedThisWeek.reduce((n, x) => n + (x.duration || 0), 0);
    const streak = App.utils.streak();
    
    // Get weekly goal progress
    const weeklyGoal = App.utils.activeGoal("workouts");
    let weeklyProgress = 0;
    if (weeklyGoal) {
      weeklyProgress = App.utils.goalProgress(weeklyGoal);
    }
    
    // Get today's scheduled workout
    const todayScheduled = schedule.filter(s => {
      const date = new Date(s.date).toISOString().split('T')[0];
      return date === todayStr;
    })[0];
    
    // Recent sessions (last 5)
    const recentSessions = sessions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    // Goals with progress
    const goalCards = goals.slice(0, 3).map(goal => {
      const progress = App.utils.goalProgress(goal);
      return el("div", { "class": "card" },
        [el("div", { "class": "card__head" },
           [el("h3", { "class": "card__title" }, goal.name)]),
         el("div", { "class": "progress" },
           [el("div", { "class": "progress__fill", style: `width: ${progress}%` })]),
         el("div", { "class": "row row-between mt-2" },
           [el("span", { "class": "text-sm text-2" }, `${Math.round(App.utils.goalCurrent(goal) * 10) / 10} / ${goal.target} ${goal.unit}`),
            el("span", { "class": "text-sm" }, `${progress}%`)]),
         el("div", { "class": "mt-2" },
           [el("button", { "class": "btn btn-ghost btn-sm", onclick: () => navigateTo('goals') }, "View Details")])]);
    });
    
    // Today's planned workout card (falls back to the next planned workout, then to a rest-day message)
    const sameDay = (x, y) => new Date(x).toDateString() === new Date(y).toDateString();
    const upcoming = App.utils.nextScheduled();
    const planned = todayScheduled || upcoming;
    let todayCard;
    const plannedWorkout = planned && App.utils.workoutById(planned.workoutId);
    if (plannedWorkout) {
      const isToday = sameDay(planned.date, now);
      todayCard = el("div", { "class": "card card--art today-card" },
        [el("div", { "class": "exercise-art" }, App.artFor(plannedWorkout)),
         el("div", { "class": "card__head" },
           [el("h3", { "class": "card__title" }, isToday ? "Today's workout" : "Next up"),
            el("span", { "class": "badge badge--accent" }, plannedWorkout.category)]),
         el("div", { "class": "stack" },
           [el("div", { "class": "text-lg" }, plannedWorkout.name),
            el("div", { "class": "text-sm text-2" },
              `${isToday ? "Today" : new Date(planned.date).toLocaleDateString('en-GB', { weekday: "long", day: "numeric", month: "short" })} · ${plannedWorkout.duration} min · ${plannedWorkout.level}`),
            el("button", { "class": "btn btn-primary btn-block", onclick: () => { window.location.href = "active-workout.html?id=" + plannedWorkout.id; } }, "Start Workout")])]);
    } else {
      todayCard = el("div", { "class": "card" },
        [el("div", { "class": "card__head" }, [el("h3", { "class": "card__title" }, "Today's workout")]),
         el("div", { "class": "empty" },
           [el("div", { "class": "empty__icon" }, icon("calendar")),
            el("h3", {}, "Nothing planned today"),
            el("p", {}, "Schedule a workout to keep your streak going."),
            el("button", { "class": "btn btn-secondary", onclick: () => navigateTo('training-planner') }, "Open planner")])]);
    }

    // Recent sessions list
    const recentList = el("div", { "class": "stack" },
      recentSessions.map(session => {
        const workout = App.utils.workoutById(session.workoutId);
        return el("a", { "class": "session-row", href: "workout-detail.html?id=" + session.workoutId },
          [el("span", { "class": "session-row__icon" }, icon("dumbbell")),
           el("span", { "class": "session-row__main" },
             [el("span", { "class": "session-row__title" }, workout ? workout.name : "Unknown Workout"),
              el("span", { "class": "text-sm text-2" }, `${App.relativeTime(session.date)} · ${session.duration} min${session.rating ? " · " + "★".repeat(session.rating) : ""}`)]),
           el("span", { "class": "badge badge--success" }, `${session.calories} kcal`)]);
      }));
    
    // Weekly/monthly activity chart data
    const days = chartRange === "month" ? 30 : 7;
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const totalMinutes = sessions
        .filter(s => new Date(s.date).toISOString().split('T')[0] === dateStr)
        .reduce((sum, s) => sum + s.duration, 0);
      chartData.push({
        label: date.toLocaleDateString('en-GB', { weekday: "short", day: "numeric", month: "short" }),
        short: days === 7 ? date.toLocaleDateString('en-GB', { weekday: "short" }) : String(date.getDate()),
        value: totalMinutes, suffix: " min"
      });
    }
    
    // Consistency calendar (simplified)
    const calendarDays = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const hasSession = sessions.some(s => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });
      
      calendarDays.push(el("div", { "class": `calendar-day ${hasSession ? 'has-session' : ''}` },
        [el("span", { "class": "text-sm" }, date.toLocaleDateString('en-GB', { weekday: "short" })),
         el("span", { "class": "date" }, date.getDate())]));
    }
    
    // Empty state for new users
    const isEmpty = sessions.length === 0;
    
    root.innerHTML = "";
    
    if (isEmpty) {
      root.appendChild(el("div", { "class": "empty" },
        [el("div", { "class": "empty__icon" }, icon("dumbbell")),
         el("h2", { "class": "text-lg mt-4" }, "Welcome to FormaFit!"),
         el("p", { "class": "text-2 mt-2 text-center" }, "Start your fitness journey by completing your first workout."),
         el("div", { "class": "mt-6" },
           [el("button", { "class": "btn btn-primary btn-lg", onclick: () => navigateTo('library') }, "Browse Workouts")])]));
    } else {
      const hour = now.getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      root.appendChild(el("section", { "class": "hero-banner" },
        [el("img", { "class": "hero-banner__img", src: "img/people-run.webp", alt: "", onerror: (e) => e.target.remove() }),
         el("div", { "class": "hero-banner__body" },
           [el("p", { "class": "hero-banner__date" }, now.toLocaleDateString('en-GB', { weekday: "long", day: "numeric", month: "long" })),
            el("h1", {}, `${greeting}, ${profile.name}`),
            el("div", { "class": "row hero-banner__actions" },
              [el("button", { "class": "btn btn-primary", onclick: () => navigateTo('active-workout') }, "Start Workout"),
               el("button", { "class": "btn btn-light", onclick: () => navigateTo('training-planner') }, "View Plan")])])]));
      
      // Summary metrics (each tile navigates to the relevant page)
      const tile = (value, label, page) => el("div", { "class": "card card--hover stat", role: "link", tabindex: "0",
          onclick: () => navigateTo(page), onkeydown: (e) => { if (e.key === "Enter") navigateTo(page); } },
        [el("h3", { "class": "text-lg text-center" }, value),
         el("p", { "class": "text-2 text-center mt-1" }, label)]);
      root.appendChild(el("div", { "class": "grid grid-2 mt-6" },
        [tile(completedThisWeek.length, "Workouts this week", "progress-analytics"),
         tile(weekMinutes, "Active minutes", "progress-analytics"),
         tile(streak, "Day streak", "goals"),
         tile(`${weeklyProgress}%`, "Weekly goal", "goals")]));
      
      // Weekly activity chart
      const chartCard = el("div", { "class": "card" },
        [el("div", { "class": "card__head" },
           [el("h3", { "class": "card__title" }, chartRange === "month" ? "Activity — last 30 days" : "Activity — this week"),
            el("div", { "class": "segmented", role: "group", "aria-label": "Chart range" },
              ["week", "month"].map(r => el("button", { "class": "segmented__btn" + (chartRange === r ? " is-active" : ""), type: "button",
                "aria-pressed": String(chartRange === r), onclick: () => { chartRange = r; renderDashboard(); } }, r === "week" ? "Week" : "Month")))]),
         el("div", { "class": "mt-4 chart-container", id: "weekly-chart" })]);
      root.appendChild(el("div", { "class": "dash-main mt-6" }, [chartCard, todayCard]));

      
      // Recent sessions
      root.appendChild(el("div", { "class": "card mt-6" },
        [el("div", { "class": "card__head" },
           [el("h3", { "class": "card__title" }, "Recent Workouts")]),
         el("div", { "class": "mt-4" }, recentList)]));
      
      // Goals
      root.appendChild(el("div", { "class": "mt-6" },
        [el("h2", { "class": "text-lg" }, "Goals"),
         el("div", { "class": "grid grid-3 mt-4" }, goalCards)]));
      
      // Consistency calendar
      root.appendChild(el("div", { "class": "card mt-6" },
        [el("div", { "class": "card__head" },
           [el("h3", { "class": "card__title" }, "Consistency")]),
         el("div", { "class": "mt-4 calendar-grid" },
           calendarDays)]));
      
      // Render chart after DOM update
      setTimeout(() => {
        const chartEl = document.getElementById("weekly-chart");
        if (chartEl) {
          App.chart.bar(chartEl, {
            data: chartData,
            label: "Activity in minutes"
          });
        }
      }, 10);
    }
  }

  function navigateTo(pageId) {
    const alias = { active: "active-workout", planner: "training-planner", library: "workout-library", analytics: "progress-analytics" };
    window.location.href = (alias[pageId] || pageId) + ".html";
  }
  
  // Helper functions for DOM creation
  function el(tag, attrs, kids) {
    return App.el(tag, attrs, kids);
  }
  
  function icon(name) {
    return App.icon(name);
  }
})();