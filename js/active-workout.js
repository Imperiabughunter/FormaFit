(function () {
  "use strict";
  
  // Initialize the active workout page
  function initActiveWorkout() {
    const state = App.store.get();
    const requestedId = new URLSearchParams(window.location.search).get('id');
    let activeSession = state.activeWorkout || null;
    // Resume an unfinished session; start a fresh one when a different workout is requested or none is running.
    if (requestedId && (!activeSession || activeSession.workoutId !== requestedId)) activeSession = null;
    if (!activeSession) {
      const next = requestedId ? null : App.utils.nextScheduled();
      const startId = requestedId || (next && next.workoutId) || ((state.workouts || [])[0] || {}).id;
      const startWorkout = App.utils.workoutById(startId);
      if (!startWorkout) { window.location.href = 'workout-library.html'; return; }
      activeSession = { workoutId: startWorkout.id, startTime: new Date().toISOString(), exerciseIndex: 0,
        completedSets: [], restTime: startWorkout.exercises[0].rest };
      App.store.set('activeWorkout', activeSession);
    }
    
    const workout = App.utils.workoutById(activeSession.workoutId);
    if (!workout) {
      // Redirect to dashboard if workout not found
      window.location.href = 'dashboard.html';
      return;
    }
    
    renderActiveWorkout(workout, activeSession);
  }
  
  function renderActiveWorkout(workout, session) {
    const root = document.getElementById('page-root');
    root.innerHTML = '';
    
    // Workout header with progress
    const header = App.el('div', { "class": "page-head" },
      [App.el('h1', { "class": "text-lg" }, workout.name),
       App.el('p', { "class": "text-2 text-sm" }, `Session ${session.exerciseIndex + 1} of ${workout.exercises.length}`)]);
    
    // Progress bar
    const progress = Math.round(((session.exerciseIndex + 1) / workout.exercises.length) * 100);
    const progressBar = App.el('div', { "class": "progress" },
      [App.el('div', { "class": "progress__fill", style: `width: ${progress}%` })]);
    
    // Current exercise section
    const currentExercise = workout.exercises[session.exerciseIndex];
    const exerciseSection = App.el('div', { "class": "card mb-6 card--art" },
      [App.el('div', { "class": "exercise-art" }, App.artFor(workout)),
       App.el('div', { "class": "card__head" },
         [App.el('h2', { "class": "card__title" }, currentExercise.name)]),
       App.el('div', { "class": "stack" },
         [App.el('div', { "class": "grid grid-2 gap-4" },
            [App.el('div', { "class": "text-sm text-2" }, "Sets"),
             App.el('div', { "class": "text-sm text-2" }, "Reps")],
            [App.el('div', { "class": "text-lg" }, currentExercise.sets),
             App.el('div', { "class": "text-lg" }, currentExercise.reps)]),
          App.el('div', { "class": "mt-4" },
            [App.el('h3', { "class": "text-sm text-2 mb-2" }, "Instructions"),
             App.el('p', { "class": "text-sm" }, getExerciseInstructions(currentExercise.name))])])]);
    
    // Set tracking
    const setTracker = App.el('div', { "class": "card mb-6" },
      [App.el('div', { "class": "card__head" },
         [App.el('h2', { "class": "card__title" }, "Set Progress")]),
       App.el('div', { "class": "stack" },
         [App.el('div', { "class": "grid grid-3 gap-4 mb-4" },
            [...Array(currentExercise.sets).keys()].map(i => 
              App.el('div', { 
                "class": `chip ${session.completedSets[i] ? 'badge--success' : ''}` 
              }, `${i + 1}${session.completedSets[i] ? ' ✓' : ''}`)
            )),
          App.el('button', { 
            "class": "btn btn-primary btn-block", 
            onclick: () => completeSet(workout, session) 
          }, "Mark Set Complete")])]);
    
    // Rest timer
    const restSection = App.el('div', { "class": "card mb-6" },
      [App.el('div', { "class": "card__head" },
         [App.el('h2', { "class": "card__title" }, "Rest Timer")]),
       App.el('div', { "class": "stack text-center" },
         [App.el('div', { "class": "text-3xl font-bold mb-4", id: "rest-timer" }, formatTime(session.restTime)),
          App.el('div', { "class": "progress progress--lg mb-4" },
            [App.el('div', { 
              "class": "progress__fill", 
              style: `width: ${calculateRestPercentage(session.restTime, currentExercise.rest)}%` 
            })]),
          App.el('div', { "class": "grid grid-2 gap-4 mt-4" },
            [App.el('button', { 
              "class": "btn btn-ghost", 
              onclick: () => pauseTimer() 
            }, "Pause"),
             App.el('button', { 
               "class": "btn btn-primary", 
               onclick: () => resumeTimer() 
             }, "Resume")])])]);
    
    // Navigation controls
    const navControls = App.el('div', { "class": "grid grid-2 gap-4 mb-6" },
      [App.el('button', { 
        "class": "btn btn-ghost", 
        onclick: () => navigateExercise(workout, session, -1) 
      }, "Previous"),
       App.el('button', { 
         "class": "btn btn-primary", 
         onclick: () => navigateExercise(workout, session, 1) 
       }, "Next")]);
    
    // Session controls
    const sessionControls = App.el('div', { "class": "grid grid-2 gap-4 mb-6" },
      [App.el('button', { 
        "class": "btn btn-ghost", 
        onclick: () => pauseWorkout() 
      }, "Pause"),
       App.el('button', { 
         "class": "btn btn-danger", 
         onclick: () => finishWorkout(workout, session) 
       }, "Finish Workout")]);
    
    // Assemble page
    root.appendChild(header);
    root.appendChild(progressBar);
    root.appendChild(exerciseSection);
    root.appendChild(setTracker);
    root.appendChild(restSection);
    root.appendChild(navControls);
    root.appendChild(sessionControls);
    
    // Start timer
    startRestTimer(workout, session);
  }
  
  function getExerciseInstructions(name) {
    const instructions = {
      "Easy Warm-up": "Jog or walk at a conversational pace. Gradually raise your heart rate and keep your shoulders relaxed.",
      "Tempo Intervals": "Run at a comfortably hard pace you could hold for about 20 minutes. Keep your breathing controlled and your stride smooth.",
      "Cool-down Jog": "Slow to an easy jog, then a walk. Let your heart rate drop gradually and finish with light stretching.",
      "Seated Overhead Press": "Sit upright with your back supported. Press the dumbbells overhead without arching your lower back, then lower with control.",
      "Dumbbell Lateral Raise": "Hold light dumbbells at your sides. Raise your arms out to shoulder height with a soft bend in the elbows, then lower slowly.",
      "Rear Delt Fly": "Hinge forward with a flat back. Open your arms wide like wings, squeezing the shoulder blades, then return slowly.",
      "Hammer Curl": "Hold dumbbells with palms facing each other. Curl up without swinging your torso and lower under control.",
      "Kettlebell Swing": "Hinge at the hips and snap them forward to swing the bell to chest height. Keep your back flat; the power comes from the hips, not the arms.",
      "Goblet Squat": "Hold the kettlebell at your chest. Sit between your knees with an upright torso, then drive through your heels to stand.",
      "Kettlebell Clean & Press": "Pull the bell to the rack position at your shoulder, then press it overhead. Lower it back to the rack and then to the floor with control.",
      "Farmer's Carry": "Pick up a heavy weight in each hand. Stand tall, brace your core and walk with short, steady steps.",
      "Battle Rope Waves": "Stand in a half squat holding a rope end in each hand. Alternate fast arm waves, keeping your core braced.",
      "Box Step-Ups": "Place one foot fully on the box and drive up through that heel. Stand tall at the top, then step down slowly.",
      "Medicine Ball Slam": "Raise the ball overhead, then slam it down hard in front of you using your whole body. Catch it on the bounce and repeat.",
      "Bodyweight Row": "Hang under a bar or rings with a straight body. Pull your chest to the hands and lower with control.",
      "Quad Foam Roll": "Lie face down with the roller under your thighs. Roll slowly from hip to knee and pause on tender spots for a few breaths.",
      "Upper Back Roll": "Lie with the roller under your shoulder blades and hands behind your head. Roll slowly up and down, supporting your hips.",
      "Calf Release": "Sit with the roller under your calf. Lift your hips and roll slowly from ankle to knee, crossing the other leg on top for pressure.",
      "Glute Ball Release": "Sit on a massage ball under one glute. Cross that ankle over the other knee and shift slowly until you find a tender spot.",
      "Box Breathing": "Inhale for four counts, hold for four, exhale for four, hold for four. Breathe through your nose and keep your shoulders soft.",
      "Child's Pose": "Kneel, sit back toward your heels and reach your arms forward. Rest your forehead down and breathe into your back.",
      "Supine Twist": "Lie on your back, drop both knees to one side and open the opposite arm. Keep your shoulders on the floor and breathe slowly.",
      "Legs Up the Wall": "Lie on your back with your hips close to a wall and your legs resting up the wall. Relax your arms and breathe slowly.",
      "Dynamic Warm-up": "Move through leg swings, high knees, butt kicks and skips. Build speed gradually until your muscles feel warm.",
      "Sprint 200 m": "Accelerate smoothly, run tall and relaxed at about 90 percent effort, and keep your arms driving forward and back.",
      "Walk-back Recovery": "Walk back slowly to the start, breathing deeply. Let your heart rate drop before the next effort.",
      "Barbell Bench Press": "Lie on the bench with feet flat on floor. Grip barbell slightly wider than shoulder-width. Lower bar to chest, pause, then press up.",
      "Incline Dumbbell Press": "Set incline to 30-45 degrees. Hold dumbbells at chest level. Press upward in a controlled motion.",
      "Cable Lateral Raise": "Use high cable position. Raise arms out to sides until parallel with floor. Keep slight bend in elbows.",
      "Overhead Triceps Extension": "Hold barbell overhead with arms extended. Lower bar behind head by bending elbows. Extend back up.",
      "Pull-Ups": "Grab bar with overhand grip, hands slightly wider than shoulder-width. Pull body up until chin clears bar.",
      "Barbell Row": "Bend forward at hips with knees straight. Pull bar to lower chest while keeping elbows close.",
      "Face Pull": "Attach rope to high pulley. Pull rope toward face, elbows flared out. Squeeze rear delts at top.",
      "Barbell Curl": "Hold barbell with palms facing forward. Curl weight up toward shoulders. Keep elbows stationary.",
      "Back Squat": "Stand with feet shoulder-width apart. Lower body by bending knees and hips until thighs are parallel to floor.",
      "Romanian Deadlift": "With barbell, hinge at hips while keeping legs straight. Lower bar down the front of legs until slight bend in knees.",
      "Walking Lunge": "Step forward into lunge, lowering back knee toward ground. Keep torso upright and chest up.",
      "Standing Calf Raise": "Stand on edge of step or platform. Raise up onto toes, then lower slowly.",
      "Burpees": "Start in standing position. Drop to floor in plank, do push-up, jump feet to hands, then explode upward.",
      "Mountain Climbers": "In plank position, alternate pulling knees toward chest rapidly while keeping core tight.",
      "Jump Squats": "Perform squat, then explode upward into jump. Land softly and immediately repeat.",
      "Plank Shoulder Taps": "In plank position, tap opposite shoulder with hand while maintaining stable core.",
      "Dead Bug": "Lie on back with arms up and knees bent. Lower opposite arm and leg toward floor without arching back.",
      "Pallof Press": "Attach rope to anchor point at chest height. Push away from anchor point in a controlled motion.",
      "Hanging Knee Raise": "Hang from bar, pull knees toward chest. Keep core tight throughout movement.",
      "Side Plank": "Lie on side, lift body up on forearm and feet. Keep body straight from head to feet.",
      "Sun Salutation A": "Begin standing. Raise arms overhead, bend forward, step back into plank, do push-up, return to forward fold.",
      "Warrior II Hold": "Step feet wide, turn one foot out, bend front knee. Extend arms parallel to floor.",
      "Pigeon Pose": "From kneeling position, bring one leg forward and place it behind the opposite hip.",
      "Seated Forward Fold": "Sit with legs extended. Fold forward from hips, reach toward toes."
    };
    
    return instructions[name] || "Follow standard form for this exercise.";
  }
  
  function calculateRestPercentage(currentTime, totalTime) {
    if (totalTime <= 0) return 0;
    const percentage = ((totalTime - currentTime) / totalTime) * 100;
    return Math.max(0, Math.min(100, percentage));
  }
  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  let restTimerInterval = null;
  let isPaused = false;
  
  function startRestTimer(workout, session) {
    if (restTimerInterval) clearInterval(restTimerInterval);
    
    const currentExercise = workout.exercises[session.exerciseIndex];
    const timerElement = document.getElementById('rest-timer');
    
    restTimerInterval = setInterval(() => {
      if (!isPaused && session.restTime > 0) {
        session.restTime--;
        App.store.update('activeWorkout', () => ({ ...session }));
        
        if (timerElement) {
          timerElement.textContent = formatTime(session.restTime);
        }
        
        // Update progress bar
        const progressBar = document.querySelector('.progress__fill');
        if (progressBar) {
          const percentage = calculateRestPercentage(session.restTime, currentExercise.rest);
          progressBar.style.width = `${percentage}%`;
        }
      } else if (session.restTime <= 0) {
        clearInterval(restTimerInterval);
        // Move to next exercise when timer finishes
        navigateExercise(workout, session, 1);
      }
    }, 1000);
  }
  
  function pauseTimer() {
    isPaused = true;
  }
  
  function resumeTimer() {
    isPaused = false;
  }
  
  function completeSet(workout, session) {
    const currentExercise = workout.exercises[session.exerciseIndex];
    
    if (!session.completedSets) session.completedSets = [];
    
    // Mark the next set as completed
    const nextSet = session.completedSets.length;
    if (nextSet < currentExercise.sets) {
      session.completedSets[nextSet] = true;
      App.store.update('activeWorkout', () => ({ ...session }));
      
      // If all sets are done, move to next exercise
      if (session.completedSets.length === currentExercise.sets) {
        navigateExercise(workout, session, 1);
      }
    }
  }
  
  function navigateExercise(workout, session, direction) {
    const newIndex = session.exerciseIndex + direction;
    
    // Validate index
    if (newIndex < 0 || newIndex >= workout.exercises.length) {
      // End of workout
      finishWorkout(workout, session);
      return;
    }
    
    // Update session
    session.exerciseIndex = newIndex;
    session.restTime = workout.exercises[newIndex].rest;
    session.completedSets = [];
    App.store.update('activeWorkout', () => ({ ...session }));
    
    // Re-render
    renderActiveWorkout(workout, session);
  }
  
  function pauseWorkout() {
    const state = App.store.get();
    if (state.activeWorkout) {
      // Save to localStorage for resumption
      localStorage.setItem('formafit-active-workout-pause', JSON.stringify(state.activeWorkout));
      App.toast("Workout paused. You can resume later.", "info");
      window.location.href = 'dashboard.html';
    }
  }
  
  function finishWorkout(workout, session) {
    // Get current time for duration calculation
    const now = new Date();
    
    // Calculate session metrics
    const duration = Math.round((now - new Date(session.startTime)) / 60000); // minutes
    const calories = workout.calories || 300;
    const volume = calculateVolume(workout, session);
    
    // Create completed session
    const completedSession = {
      id: App.utils.uid('s'),
      workoutId: workout.id,
      date: now.toISOString(),
      duration: duration,
      calories: calories,
      volume: volume,
      rating: 4 // Default rating
    };
    
    // Save to store
    App.store.update('sessions', (sessions) => [completedSession, ...sessions]);
    
    // Clear active workout
    App.store.set('activeWorkout', null);
    localStorage.removeItem('formafit-active-workout-pause');
    
    // Show completion message
    const dialog = App.openDialog({
      title: "Workout Complete!",
      body: [
        `Great job completing ${workout.name}!`,
        `Duration: ${duration} minutes`,
        `Calories burned: ${calories}`,
        `Volume: ${(App.store.get('profile') || {}).units === 'imperial' ? Math.round(volume * 2.2046) + ' lbs' : volume + ' kg'}`
      ],
      foot: [App.el('button', { "class": "btn btn-primary", onclick: () => window.location.href = 'dashboard.html' }, "Continue")]
    });
    
    // Add notification
    App.addNotification({
      title: "Session completed",
      body: `${workout.name} finished — ${duration} min, ${calories} kcal logged.`,
      type: "success"
    });
  }
  
  function calculateVolume(workout, session) {
    let total = 0;
    // For simplicity, we'll just return a placeholder value
    // In a real app, this would calculate based on sets, reps, and weights
    return Math.round(workout.duration * workout.calories / 10);
  }
  
  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActiveWorkout);
  } else {
    initActiveWorkout();
  }
})();