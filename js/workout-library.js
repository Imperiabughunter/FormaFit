(function () {
  "use strict";

  const store = App.store;
  const utils = App.utils;
  const el = App.el;
  const icon = App.icon;

  // Filter state
  let filters = {
    search: "",
    categories: [],
    levels: [],
    duration: ""
  };

  // View state
  let viewMode = "grid"; // 'grid' or 'list'

  // DOM elements
  let searchInput, categoryFilters, levelFilters, durationFilter, viewToggle, clearFiltersBtn;
  let workoutsContainer;

  // Initialize the page
  function init() {
    render();
    bindEvents();
    applyFilters();
  }

  // Render the entire page
  function render() {
    const root = document.getElementById('page-root');
    root.innerHTML = '';

    // Page header
    const pageHead = el('div', { "class": "page-head" },
      [el('h2', { "class": "text-lg" }, "Workout Library"),
       el('p', { "class": "text-2" }, "Browse and discover workouts for your fitness journey")]);

    // Filters section
    const filtersSection = el('div', { "class": "grid grid-2 mb-6" },
      [renderSearchFilter(),
       renderCategoryFilters(),
       renderLevelFilters(),
       renderDurationFilter()]);

    // View controls
    const viewControls = el('div', { "class": "row row-between mb-4" },
      [el('div', { "class": "text-sm text-2" }, "Showing " + (store.get('workouts') || []).length + " workouts"),
       renderViewToggle()]);

    // Clear filters button
    clearFiltersBtn = el('button', { 
      "class": "btn btn-ghost btn-sm", 
      type: "button",
      style: "display: none;"
    }, ["Clear Filters", icon("minus")]);

    clearFiltersBtn.addEventListener('click', function() {
      resetFilters();
      applyFilters();
    });

    // Workouts container
    workoutsContainer = el('div', { "class": "grid grid-3 stagger" });
    
    root.appendChild(pageHead);
    root.appendChild(filtersSection);
    root.appendChild(viewControls);
    root.appendChild(clearFiltersBtn);
    root.appendChild(workoutsContainer);

    // Apply filters after initial render to show correct state
    applyFilters();
  }

  // Render search filter
  function renderSearchFilter() {
    const container = el('div', { "class": "field" });
    searchInput = el('input', {
      type: "text",
      placeholder: "Search workouts...",
      "aria-label": "Search workouts"
    });
    
    const searchIcon = el('span', { "class": "icon-btn", style: "position: absolute; right: 12px; top: 50%; transform: translateY(-50%);" }, icon("search"));
    container.appendChild(searchInput);
    container.appendChild(searchIcon);
    
    return container;
  }

  // Render category filters
  function renderCategoryFilters() {
    const categories = ["Strength", "Cardio", "Mobility", "Recovery", "Full Body"];
    const container = el('div', { "class": "field" });
    const label = el('label', { "class": "text-sm text-2 mb-2" }, "Category");
    container.appendChild(label);
    
    categoryFilters = [];
    categories.forEach(category => {
      const id = `cat-${category.toLowerCase()}`;
      const checkbox = el('input', {
        type: "checkbox",
        id: id,
        value: category
      });
      
      const label = el('label', { "class": "chip", for: id }, category);
      container.appendChild(el('div', { "class": "chips" }, [checkbox, label]));
      
      checkbox.addEventListener('change', function() {
        applyFilters();
      });
      
      categoryFilters.push(checkbox);
    });
    
    return container;
  }

  // Render level filters
  function renderLevelFilters() {
    const levels = ["Beginner", "Intermediate", "Advanced"];
    const container = el('div', { "class": "field" });
    const label = el('label', { "class": "text-sm text-2 mb-2" }, "Difficulty");
    container.appendChild(label);
    
    levelFilters = [];
    levels.forEach(level => {
      const id = `level-${level.toLowerCase()}`;
      const checkbox = el('input', {
        type: "checkbox",
        id: id,
        value: level
      });
      
      const label = el('label', { "class": "chip", for: id }, level);
      container.appendChild(el('div', { "class": "chips" }, [checkbox, label]));
      
      checkbox.addEventListener('change', function() {
        applyFilters();
      });
      
      levelFilters.push(checkbox);
    });
    
    return container;
  }

  // Render duration filter
  function renderDurationFilter() {
    const container = el('div', { "class": "field" });
    const label = el('label', { "class": "text-sm text-2 mb-2" }, "Duration");
    container.appendChild(label);
    
    durationFilter = el('select', { 
      "class": "select",
      "aria-label": "Select duration filter"
    });
    
    const options = [
      { value: "", text: "Any Duration" },
      { value: "<30", text: "Under 30 min" },
      { value: "30-60", text: "30-60 min" },
      { value: ">60", text: "Over 60 min" }
    ];
    
    options.forEach(opt => {
      const option = el('option', { value: opt.value }, opt.text);
      durationFilter.appendChild(option);
    });
    
    durationFilter.addEventListener('change', function() {
      applyFilters();
    });
    
    container.appendChild(durationFilter);
    return container;
  }

  // Render view toggle
  function renderViewToggle() {
    const gridBtn = el('button', { 
      "class": "icon-btn" + (viewMode === "grid" ? " is-active" : ""), 
      type: "button",
      "aria-label": "Grid view"
    }, icon("dashboard"));
    
    const listBtn = el('button', { 
      "class": "icon-btn" + (viewMode === "list" ? " is-active" : ""), 
      type: "button",
      "aria-label": "List view"
    }, icon("list"));
    
    gridBtn.addEventListener('click', function() {
      viewMode = "grid";
      applyFilters();
    });
    
    listBtn.addEventListener('click', function() {
      viewMode = "list";
      applyFilters();
    });
    
    return el('div', { "class": "row" }, [gridBtn, listBtn]);
  }

  // Bind all events
  function bindEvents() {
    searchInput.addEventListener('input', function() {
      filters.search = this.value;
      applyFilters();
    });

    // Add event listeners to clear filters button
    const filterElements = [
      ...categoryFilters,
      ...levelFilters,
      durationFilter
    ];
    
    filterElements.forEach(el => {
      if (el.addEventListener) {
        el.addEventListener('change', function() {
          updateClearFiltersVisibility();
        });
      }
    });
  }

  // Apply filters to workouts and render results
  function applyFilters() {
    filters.categories = categoryFilters.filter(cb => cb.checked).map(cb => cb.value);
    filters.levels = levelFilters.filter(cb => cb.checked).map(cb => cb.value);
    const workouts = store.get('workouts') || [];
    let filteredWorkouts = [...workouts];
    
    // Apply search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filteredWorkouts = filteredWorkouts.filter(w => 
        w.name.toLowerCase().includes(term) ||
        w.focus.some(f => f.toLowerCase().includes(term)) ||
        w.category.toLowerCase().includes(term)
      );
    }
    
    // Apply category filter
    if (filters.categories.length > 0) {
      filteredWorkouts = filteredWorkouts.filter(w => 
        filters.categories.includes(w.category)
      );
    }
    
    // Apply level filter
    if (filters.levels.length > 0) {
      filteredWorkouts = filteredWorkouts.filter(w => 
        filters.levels.includes(w.level)
      );
    }
    
    // Apply duration filter
    if (filters.duration) {
      filteredWorkouts = filteredWorkouts.filter(w => {
        const duration = w.duration;
        switch(filters.duration) {
          case "<30":
            return duration < 30;
          case "30-60":
            return duration >= 30 && duration <= 60;
          case ">60":
            return duration > 60;
          default:
            return true;
        }
      });
    }
    
    // Update clear filters button visibility
    updateClearFiltersVisibility();
    
    // Render filtered workouts
    renderWorkouts(filteredWorkouts);
  }

  // Update clear filters button visibility
  function updateClearFiltersVisibility() {
    const hasActiveFilters = 
      filters.search || 
      filters.categories.length > 0 || 
      filters.levels.length > 0 || 
      filters.duration;
    
    clearFiltersBtn.style.display = hasActiveFilters ? "inline-flex" : "none";
  }

  // Reset all filters
  function resetFilters() {
    filters = {
      search: "",
      categories: [],
      levels: [],
      duration: ""
    };
    
    searchInput.value = "";
    
    categoryFilters.forEach(cb => {
      cb.checked = false;
    });
    
    levelFilters.forEach(cb => {
      cb.checked = false;
    });
    
    durationFilter.value = "";
  }

  // Render workouts based on view mode
  function renderWorkouts(workouts) {
    workoutsContainer.innerHTML = '';
    
    if (workouts.length === 0) {
      const emptyState = el('div', { "class": "empty" },
        [el('div', { "class": "empty__icon" }, icon("dumbbell")),
         el('h3', { "class": "text-lg mb-2" }, "No workouts found"),
         el('p', { "class": "text-2 mb-4" }, "Try adjusting your filters or search term")]);
      
      workoutsContainer.appendChild(emptyState);
      return;
    }
    
    // Sort workouts by name
    workouts.sort((a, b) => a.name.localeCompare(b.name));
    
    const cards = workouts.map(workout => {
      const isFavorite = (store.get('favorites') || []).includes(workout.id);
      
      const card = el('div', { "class": "card card--hover" });
      
      // Workout image placeholder
      const imgPlaceholder = el('div', { 
        "class": "card__img",
        style: "background-color: #F0EEFF; display: flex; align-items: center; justify-content: center; height: 160px;"
      }, [App.artFor(workout)]);
      
      // Workout details
      const details = el('div', { "class": "card__body" },
        [el('div', { "class": "row row-between mb-2" },
           [el('h3', { "class": "card__title" }, workout.name),
            el('button', {
              "class": "icon-btn",
              "aria-label": isFavorite ? "Remove from favorites" : "Add to favorites"
            }, icon("star"))]),
         el('div', { "class": "row row-between mb-2" },
           [el('span', { "class": "text-sm text-2" }, workout.category),
            el('span', { "class": "text-sm text-2" }, `${workout.duration} min`)]),
         el('div', { "class": "row row-between mb-3" },
           [el('span', { "class": "text-sm text-2" }, workout.level),
            el('span', { "class": "text-sm text-2" }, `${workout.calories} kcal`)]),
         el('div', { "class": "chip chips mb-3" },
           workout.focus.map(f => el('span', { "class": "chip" }, f)))]);
      
      card.appendChild(imgPlaceholder);
      card.appendChild(details);
      
      // Add click handler to open detail page
      card.addEventListener('click', function() {
        window.location.href = `workout-detail.html?id=${workout.id}`;
      });
      
      return card;
    });
    
    if (viewMode === "list") {
      workoutsContainer.className = "grid grid-1";
      workoutsContainer.style.gap = "12px";
    } else {
      workoutsContainer.className = "grid grid-3 stagger";
    }
    
    workoutsContainer.append(...cards);
  }

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();