document.addEventListener('DOMContentLoaded', () => {
  
  
  // Get workout ID from URL or use default
  const urlParams = new URLSearchParams(window.location.search);
  const workoutId = urlParams.get('id') || 'w-push';
  
  // Get workout data
  const workout = App.store.get('workouts').find(w => w.id === workoutId);
  if (!workout) {
    window.location.href = 'workout-library.html';
    return;
  }
  
  // Render workout detail
  renderWorkoutDetail(workout);
  
  // Set up event listeners
  setupEventListeners(workoutId);
});

function renderWorkoutDetail(workout) {
  const pageRoot = document.getElementById('page-root');
  pageRoot.innerHTML = '';
  
  // Create hero section with image placeholder
  const heroSection = App.el('div', { "class": "card mb-6" },
    [App.el('div', { "class": "card__head", style: "height: 200px; background: linear-gradient(135deg, #6757E8, #5142CD); border-radius: 8px 8px 0 0;" },
       [App.el('div', { "class": "hero-art", "aria-hidden": "true" }, App.artFor(workout, { bare: true })),
        App.el('div', { "class": "stack" },
          [App.el('h1', { "class": "card__title text-lg" }, workout.name),
           App.el('div', { "class": "chip" }, 
             [App.el('span', { "class": "text-sm" }, workout.category),
              App.el('span', { "class": "text-sm text-2" }, workout.level)])])]),
     App.el('div', { "class": "card__body p-4" },
       [App.el('div', { "class": "grid grid-3 gap-4 mb-4" },
          [App.el('div', { "class": "stack text-center" },
             [App.el('div', { "class": "num" }, workout.duration),
              App.el('div', { "class": "text-sm text-2" }, "MINUTES")]),
           App.el('div', { "class": "stack text-center" },
             [App.el('div', { "class": "num" }, workout.calories),
              App.el('div', { "class": "text-sm text-2" }, "CALORIES")]),
           App.el('div', { "class": "stack text-center" },
             [App.el('div', { "class": "num" }, workout.focus.length),
              App.el('div', { "class": "text-sm text-2" }, "MUSCLE GROUPS")])]),
        App.el('p', { "class": "text-2 mb-4" }, 
          "A comprehensive workout targeting your " + workout.focus.join(", ") + ". Perfect for building strength and endurance."),
        App.el('div', { "class": "mb-4" },
          [App.el('h3', { "class": "text-sm font-semibold mb-2" }, "Target Muscle Groups"),
           App.el('div', { "class": "chips" },
             workout.focus.map(f => App.el('span', { "class": "chip" }, f)))])])]);
  
  // Create exercises section
  const exercisesSection = App.el('div', { "class": "card mb-6" },
    [App.el('div', { "class": "card__head" },
       [App.el('h2', { "class": "card__title" }, "Exercises")]),
     App.el('div', { "class": "card__body p-4" },
       [App.el('ol', { "class": "stack gap-3" },
          workout.exercises.map((exercise, index) => {
            const repsValue = exercise.reps.split('-')[0] || exercise.reps;
            const volume = exercise.sets * parseInt(repsValue) * 10; // Simplified volume calculation
            return App.el('li', { "class": "row row-between align-center" },
              [App.el('div', { "class": "stack" },
                 [App.el('h3', { "class": "text-sm font-semibold mb-1" }, exercise.name),
                  App.el('div', { "class": "grid grid-3 gap-2 text-sm" },
                    [App.el('div', { "class": "text-2" }, `${exercise.sets} sets`),
                     App.el('div', { "class": "text-2" }, exercise.reps),
                     App.el('div', { "class": "text-2" }, `${exercise.rest}s rest`)]),
                  exercise.equipment ? App.el('div', { "class": "text-sm text-2 mt-1" }, `Equipment: ${exercise.equipment}`) : null]),
               App.el('div', { "class": "text-right" },
                 [App.el('span', { "class": "badge badge--accent" }, ((App.store.get('profile') || {}).units === 'imperial' ? Math.round(volume * 2.2046) + ' lbs' : volume + ' kg')),
                  App.el('div', { "class": "text-xs text-2 mt-1" }, "Volume")])]);
          }))])]);
  
  // Create action buttons
  const actionsSection = App.el('div', { "class": "card mb-6" },
    [App.el('div', { "class": "card__body p-4" },
       [App.el('div', { "class": "grid grid-2 gap-3" },
          [App.el('button', { "class": "btn btn-primary btn-lg btn-block", id: "start-workout-btn" }, "Start Workout"),
           App.el('button', { "class": "btn btn-ghost btn-lg btn-block", id: "add-to-plan-btn" }, "Add to Plan")]),
        App.el('div', { "class": "mt-3 text-center" },
          [App.el('button', { "class": "icon-btn", id: "favorite-btn" }, App.icon(App.store.get('favorites').includes(workout.id) ? 'star' : 'star')),
           App.el('span', { "class": "text-sm ml-2" }, "Favorite")])])]);
  
  // Append all sections
  pageRoot.appendChild(heroSection);
  pageRoot.appendChild(exercisesSection);
  pageRoot.appendChild(actionsSection);
}

