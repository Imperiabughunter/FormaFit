document.addEventListener('DOMContentLoaded', () => {
  const pageRoot = document.getElementById('page-root');
  if (!pageRoot) return;

  // Initialize state
  let currentDate = new Date();
  let subscriptionId = null;
  let notesTimeout = null;

  // Render the page
  renderPage();

  function renderPage() {
    // Clear existing content
    pageRoot.innerHTML = '';

    // Create main container
    const container = App.el('div', { class: 'nutrition-journal-container' });
    
    // Day navigator
    const navControls = App.el('div', { class: 'nav-controls' }, [
      App.el('button', {
        class: 'btn btn-icon',
        'aria-label': 'Previous day',
        onclick: () => navigateDay(-1)
      }, [App.icon('arrowLeft')]),
      App.el('h2', { id: 'current-date', class: 'current-date' }, formatDate(currentDate)),
      App.el('button', {
        class: 'btn btn-ghost btn-sm',
        onclick: () => {
          currentDate = new Date();
          renderPage();
        }
      }, 'Today'),
      App.el('button', {
        class: 'btn btn-icon',
        'aria-label': 'Next day',
        onclick: () => navigateDay(1)
      }, [App.icon('arrowRight')])
    ]);

    // Daily summary
    const dailySummary = createDailySummary(currentDate);
    
    // Macro progress
    const macroProgress = createMacroProgress(currentDate);
    
    // Meal sections
    const mealSections = createMealSections(currentDate);
    
    // Add food button
    const addFoodButton = App.el('button', {
      class: 'btn btn-primary btn-lg',
      onclick: () => openEntryDialog()
    }, 'Add Food Entry');
    
    // Daily notes
    const dailyNotes = createDailyNotes(currentDate);
    
    // Footnote
    const footnote = App.el('p', { class: 'text-sm text-2' }, 'All values are user-provided and have not been medically verified.');
    
    // Assemble page
    container.append(
      navControls,
      dailySummary,
      macroProgress,
      mealSections,
      addFoodButton,
      dailyNotes,
      footnote
    );
    
    pageRoot.appendChild(container);
    
    // Subscribe to store changes
    if (subscriptionId) subscriptionId(); // store.subscribe returns its own unsubscribe function
    subscriptionId = App.store.subscribe(() => {
      // do not rebuild the page (and steal focus) while the user is typing a note
      if (document.activeElement && document.activeElement.id === 'daily-notes-textarea') return;
      renderPage();
    });
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  function navigateDay(direction) {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + direction);
    renderPage();
  }

  function createDailySummary(date) {
    const entries = App.store.get('nutrition') || [];
    const dayEntries = entries.filter(entry => 
      new Date(entry.date).toDateString() === date.toDateString()
    );
    
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    dayEntries.forEach(entry => {
      totals.calories += entry.calories || 0;
      totals.protein += entry.protein || 0;
      totals.carbs += entry.carbs || 0;
      totals.fat += entry.fat || 0;
    });
    
    const summaryGrid = App.el('div', { class: 'summary-grid' }, [
      createSummaryItem('Calories', `${totals.calories} kcal`),
      createSummaryItem('Protein', `${totals.protein} g`),
      createSummaryItem('Carbs', `${totals.carbs} g`),
      createSummaryItem('Fat', `${totals.fat} g`)
    ]);
    
    return App.el('div', { class: 'daily-summary' }, [
      App.el('h2', { class: 'section-title' }, 'Daily Summary'),
      summaryGrid
    ]);
  }

  function createSummaryItem(label, value) {
    return App.el('div', { class: 'summary-item' }, [
      App.el('span', { class: 'value' }, value),
      App.el('span', { class: 'label' }, label)
    ]);
  }

  function createMacroProgress(date) {
    const entries = App.store.get('nutrition') || [];
    const dayEntries = entries.filter(entry => 
      new Date(entry.date).toDateString() === date.toDateString()
    );
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    dayEntries.forEach(entry => {
      totalCalories += entry.calories || 0;
      totalProtein += entry.protein || 0;
      totalCarbs += entry.carbs || 0;
      totalFat += entry.fat || 0;
    });
    
    const targets = App.utils.macroTarget();
    const calorieTarget = App.utils.calorieTarget();
    
    const progressItems = [
      {
        label: 'Calories',
        consumed: totalCalories,
        target: calorieTarget,
        unit: 'kcal'
      },
      {
        label: 'Protein',
        consumed: totalProtein,
        target: targets.protein,
        unit: 'g'
      },
      {
        label: 'Carbs',
        consumed: totalCarbs,
        target: targets.carbs,
        unit: 'g'
      },
      {
        label: 'Fat',
        consumed: totalFat,
        target: targets.fat,
        unit: 'g'
      }
    ];
    
    const progressContainer = App.el('div', { class: 'macro-progress' });
    
    progressItems.forEach(item => {
      const percentage = Math.min(100, (item.consumed / item.target) * 100);
      const isOver = percentage > 100;
      
      const barContainer = App.el('div', { class: 'progress-container' }, [
        App.el('div', { class: 'progress-label' }, `${item.label} (${item.consumed} / ${item.target} ${item.unit})`),
        App.el('div', { class: 'progress progress--lg' }, [
          App.el('div', {
            class: `progress__fill ${item.consumed > item.target ? 'is-warning' : ''}`,
            style: `width: ${percentage}%`
          })
        ])
      ]);
      
      progressContainer.appendChild(barContainer);
    });
    
    return App.el('div', { class: 'macro-progress' }, [
      App.el('h2', { class: 'section-title' }, 'Macro Progress'),
      progressContainer
    ]);
  }

  function createMealSections(date) {
    const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const entries = App.store.get('nutrition') || [];
    const dayEntries = entries.filter(entry => 
      new Date(entry.date).toDateString() === date.toDateString()
    );
    
    const foodEntries = App.el('div', { class: 'food-entries' });
    
    meals.forEach(meal => {
      const mealEntries = dayEntries.filter(entry => entry.meal === meal);
      
      const mealSection = App.el('div', { class: 'meal-section' }, [
        App.el('h3', { class: 'text-lg font-semibold' }, meal),
        App.el('div', { class: 'meal-entries' })
      ]);
      
      if (mealEntries.length === 0) {
        const emptyState = App.el('div', { class: 'empty' }, [
          App.el('p', {}, 'No entries yet'),
          App.el('button', {
            class: 'btn btn-ghost btn-sm',
            onclick: () => openEntryDialog(meal)
          }, '+ Add')
        ]);
        mealSection.querySelector('.meal-entries').appendChild(emptyState);
      } else {
        mealEntries.forEach(entry => {
          const entryElement = createFoodEntry(entry, date);
          mealSection.querySelector('.meal-entries').appendChild(entryElement);
        });
      }
      
      // Add "Add" button to each meal section
      const addBtn = App.el('button', {
        class: 'btn btn-ghost btn-sm',
        onclick: () => openEntryDialog(meal)
      }, '+ Add');
      
      mealSection.appendChild(addBtn);
      
      foodEntries.appendChild(mealSection);
    });
    
    return foodEntries;
  }

  function createFoodEntry(entry, date) {
    const entryElement = App.el('div', { class: 'food-entry' }, [
      App.el('div', { class: 'entry-details' }, [
        App.el('strong', {}, entry.food),
        App.el('span', { class: 'serving-desc' }, entry.serving || '')
      ]),
      App.el('div', { class: 'entry-stats' }, [
        App.el('span', {}, `${entry.calories} kcal`),
        App.el('span', {}, `P:${entry.protein || 0}g`),
        App.el('span', {}, `C:${entry.carbs || 0}g`),
        App.el('span', {}, `F:${entry.fat || 0}g`)
      ]),
      App.el('div', { class: 'entry-actions' }, [
        App.el('button', {
          class: 'btn btn-icon',
          'aria-label': 'Edit entry',
          onclick: () => openEntryDialog(entry)
        }, [App.icon('edit')]),
        App.el('button', {
          class: 'btn btn-icon',
          'aria-label': 'Delete entry',
          onclick: async () => {
            const confirmed = await App.confirmDialog({
              title: 'Delete Entry',
              message: 'Are you sure you want to delete this food entry?',
              confirmLabel: 'Delete',
              danger: true
            });
            
            if (confirmed) {
              const entries = App.store.get('nutrition') || [];
              const filtered = entries.filter(e => e.id !== entry.id);
              App.store.set('nutrition', filtered);
              App.toast('Entry deleted', 'success');
            }
          }
        }, [App.icon('trash')])
      ])
    ]);
    
    return entryElement;
  }

  function openEntryDialog(entryToEdit = null) {
    const mealOptions = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    
    // Get the selected meal from the dialog or default to today's date
    const initialMeal = entryToEdit ? entryToEdit.meal : 
      (mealOptions.find(m => m === entryToEdit) || 'Breakfast');
    
    const form = App.el('form', {}, [
      App.el('div', { class: 'field' }, [
        App.el('label', { for: 'food-name' }, 'Food name'),
        App.el('input', {
          type: 'text',
          id: 'food-name',
          name: 'food',
          class: 'form-input',
          required: true,
          value: entryToEdit?.food || ''
        }),
        App.el('div', { class: 'field-error' }, '')
      ]),
      App.el('div', { class: 'field' }, [
        App.el('label', { for: 'serving-desc' }, 'Serving description'),
        App.el('input', {
          type: 'text',
          id: 'serving-desc',
          name: 'serving',
          class: 'form-input',
          value: entryToEdit?.serving || ''
        }),
        App.el('div', { class: 'field-error' }, '')
      ]),
      App.el('div', { class: 'field' }, [
        App.el('label', { for: 'meal-select' }, 'Meal'),
        App.el('select', {
          id: 'meal-select',
          name: 'meal',
          class: 'form-select'
        }, mealOptions.map(meal => 
          App.el('option', { value: meal, selected: meal === initialMeal }, meal)
        ))
      ]),
      App.el('div', { class: 'field' }, [
        App.el('label', { for: 'calories' }, 'Calories'),
        App.el('input', {
          type: 'number',
          id: 'calories',
          name: 'calories',
          class: 'form-input',
          min: 0,
          required: true,
          value: entryToEdit?.calories || ''
        }),
        App.el('div', { class: 'field-error' }, '')
      ]),
      App.el('div', { class: 'form-grid' }, [
        App.el('div', { class: 'field' }, [
          App.el('label', { for: 'protein' }, 'Protein (g)'),
          App.el('input', {
            type: 'number',
            id: 'protein',
            name: 'protein',
            class: 'form-input',
            min: 0,
            value: entryToEdit?.protein || ''
          }),
          App.el('div', { class: 'field-error' }, '')
        ]),
        App.el('div', { class: 'field' }, [
          App.el('label', { for: 'carbs' }, 'Carbs (g)'),
          App.el('input', {
            type: 'number',
            id: 'carbs',
            name: 'carbs',
            class: 'form-input',
            min: 0,
            value: entryToEdit?.carbs || ''
          }),
          App.el('div', { class: 'field-error' }, '')
        ]),
        App.el('div', { class: 'field' }, [
          App.el('label', { for: 'fat' }, 'Fat (g)'),
          App.el('input', {
            type: 'number',
            id: 'fat',
            name: 'fat',
            class: 'form-input',
            min: 0,
            value: entryToEdit?.fat || ''
          }),
          App.el('div', { class: 'field-error' }, '')
        ])
      ])
    ]);
    
    const dialog = App.openDialog({
      title: entryToEdit ? 'Edit Food Entry' : 'Add Food Entry',
      body: form,
      foot: [
        App.el('button', {
          type: 'button',
          class: 'btn btn-secondary',
          onclick: () => dialog.close()
        }, 'Cancel'),
        App.el('button', {
          type: 'submit',
          class: 'btn btn-primary',
          onclick: (e) => {
            e.preventDefault();
            saveEntry(form, entryToEdit, dialog);
          }
        }, 'Save Entry')
      ]
    });
    
    // Set initial values
    if (entryToEdit) {
      const mealSelect = form.querySelector('#meal-select');
      if (mealSelect) {
        mealSelect.value = entryToEdit.meal;
      }
    }
  }

  function saveEntry(form, entryToEdit, dialog) {
    const formData = new FormData(form);
    const errors = [];
    
    // Validate
    const foodName = formData.get('food');
    const calories = parseInt(formData.get('calories'));
    const protein = parseFloat(formData.get('protein')) || 0;
    const carbs = parseFloat(formData.get('carbs')) || 0;
    const fat = parseFloat(formData.get('fat')) || 0;
    
    if (!foodName) {
      errors.push({ field: 'food', message: 'Food name is required' });
    }
    
    if (isNaN(calories) || calories < 0 || calories > 10000) {
      errors.push({ field: 'calories', message: 'Calories must be between 0 and 10000' });
    }
    
    if (protein < 0 || carbs < 0 || fat < 0) {
      errors.push({ field: 'macros', message: 'Macronutrient values must be non-negative' });
    }
    
    // Clear previous errors
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    
    if (errors.length > 0) {
      errors.forEach(err => {
        const errorEl = form.querySelector(`#${err.field}-error`) || 
          form.querySelector(`[name="${err.field}"]`).closest('.field').querySelector('.field-error');
        if (errorEl) {
          errorEl.textContent = err.message;
        }
      });
      return;
    }
    
    // Create or update entry
    const entries = App.store.get('nutrition') || [];
    const date = new Date();
    
    let newEntry = {
      id: App.utils.uid('n'),
      date: date.toISOString(),
      meal: formData.get('meal'),
      food: foodName,
      serving: formData.get('serving') || '',
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat
    };
    
    if (entryToEdit) {
      // Update existing entry
      const index = entries.findIndex(e => e.id === entryToEdit.id);
      if (index !== -1) {
        entries[index] = { ...entries[index], ...newEntry };
      }
    } else {
      // Add new entry
      entries.push(newEntry);
    }
    
    App.store.set('nutrition', entries);
    App.toast('Entry saved', 'success');
    
    dialog.close();
  }

  function createDailyNotes(date) {
    const notesKey = date.toDateString();
    const notes = App.store.get('nutritionNotes') || {};
    const noteValue = notes[notesKey] || '';
    
    const textarea = App.el('textarea', {
      id: 'daily-notes-textarea',
      class: 'textarea',
      'aria-label': 'Daily notes',
      value: noteValue,
      oninput: (e) => {
        // Debounce save
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(() => {
          const newNotes = { ...notes };
          newNotes[notesKey] = e.target.value;
          App.store.set('nutritionNotes', newNotes);
        }, 300);
      }
    });
    
    return App.el('div', { class: 'daily-notes' }, [
      App.el('h2', { class: 'section-title' }, 'Daily Notes'),
      textarea
    ]);
  }
});