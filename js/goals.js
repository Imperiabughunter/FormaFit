(function () {
  "use strict";

  function renderGoals() {
    const goals = App.store.get("goals") || [];
    const activeGoals = goals.filter(g => !App.utils.goalDone(g));
    const completedGoals = goals.filter(g => App.utils.goalDone(g));

    const page = document.getElementById("page-root");
    if (!page) return;

    page.innerHTML = "";

    const header = App.el("div", { "class": "page-head" },
      [App.el("h1", { "class": "text-lg" }, "My Goals"),
       App.el("button", { "class": "btn btn-primary", onclick: showCreateGoalDialog }, [App.icon("plus"), " New Goal"])]);
    
    const activeSection = App.el("div", { "class": "mb-6" },
      [App.el("h2", { "class": "text-lg mb-4" }, "Active Goals"),
       activeGoals.length ? 
         App.el("div", { "class": "grid grid-2" }, activeGoals.map(renderGoalCard)) : 
         App.el("div", { "class": "empty" },
           [App.el("div", { "class": "empty__icon" }, App.icon("target")),
            App.el("p", { "class": "text-sm text-2" }, "No active goals. Create one to get started!")])]);

    const completedSection = App.el("div", { "class": "mb-6" },
      [App.el("h2", { "class": "text-lg mb-4" }, "Completed Goals"),
       completedGoals.length ? 
         App.el("div", { "class": "grid grid-2" }, completedGoals.map(renderGoalCard)) : 
         App.el("div", { "class": "empty" },
           [App.el("div", { "class": "empty__icon" }, App.icon("check")),
            App.el("p", { "class": "text-sm text-2" }, "No completed goals yet.")])]);

    page.appendChild(header);
    page.appendChild(activeSection);
    page.appendChild(completedSection);
  }

  function renderGoalCard(goal) {
    const progress = App.utils.goalProgress(goal);
    const remaining = App.utils.goalRemaining(goal);
    const unit = goal.unit || "";
    const periodLabel = goal.period === "week" ? "per week" : 
                       goal.period === "month" ? "per month" : 
                       goal.period === "day" ? "per day" : "";
    
    const progressEl = App.el("div", { "class": "progress" },
      [App.el("div", { "class": "progress__fill", style: `width: ${progress}%` }),
       App.el("span", { "class": "progress-label text-sm" }, `${progress}%`)]);
    
    const remainingEl = App.el("div", { "class": "text-sm mt-2" },
      [App.el("span", { "class": "text-2" }, "Remaining: "),
       App.el("span", { "class": "font-medium" }, `${remaining} ${unit}`)]);
    
    const actions = App.el("div", { "class": "mt-4 flex gap-2" },
      [App.el("button", { "class": "btn btn-ghost btn-sm", onclick: () => showEditGoalDialog(goal) }, "Edit"),
       App.el("button", { "class": "btn btn-ghost btn-sm btn-danger", onclick: () => deleteGoal(goal.id) }, "Delete")]);

    const statusBadge = App.utils.goalDone(goal) ? 
      App.el("span", { "class": "badge badge--success" }, "Completed") : 
      App.el("span", { "class": "badge badge--accent" }, "Active");

    return App.el("div", { "class": "card card--hover" },
      [App.el("div", { "class": "card__head" },
         [App.el("h3", { "class": "card__title" }, goal.name),
          statusBadge]),
       App.el("p", { "class": "text-sm text-2 mt-1" }, `${goal.type} ${periodLabel}`),
       App.el("div", { "class": "mt-3" }, progressEl),
       remainingEl,
       actions]);
  }

  function showCreateGoalDialog() {
    const form = App.el("form", { "class": "form-row gap-4", onsubmit: createGoal },
      [App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Goal Name"),
          App.el("input", { "class": "input", type: "text", name: "name", required: true, placeholder: "e.g., Weekly Training Volume" })]),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Goal Type"),
          App.el("select", { "class": "select", name: "type", required: true },
            [App.el("option", { value: "", disabled: true, selected: true }, "Select type"),
             App.el("option", { value: "workouts" }, "Workout Sessions"),
             App.el("option", { value: "volume" }, "Training Volume (kg)"),
             App.el("option", { value: "distance" }, "Distance (km)"),
             App.el("option", { value: "weight" }, "Weight (kg)"),
             App.el("option", { value: "steps" }, "Steps")])]),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Target Value"),
          App.el("input", { "class": "input", type: "number", name: "target", required: true, min: 1 })]),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Period"),
          App.el("select", { "class": "select", name: "period", required: true },
            [App.el("option", { value: "", disabled: true, selected: true }, "Select period"),
             App.el("option", { value: "day" }, "Daily"),
             App.el("option", { value: "week" }, "Weekly"),
             App.el("option", { value: "month" }, "Monthly")])]),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Unit"),
          App.el("input", { "class": "input", type: "text", name: "unit", required: true, placeholder: "e.g., sessions, kg, km" })])]);

    const actions = App.el("div", { "class": "form-actions" },
      [App.el("button", { "class": "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Cancel"),
       App.el("button", { "class": "btn btn-primary", type: "submit" }, "Create Goal")]);

    const dlg = App.openDialog({
      title: "Create New Goal",
      body: form,
      foot: actions
    });
    goalDialog = dlg;

    // Focus first input
    setTimeout(() => {
      const inputs = form.querySelectorAll("input, select");
      if (inputs[0]) inputs[0].focus();
    }, 10);
  }

  let goalDialog = null;

  function createGoal(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const name = formData.get("name");
    const type = formData.get("type");
    const target = parseFloat(formData.get("target"));
    const period = formData.get("period");
    const unit = formData.get("unit");

    if (!name || !type || isNaN(target) || !period || !unit) {
      App.toast("Please fill all fields correctly", "danger");
      return;
    }
    if (target <= 0) {
      App.toast("Target must be greater than 0", "danger");
      return;
    }

    const newGoal = {
      id: App.utils.uid("g"),
      name,
      type,
      target,
      current: 0,
      unit,
      period,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active"
    };

    App.store.update("goals", arr => [...arr, newGoal]);
    renderGoals();
    if (goalDialog) goalDialog.close();
    App.toast("Goal created successfully", "success");
  }

  function showEditGoalDialog(goal) {
    const form = App.el("form", { "class": "form-row gap-4", onsubmit: updateGoal },
      [App.el("input", { type: "hidden", name: "id", value: goal.id }),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Goal Name"),
          App.el("input", { "class": "input", type: "text", name: "name", required: true, value: goal.name })]),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Target Value"),
          App.el("input", { "class": "input", type: "number", name: "target", required: true, min: 1, value: goal.target })]),
       App.el("div", { "class": "field flex-1" },
         [App.el("label", { "class": "text-sm" }, "Unit"),
          App.el("input", { "class": "input", type: "text", name: "unit", required: true, value: goal.unit })])]);

    const actions = App.el("div", { "class": "form-actions" },
      [App.el("button", { "class": "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Cancel"),
       App.el("button", { "class": "btn btn-primary", type: "submit" }, "Update Goal")]);

    const dlg = App.openDialog({
      title: "Edit Goal",
      body: form,
      foot: actions
    });
  }

  function updateGoal(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const id = formData.get("id");
    const name = formData.get("name");
    const target = parseFloat(formData.get("target"));
    const unit = formData.get("unit");

    if (!id || !name || isNaN(target) || !unit) {
      App.toast("Please fill all fields correctly", "danger");
      return;
    }

    App.store.update("goals", arr => 
      arr.map(g => 
        g.id === id ? { ...g, name, target, unit, updatedAt: new Date().toISOString() } : g
      )
    );
    
    renderGoals();
    App.toast("Goal updated successfully", "success");
  }

  function deleteGoal(id) {
    App.confirmDialog({
      title: "Delete Goal",
      message: "Are you sure you want to delete this goal? This action cannot be undone.",
      confirmLabel: "Delete Goal",
      danger: true
    }).then(confirmed => {
      if (confirmed) {
        App.store.update("goals", arr => arr.filter(g => g.id !== id));
        renderGoals();
        App.toast("Goal deleted", "success");
      }
    });
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", function() {
    const goals = App.store.get("goals");
    if (!goals) {
      App.store.set("goals", [
        {
          id: "g1",
          name: "Weekly Workouts",
          type: "workouts",
          target: 5,
          current: 3,
          unit: "sessions",
          period: "week",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active"
        },
        {
          id: "g2",
          name: "Monthly Volume",
          type: "volume",
          target: 500,
          current: 300,
          unit: "kg",
          period: "month",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active"
        }
      ]);
    }
    
    renderGoals();
    App.store.subscribe(renderGoals);
  });
})();