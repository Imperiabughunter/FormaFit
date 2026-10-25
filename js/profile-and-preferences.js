(function () {
  "use strict";

  document.addEventListener('DOMContentLoaded', function () {
    const state = App.store.get();
    const profile = state.profile;

    // Build the page content
    const pageContent = App.el('div', { class: 'page-content' }, [
      App.el('h1', { class: 'page-title' }, 'Profile and Preferences'),
      
      // Profile Section
      App.el('section', { class: 'settings-section' }, [
        App.el('h2', { class: 'section-title' }, 'Profile'),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'name' }, 'Display Name'),
          App.el('input', { 
            type: 'text', 
            id: 'name',
            class: 'form-input',
            value: profile.name || ''
          })
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'email' }, 'Email Address'),
          App.el('input', { 
            type: 'email', 
            id: 'email',
            class: 'form-input',
            value: profile.email || ''
          })
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'avatar' }, 'Profile Image'),
          App.el('div', { class: 'avatar-preview' }, [
            App.el('span', { 
              class: 'avatar',
              id: 'avatar'
            }, profile.avatar || (profile.name ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'U'))
          ])
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'units' }, 'Preferred Units'),
          App.el('select', { 
            id: 'units',
            class: 'form-select'
          }, [
            App.el('option', { value: 'metric' }, 'Metric (kg, cm)'),
            App.el('option', { value: 'imperial' }, 'Imperial (lbs, ft)')
          ])
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', {}, 'Workout Days'),
          App.el('input', { type: 'hidden', id: 'workout-days', value: profile.workoutDays || 'Mon,Wed,Fri' }),
          App.el('div', { class: 'chips', role: 'group', 'aria-label': 'Preferred workout days' },
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (day) {
              const picked = (profile.workoutDays || 'Mon,Wed,Fri').split(',');
              return [
                App.el('input', { type: 'checkbox', id: 'day-' + day, value: day, checked: picked.indexOf(day) !== -1,
                  onchange: function () {
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter(function (d) { return document.getElementById('day-' + d).checked; });
                    document.getElementById('workout-days').value = days.join(',');
                  } }),
                App.el('label', { class: 'chip', for: 'day-' + day }, day)
              ];
            }))
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'fitness-focus' }, 'Fitness Focus'),
          App.el('select', { 
            id: 'fitness-focus',
            class: 'form-select'
          }, [
            App.el('option', { value: 'strength' }, 'Strength'),
            App.el('option', { value: 'endurance' }, 'Endurance'),
            App.el('option', { value: 'flexibility' }, 'Flexibility'),
            App.el('option', { value: 'weight-loss' }, 'Weight Loss'),
            App.el('option', { value: 'muscle-gain' }, 'Muscle Gain')
          ])
        ])
      ]),
      
      // Preferences Section
      App.el('section', { class: 'settings-section' }, [
        App.el('h2', { class: 'section-title' }, 'Preferences'),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'theme' }, 'Theme'),
          App.el('select', { 
            id: 'theme',
            class: 'form-select'
          }, [
            App.el('option', { value: 'light' }, 'Light'),
            App.el('option', { value: 'dark' }, 'Dark')
          ])
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'default-duration' }, 'Default Workout Duration (minutes)'),
          App.el('input', { 
            type: 'number', 
            id: 'default-duration',
            class: 'form-input',
            min: '15',
            max: '120',
            value: profile.defaultDuration || 45
          })
        ]),
        
        App.el('div', { class: 'form-group' }, [
          App.el('label', { for: 'dashboard-display' }, 'Dashboard Display'),
          App.el('select', { 
            id: 'dashboard-display',
            class: 'form-select'
          }, [
            App.el('option', { value: 'overview' }, 'Overview'),
            App.el('option', { value: 'progress' }, 'Progress'),
            App.el('option', { value: 'schedule' }, 'Schedule')
          ])
        ]),
        
        App.el('div', { class: 'form-group form-checkbox' }, [
          App.el('input', { 
            type: 'checkbox', 
            id: 'notifications',
            class: 'form-checkbox-input',
            checked: profile.notifications !== false
          }),
          App.el('label', { for: 'notifications' }, 'Enable Notifications')
        ]),
        
        App.el('div', { class: 'form-group form-checkbox' }, [
          App.el('input', { 
            type: 'checkbox', 
            id: 'sound',
            class: 'form-checkbox-input',
            checked: profile.sound !== false
          }),
          App.el('label', { for: 'sound' }, 'Sound for Workout Timers')
        ])
      ]),
      
      // Actions Section
      App.el('section', { class: 'settings-section actions' }, [
        App.el('div', { class: 'action-buttons' }, [
          App.el('button', { 
            id: 'save-btn',
            class: 'btn btn-primary'
          }, 'Save Changes'),
          
          App.el('button', { 
            id: 'reset-btn',
            class: 'btn btn-secondary'
          }, 'Reset Preferences'),
          
          App.el('button', { 
            id: 'clear-data-btn',
            class: 'btn btn-danger'
          }, 'Clear Local Data')
        ])
      ])
    ]);

    // Inject content into page root
    const pageRoot = document.getElementById('page-root');
    pageRoot.appendChild(pageContent);

    // Get references to form elements after DOM insertion
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const avatarSpan = document.getElementById('avatar');
    const unitsSelect = document.getElementById('units');
    const themeSelect = document.getElementById('theme');
    const workoutDaysInput = document.getElementById('workout-days');
    const fitnessFocusSelect = document.getElementById('fitness-focus');
    const defaultDurationInput = document.getElementById('default-duration');
    const dashboardDisplaySelect = document.getElementById('dashboard-display');
    const notificationToggle = document.getElementById('notifications');
    const soundToggle = document.getElementById('sound');
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');

    // Initialize form with current profile data
    nameInput.value = profile.name || '';
    emailInput.value = profile.email || '';
    avatarSpan.textContent = profile.avatar || (profile.name ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'U');
    unitsSelect.value = profile.units || 'metric';
    themeSelect.value = profile.theme || 'light';
    workoutDaysInput.value = profile.workoutDays || '';
    fitnessFocusSelect.value = profile.fitnessFocus || 'strength';
    defaultDurationInput.value = profile.defaultDuration || 45;
    dashboardDisplaySelect.value = profile.dashboardDisplay || 'overview';
    notificationToggle.checked = profile.notifications !== false;
    soundToggle.checked = profile.sound !== false;

    // Save button handler
    saveBtn.addEventListener('click', function () {
      const newName = nameInput.value.trim();
      const newEmail = emailInput.value.trim();
      
      if (!newName) {
        App.toast("Name is required", "danger");
        return;
      }
      
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        App.toast("Valid email is required", "danger");
        return;
      }

      const updates = {
        name: newName,
        email: newEmail,
        units: unitsSelect.value,
        theme: themeSelect.value,
        workoutDays: workoutDaysInput.value,
        fitnessFocus: fitnessFocusSelect.value,
        defaultDuration: parseInt(defaultDurationInput.value) || 45,
        dashboardDisplay: dashboardDisplaySelect.value,
        notifications: notificationToggle.checked,
        sound: soundToggle.checked
      };

      App.store.update('profile', function (p) {
        return Object.assign(p, updates);
      });

      App.applyTheme();
      App.applyUnits();
      App.toast("Settings saved successfully", "success");
    });

    // Reset preferences button handler
    resetBtn.addEventListener('click', function () {
      App.confirmDialog({
        title: "Reset Preferences",
        message: "Are you sure you want to reset all preferences to default? This will not affect your workouts or data.",
        confirmLabel: "Reset Now",
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        
        App.store.reset();
        window.location.reload();
      });
    });

    // Clear local data button handler
    clearDataBtn.addEventListener('click', function () {
      App.confirmDialog({
        title: "Clear All Data",
        message: "This action will permanently delete all your workout history, goals, nutrition logs, and preferences. Are you sure?",
        confirmLabel: "Delete Everything",
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        
        App.store.reset();
        App.addNotification({
          title: "Data Cleared",
          body: "All your workout data has been deleted.",
          type: "info"
        });
        App.toast("All data cleared", "success");
      });
    });

    // Theme change effect
    themeSelect.addEventListener('change', function (e) {
      const theme = e.target.value;
      App.store.update('profile', function (p) {
        return Object.assign(p, { theme: theme });
      });
      App.applyTheme();
    });

    // Units change effect
    unitsSelect.addEventListener('change', function (e) {
      const units = e.target.value;
      App.store.update('profile', function (p) {
        return Object.assign(p, { units: units });
      });
      App.applyUnits();
    });
  });
})();