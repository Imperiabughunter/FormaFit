(function () {
  "use strict";

  const store = App.store;
  const utils = App.utils;
  const el = App.el;
  const icon = App.icon;
  const openDialog = App.openDialog;
  const confirmDialog = App.confirmDialog;
  const toast = App.toast;

  let currentView = 'month'; // 'month' or 'week'
  let currentDate = new Date();
  let selectedDate = new Date();

  function render() {
    const root = document.getElementById('page-root');
    root.innerHTML = '';

    const header = el('div', { "class": "page-head" },
      [el("h2", { "class": "text-lg" }, "Training Planner"),
       el("div", { "class": "row row-between" },
         [el("div", { "class": "row" },
            [el("button", { "class": "btn btn-ghost btn-sm" + (currentView === 'month' ? " is-active" : ""), onclick: () => changeView('month') }, "Month"),
             el("button", { "class": "btn btn-ghost btn-sm" + (currentView === 'week' ? " is-active" : ""), onclick: () => changeView('week') }, "Week")]),
          el("div", { "class": "row" },
            [el("button", { "class": "btn btn-ghost btn-sm", onclick: goToToday }, "Today"),
             el("button", { "class": "btn btn-primary btn-sm", onclick: showScheduleDialog }, "Schedule Workout")])])]);

    const calendarContainer = el("div", { "class": "calendar-container" });
    renderCalendar(calendarContainer);

    root.appendChild(header);
    root.appendChild(calendarContainer);
  }

  function changeView(view) {
    currentView = view;
    render();
  }

  function goToToday() {
    currentDate = new Date();
    selectedDate = new Date();
    render();
  }

  function showScheduleDialog() {
    const workouts = store.get('workouts');
    const dialog = openDialog({
      title: "Schedule Workout",
      body: [
        el("div", { "class": "form-row" },
          [el("label", { "class": "text-sm" }, "Workout"),
           el("select", { "class": "select", id: "workout-select" }, workouts.map(w => 
             el("option", { value: w.id }, w.name)))])
      ],
      foot: [
        el("button", { "class": "btn btn-ghost", type: "button", onclick: () => dialog.close() }, "Cancel"),
        el("button", { "class": "btn btn-primary", type: "button", onclick: scheduleWorkout }, "Schedule")
      ]
    });
    const dateInput = el("input", { "type": "date", "class": "input", id: "date-input" });
    dialog.body.appendChild(el("div", { "class": "form-row" },
      [el("label", { "class": "text-sm" }, "Date"),
       dateInput]));
    const today = new Date();
    dateInput.valueAsDate = today;
  }

  function scheduleWorkout() {
    const workoutId = document.getElementById('workout-select').value;
    const dateStr = document.getElementById('date-input').value;
    
    if (!workoutId || !dateStr) return;

    const workout = utils.workoutById(workoutId);
    if (!workout) return;

    const schedule = store.get('schedule') || [];
    const newScheduleItem = {
      id: utils.uid("sc"),
      workoutId,
      date: new Date(dateStr).toISOString(),
      time: "07:00"
    };
    
    store.update('schedule', s => [...s, newScheduleItem]);
    toast("Workout scheduled successfully", "success");
    render();
  }

  function renderCalendar(container) {
    container.innerHTML = '';
    
    const days = visibleDays();
    const title = currentView === 'week'
      ? `${days[0].toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const navButtons = el("div", { "class": "row row-between cal-nav" },
      [el("button", { "class": "icon-btn", type: "button", "aria-label": "Previous period", onclick: () => changeMonth(-1) }, icon("arrowLeft")),
       el("h3", { "class": "text-lg", "aria-live": "polite" }, title),
       el("button", { "class": "icon-btn", type: "button", "aria-label": "Next period", onclick: () => changeMonth(1) }, icon("arrowRight"))]);

    const grid = el("div", { "class": "grid grid-7 cal-grid" + (currentView === 'week' ? " cal-grid--week" : "") });
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
      grid.appendChild(el("div", { "class": "cal-head" }, day));
    });
    days.forEach(d => grid.appendChild(createDayElement(d)));

    container.appendChild(navButtons);
    container.appendChild(grid);

    // Render agenda if a date is selected
    if (selectedDate) {
      const agenda = el("div", { "class": "mt-6" });
      const agendaHeader = el("h3", { "class": "text-lg mb-2" }, `Schedule for ${selectedDate.toLocaleDateString('en-GB')}`);
      agenda.appendChild(agendaHeader);
      
      const scheduledSessions = store.get('schedule').filter(s => {
        const sDate = new Date(s.date);
        return sDate.getDate() === selectedDate.getDate() &&
               sDate.getMonth() === selectedDate.getMonth() &&
               sDate.getFullYear() === selectedDate.getFullYear();
      });
      
      if (scheduledSessions.length === 0) {
        agenda.appendChild(el("p", { "class": "text-2" }, "No scheduled workouts for this day."));
      } else {
        scheduledSessions.forEach(session => {
          const workout = utils.workoutById(session.workoutId);
          if (!workout) return;
          
          const sessionCard = el("div", { "class": "card mb-2", "data-session-id": session.id },
            [el("div", { "class": "card__head" },
              [el("h4", { "class": "card__title" }, workout.name),
               el("span", { "class": "badge badge--accent" }, workout.category)]),
             el("div", { "class": "stack text-sm" },
               [el("div", { "class": "row row-between" },
                  [el("span", null, `${workout.duration} min`),
                   el("span", null, `${workout.calories} kcal`)]),
                el("div", { "class": "row row-between" },
                  [el("span", null, session.time),
                   el("button", { "class": "icon-btn", onclick: () => editSession(session) }, icon("edit"))])]),
             el("div", { "class": "row mt-2" },
               [el("button", { "class": "btn btn-danger btn-sm", onclick: () => removeSession(session.id) }, "Remove")])]);
          agenda.appendChild(sessionCard);
        });
      }
      
      container.appendChild(agenda);
    }
  }

  const dayKey = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  const sameDay = (a, b) => dayKey(a) === dayKey(b);
  const CAT_COLOR = { Strength: 'var(--accent)', Cardio: 'var(--danger)', Mobility: 'var(--success)', Recovery: 'var(--warning)', 'Full Body': '#2B8CC4' };

  function sessionsOn(date) {
    return (store.get('schedule') || []).filter(s => sameDay(new Date(s.date), date))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  function visibleDays() {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    if (currentView === 'week') {
      const sun = currentDate.getDate() - currentDate.getDay();
      return Array.from({ length: 7 }, (_, i) => new Date(y, m, sun + i));
    }
    const lead = new Date(y, m, 1).getDay();
    const all = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - lead + i));
    return all[35].getMonth() === m ? all : all.slice(0, 35);
  }

  function createDayElement(date) {
    const outside = currentView === 'month' && date.getMonth() !== currentDate.getMonth();
    const cls = ["cal-day"];
    if (outside) cls.push("is-outside");
    if (sameDay(date, new Date())) cls.push("is-today");
    if (selectedDate && sameDay(date, selectedDate)) cls.push("is-selected");
    const sessions = sessionsOn(date);
    const maxChips = currentView === 'week' ? 6 : 2;
    const chips = sessions.slice(0, maxChips).map(sc => {
      const w = utils.workoutById(sc.workoutId);
      return el("span", { "class": "cal-chip", style: `--chip: ${CAT_COLOR[w && w.category] || 'var(--accent)'}`, title: w ? w.name : "" }, w ? w.name : "Workout");
    });
    if (sessions.length > maxChips) chips.push(el("span", { "class": "cal-more" }, `+${sessions.length - maxChips} more`));
    const label = date.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' }) + (sessions.length ? `, ${sessions.length} scheduled` : "");
    return el("button", { "class": cls.join(" "), type: "button", "aria-label": label, "aria-pressed": String(cls.includes("is-selected")),
      onclick: () => { selectedDate = date; currentDate = new Date(date); render(); } },
      [el("span", { "class": "cal-num" }, date.getDate()), ...chips]);
  }

  function changeMonth(delta) {
    if (currentView === 'week') currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7 * delta);
    else currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    render();
  }

  function editSession(session) {
    const workouts = store.get('workouts');
    const dialog = openDialog({
      title: "Edit Workout",
      body: [
        el("div", { "class": "form-row" },
          [el("label", { "class": "text-sm" }, "Workout"),
           el("select", { "class": "select", id: "workout-select" }, workouts.map(w => 
             el("option", { value: w.id, selected: w.id === session.workoutId }, w.name)))])
      ],
      foot: [
        el("button", { "class": "btn btn-ghost", type: "button", onclick: () => dialog.close() }, "Cancel"),
        el("button", { "class": "btn btn-primary", type: "button", onclick: () => updateSession(session) }, "Update")
      ]
    });
    
    const dateInput = el("input", { "type": "date", "class": "input", id: "date-input" });
    dialog.body.appendChild(el("div", { "class": "form-row" },
      [el("label", { "class": "text-sm" }, "Date"),
       dateInput]));
    
    const today = new Date(session.date);
    dateInput.valueAsDate = today;
  }

  function updateSession(session) {
    const workoutId = document.getElementById('workout-select').value;
    const dateStr = document.getElementById('date-input').value;
    
    if (!workoutId || !dateStr) return;

    store.update('schedule', s => s.map(item => 
      item.id === session.id ? { ...item, workoutId, date: new Date(dateStr).toISOString() } : item
    ));
    
    toast("Workout updated successfully", "success");
    render();
  }

  function removeSession(id) {
    confirmDialog({
      title: "Remove Workout",
      message: "Are you sure you want to remove this scheduled workout?",
      confirmLabel: "Remove",
      danger: true
    }).then(confirmed => {
      if (confirmed) {
        store.update('schedule', s => s.filter(item => item.id !== id));
        toast("Workout removed", "success");
        render();
      }
    });
  }

  // Initial render
  window.addEventListener('DOMContentLoaded', () => {
    render();
  });
})();