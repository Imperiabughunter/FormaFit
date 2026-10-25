(function () {
  "use strict";
  
  // Initialize page
  document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const pageRoot = document.getElementById('page-root');
    const filterContainer = App.el('div', { class: 'row row-between mb-4' });
    
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'unread', label: 'Unread' },
      { id: 'read', label: 'Read' }
    ];
    
    const categories = [
      { id: 'all', label: 'All Categories' },
      { id: 'workout', label: 'Workout' },
      { id: 'goals', label: 'Goals' },
      { id: 'reminders', label: 'Reminders' },
      { id: 'achievements', label: 'Achievements' }
    ];
    
    let currentFilter = 'all';
    let currentCategory = 'all';
    
    // Create filter buttons
    const filterButtons = filters.map(filter => {
      const btn = App.el('button', {
        type: 'button',
        class: `btn btn-ghost ${currentFilter === filter.id ? 'is-active' : ''}`,
        onclick: () => setFilter(filter.id)
      }, filter.label);
      return btn;
    });
    
    // Create category buttons
    const categoryButtons = categories.map(category => {
      const btn = App.el('button', {
        type: 'button',
        class: `btn btn-ghost ${currentCategory === category.id ? 'is-active' : ''}`,
        onclick: () => setCategory(category.id)
      }, category.label);
      return btn;
    });
    
    // Add filters to container
    filterContainer.appendChild(App.el('div', { class: 'chips' }, filterButtons));
    filterContainer.appendChild(App.el('div', { class: 'chips' }, categoryButtons));
    
    // Create notification list
    const notificationList = App.el('div', { class: 'grid grid-1' });
    
    // Create empty state
    const emptyState = App.el('div', { class: 'empty' },
      [App.el('div', { class: 'empty__icon' }, App.icon('bell')),
       App.el('h3', { class: 'text-lg mb-2' }, 'No notifications'),
       App.el('p', { class: 'text-2 text-sm' }, 'You have no notifications at this time.')]);
    
    // Create mark all as read button
    const markAllReadBtn = App.el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      onclick: markAllAsRead
    }, 'Mark all as read');
    
    // Add to page
    pageRoot.appendChild(filterContainer);
    pageRoot.appendChild(markAllReadBtn);
    pageRoot.appendChild(notificationList);
    
    // Filter and category handlers
    function setFilter(filter) {
      currentFilter = filter;
      renderNotifications();
    }
    
    function setCategory(category) {
      currentCategory = category;
      renderNotifications();
    }
    
    // Mark all as read
    function markAllAsRead() {
      const unread = App.store.get('notifications').filter(n => !n.read);
      if (unread.length > 0) {
        App.store.update('notifications', notifications => 
          notifications.map(n => ({ ...n, read: true }))
        );
        renderNotifications();
        App.toast('All notifications marked as read', 'success');
      }
    }
    
    // Mark single notification as read
    function markAsRead(id, toggle) {
      App.store.update('notifications', notifications => 
        notifications.map(n => n.id === id ? { ...n, read: toggle ? !n.read : true } : n)
      );
      renderNotifications();
    }
    
    // Delete notification
    function deleteNotification(id) {
      App.confirmDialog({
        title: 'Delete Notification',
        message: 'Are you sure you want to delete this notification?',
        confirmLabel: 'Delete',
        danger: true
      }).then(confirmed => {
        if (confirmed) {
          App.store.update('notifications', notifications => 
            notifications.filter(n => n.id !== id)
          );
          renderNotifications();
          App.toast('Notification deleted', 'success');
        }
      });
    }
    
    // Render notification item
    function renderNotificationItem(notification) {
      const typeClass = `notification--${notification.type}`;
      const readClass = notification.read ? 'is-read' : 'is-unread';
      
      let iconType = 'bell';
      if (notification.type === 'success') iconType = 'check';
      else if (notification.type === 'warning') iconType = 'info';
      else if (notification.type === 'danger') iconType = 'close';
      
      const icon = App.icon(iconType);
      
      const timeAgo = App.relativeTime(notification.time);
      
      const actions = [
        App.el('button', {
          type: 'button',
          class: 'icon-btn',
          onclick: (e) => {
            e.stopPropagation();
            markAsRead(notification.id, true);
          },
          'aria-label': notification.read ? 'Mark as unread' : 'Mark as read'
        }, icon),
        
        App.el('button', {
          type: 'button',
          class: 'icon-btn',
          onclick: (e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          },
          'aria-label': 'Delete notification'
        }, App.icon('trash'))
      ];
      
      const item = App.el('div', { 
        class: `card ${typeClass} ${readClass}`,
        onclick: () => markAsRead(notification.id)
      }, [
        App.el('div', { class: 'card__head' }, [
          App.el('div', { class: 'stack' }, [
            App.el('h3', { class: 'card__title text-sm' }, notification.title),
            App.el('p', { class: 'text-2 text-sm' }, timeAgo)
          ]),
          App.el('div', { class: 'row' }, actions)
        ]),
        App.el('div', { class: 'card__sub' }, [
          App.el('p', { class: 'text-sm' }, notification.body)
        ])
      ]);
      
      return item;
    }
    
    // Render all notifications
    function renderNotifications() {
      const notifications = App.store.get('notifications') || [];
      
      // Filter by read/unread
      let filtered = notifications;
      if (currentFilter === 'unread') {
        filtered = filtered.filter(n => !n.read);
      } else if (currentFilter === 'read') {
        filtered = filtered.filter(n => n.read);
      }
      
      // Filter by category
      if (currentCategory !== 'all') {
        filtered = filtered.filter(n => {
          let category = 'workout';
          if (n.type === 'success') category = 'achievements';
          else if (n.type === 'warning' || n.type === 'danger') category = 'reminders';
          
          return category === currentCategory;
        });
      }
      
      // Clear list
      notificationList.innerHTML = '';
      
      if (filtered.length === 0) {
        notificationList.appendChild(emptyState);
        return;
      }
      
      const items = filtered.map(notification => renderNotificationItem(notification));
      notificationList.append(...items);
    }
    
    // Subscribe to store changes
    App.store.subscribe(renderNotifications);
    
    // Initial render
    renderNotifications();
  });
})();