function setupEventListeners(workoutId) {
  // Favorite toggle
  const favoriteBtn = document.getElementById('favorite-btn');
  if (favoriteBtn) {
    const isFavorite = App.store.get('favorites').includes(workoutId);
    favoriteBtn.innerHTML = '';
    favoriteBtn.appendChild(App.icon(isFavorite ? 'star' : 'star'));
    
    favoriteBtn.addEventListener('click', () => {
      const favorites = App.store.get('favorites');
      const index = favorites.indexOf(workoutId);
      
      if (index > -1) {
        // Remove from favorites
        favorites.splice(index, 1);
        App.toast('Removed from favorites', 'success');
      } else {
        // Add to favorites
        favorites.push(workoutId);
        App.toast('Added to favorites', 'success');
      }
      
      App.store.set('favorites', favorites);
      favoriteBtn.innerHTML = '';
      favoriteBtn.appendChild(App.icon(favorites.includes(workoutId) ? 'star' : 'star'));
    });
  }
  
  // Start workout button
  const startWorkoutBtn = document.getElementById('start-workout-btn');
  if (startWorkoutBtn) {
    startWorkoutBtn.addEventListener('click', () => {
      window.location.href = `active-workout.html?id=${workoutId}`;
    });
  }
  
  // Add to plan button
  const addToPlanBtn = document.getElementById('add-to-plan-btn');
  if (addToPlanBtn) {
    addToPlanBtn.addEventListener('click', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Create date picker dialog
      const dialogBody = App.el('div', { "class": "stack gap-4" },
        [App.el('p', { "class": "text-sm text-2" }, "Select a date for your workout:"),
         App.el('input', { 
           "type": "date", 
           "class": "input",
           "id": "workout-date",
           "value": tomorrow.toISOString().split('T')[0]
         })]);
      
      const confirmBtn = App.el('button', { "class": "btn btn-primary" }, "Add to Plan");
      const cancelBtn = App.el('button', { "class": "btn btn-ghost" }, "Cancel");
      
      const dialog = App.openDialog({
        title: "Schedule Workout",
        body: dialogBody,
        foot: [cancelBtn, confirmBtn]
      });
      
      // Handle confirmation
      confirmBtn.addEventListener('click', () => {
        const selectedDate = document.getElementById('workout-date').value;
        if (selectedDate) {
          const scheduleItem = {
            id: App.utils.uid('sc'),
            workoutId: workoutId,
            date: new Date(selectedDate).toISOString(),
            time: "07:00"
          };
          
          App.store.update('schedule', schedule => [...schedule, scheduleItem]);
          App.toast('Workout added to your plan', 'success');
          dialog.close();
        }
      });
      
      // Handle cancellation
      cancelBtn.addEventListener('click', () => {
        dialog.close();
      });
    });
  }
}