// Calendar Sidebar - Side Panel Logic

// State
let currentDate = new Date();
let refreshInterval = null;
let todayRefreshInterval = null;
let currentEvents = [];
let editingEventId = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const calendarScreen = document.getElementById('calendar-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const openCalendarBtn = document.getElementById('open-calendar-btn');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const todayBtn = document.getElementById('today-btn');
const retryBtn = document.getElementById('retry-btn');
const addEventBtn = document.getElementById('add-event-btn');
const emptyAddBtn = document.getElementById('empty-add-btn');
const currentDateEl = document.getElementById('current-date');
const eventsContainer = document.getElementById('events-container');
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const errorStateEl = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');
const allDaySectionEl = document.getElementById('all-day-events');
const allDayListEl = document.getElementById('all-day-list');
const allDayToggleBtn = document.getElementById('all-day-toggle');
const timedEventsEl = document.getElementById('timed-events');

// Modal Elements
const eventModal = document.getElementById('event-modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const eventForm = document.getElementById('event-form');
const eventIdInput = document.getElementById('event-id');
const eventTitleInput = document.getElementById('event-title');
const eventAllDayInput = document.getElementById('event-all-day');
const eventStartDateInput = document.getElementById('event-start-date');
const eventStartTimeInput = document.getElementById('event-start-time');
const eventEndDateInput = document.getElementById('event-end-date');
const eventEndTimeInput = document.getElementById('event-end-time');
const eventLocationInput = document.getElementById('event-location');
const eventDescriptionInput = document.getElementById('event-description');
const deleteEventBtn = document.getElementById('delete-event-btn');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');

// Delete Modal Elements
const deleteModal = document.getElementById('delete-modal');
const deleteCancelBtn = document.getElementById('delete-cancel-btn');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await checkAuthStatus();
}

function setupEventListeners() {
  // Auth
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  
  // Navigation
  refreshBtn.addEventListener('click', () => loadEvents());
  openCalendarBtn.addEventListener('click', openGoogleCalendar);
  prevDayBtn.addEventListener('click', () => navigateDay(-1));
  nextDayBtn.addEventListener('click', () => navigateDay(1));
  todayBtn.addEventListener('click', goToToday);
  retryBtn.addEventListener('click', () => loadEvents());
  
  // Add Event
  addEventBtn.addEventListener('click', () => openEventModal());
  emptyAddBtn.addEventListener('click', () => openEventModal());
  
  // All Day Toggle
  allDayToggleBtn.addEventListener('click', toggleAllDaySection);
  
  // Modal
  modalClose.addEventListener('click', closeEventModal);
  cancelBtn.addEventListener('click', closeEventModal);
  eventModal.querySelector('.modal-backdrop').addEventListener('click', closeEventModal);
  eventForm.addEventListener('submit', handleSaveEvent);
  eventAllDayInput.addEventListener('change', handleAllDayToggle);
  deleteEventBtn.addEventListener('click', () => openDeleteModal());
  
  // Input border visibility - use event delegation
  eventForm.addEventListener('input', (e) => {
    if (e.target.classList.contains('form-input')) {
      if (e.target.value && e.target.value.trim() !== '') {
        e.target.classList.add('has-value');
      } else {
        e.target.classList.remove('has-value');
      }
    }
  });
  
  // Delete Modal
  deleteCancelBtn.addEventListener('click', closeDeleteModal);
  deleteConfirmBtn.addEventListener('click', handleDeleteEvent);
  deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);
  
  // Auto-set end time when start time changes
  eventStartTimeInput.addEventListener('change', () => {
    if (!eventEndTimeInput.value || eventEndTimeInput.value <= eventStartTimeInput.value) {
      const startTime = eventStartTimeInput.value;
      if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endHours = (hours + 1) % 24;
        eventEndTimeInput.value = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
  });
  
  // Auto-set end date when start date changes
  eventStartDateInput.addEventListener('change', () => {
    if (!eventEndDateInput.value || eventEndDateInput.value < eventStartDateInput.value) {
      eventEndDateInput.value = eventStartDateInput.value;
    }
  });
  
  // Input border visibility - use event delegation
  eventForm.addEventListener('input', (e) => {
    if (e.target.classList.contains('form-input')) {
      if (e.target.value && e.target.value.trim() !== '') {
        e.target.classList.add('has-value');
      } else {
        e.target.classList.remove('has-value');
      }
    }
  });
}

// Auth
async function checkAuthStatus() {
  const response = await sendMessage({ action: 'checkAuth' });
  if (response.isLoggedIn) {
    showCalendarScreen();
    loadEvents();
    startAutoRefresh();
  } else {
    showLoginScreen();
  }
}

async function handleLogin() {
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  
  try {
    const response = await sendMessage({ action: 'login' });
    if (response.success) {
      showCalendarScreen();
      loadEvents();
      startAutoRefresh();
    } else {
      alert('Login failed: ' + response.error);
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Sign in with Google
    `;
  }
}

async function handleLogout() {
  const response = await sendMessage({ action: 'logout' });
  if (response.success) {
    stopAutoRefresh();
    showLoginScreen();
  }
}

// Navigation
function navigateDay(offset) {
  currentDate.setDate(currentDate.getDate() + offset);
  updateDateDisplay();
  loadEvents();
}

function goToToday() {
  currentDate = new Date();
  updateDateDisplay();
  loadEvents();
}

function openGoogleCalendar() {
  // Open Google Calendar in a new tab, optionally focused on the current date
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
  const day = currentDate.getDate();
  
  // Format date as YYYYMMDD for Google Calendar URL
  const dateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const url = `https://calendar.google.com/calendar/r/day/${dateStr}`;
  
  chrome.tabs.create({ url });
}

function updateDateDisplay() {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const isToday = isSameDay(currentDate, new Date());
  
  let dateText = currentDate.toLocaleDateString('en-US', options);
  if (isToday) {
    dateText = 'Today · ' + dateText;
  }
  
  currentDateEl.textContent = dateText;
}

// Load Events
async function loadEvents(showLoadingIndicator = true) {
  if (showLoadingIndicator) {
    showLoading();
  }
  
  try {
    const response = await sendMessage({ 
      action: 'getEvents', 
      date: currentDate.toISOString() 
    });
    
    if (response.success) {
      // Check if events have changed before re-rendering
      const eventsChanged = !areEventsEqual(currentEvents, response.events);
      
      if (eventsChanged) {
        currentEvents = response.events;
        renderEvents(response.events);
      }
    } else if (response.needsLogin) {
      showLoginScreen();
    } else {
      if (showLoadingIndicator) {
        showError(response.error);
      }
    }
  } catch (error) {
    if (showLoadingIndicator) {
      showError(error.message);
    }
  }
}

// Update a single event card without reloading all events
function updateEventCard(eventId, updatedEvent) {
  // Update the event in currentEvents array
  const eventIndex = currentEvents.findIndex(ev => ev.id === eventId);
  if (eventIndex !== -1) {
    currentEvents[eventIndex] = updatedEvent;
  } else {
    // Event not found, might be a new event - need to reload
    loadEvents(false); // Reload without loading indicator
    return;
  }
  
  // Find and update the card in the DOM
  const card = document.querySelector(`[data-event-id="${eventId}"]`);
  if (!card) {
    // Card not found, might need to re-render (e.g., moved between all-day and timed)
    renderEvents(currentEvents);
    return;
  }
  
  // Check if it's a timeline event or all-day event
  const isTimelineEvent = card.classList.contains('timeline-event-card');
  
  if (isTimelineEvent) {
    // Check if event changed between all-day and timed (would need re-render)
    const wasAllDay = !card.dataset.start || card.dataset.start.includes('T') === false;
    const isNowAllDay = updatedEvent.isAllDay;
    
    if (wasAllDay !== isNowAllDay) {
      // Event type changed, need to re-render
      renderEvents(currentEvents);
      return;
    }
    
    // Update timeline event card
    const eventStart = new Date(updatedEvent.start);
    const eventEnd = new Date(updatedEvent.end);
    const HOUR_HEIGHT = 48;
    const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
    
    const startHour = eventStart.getHours();
    const startMinutes = eventStart.getMinutes();
    const endHour = eventEnd.getHours();
    const endMinutes = eventEnd.getMinutes();
    
    const topPx = (startHour * HOUR_HEIGHT) + (startMinutes * MINUTE_HEIGHT);
    
    let durationMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
    if (durationMinutes < 0) {
      durationMinutes = (24 * 60) - (startHour * 60 + startMinutes) + (endHour * 60 + endMinutes);
    }
    const heightPx = Math.max(durationMinutes * MINUTE_HEIGHT, 24);
    
    // Update position and size
    card.style.top = `${topPx}px`;
    card.style.height = `${heightPx}px`;
    
    // Update time display
    const timeDisplay = card.querySelector('.timeline-event-time');
    if (timeDisplay) {
      const timeStr = `${formatTime(updatedEvent.start)} – ${formatTime(updatedEvent.end)}`;
      timeDisplay.textContent = timeStr;
    }
    
    // Update title if changed
    const titleDisplay = card.querySelector('.timeline-event-title');
    if (titleDisplay) {
      titleDisplay.textContent = escapeHtml(updatedEvent.title);
    }
    
    // Update location if changed
    const locationDisplay = card.querySelector('.event-location');
    if (updatedEvent.location) {
      if (!locationDisplay) {
        // Need to add location - would require more complex update, so re-render
        renderEvents(currentEvents);
        return;
      }
      locationDisplay.textContent = `📍 ${escapeHtml(updatedEvent.location)}`;
    } else if (locationDisplay) {
      locationDisplay.remove();
    }
    
    // Update data attributes
    card.dataset.start = updatedEvent.start;
    card.dataset.end = updatedEvent.end;
  } else {
    // Update all-day event card
    const timeDisplay = card.querySelector('.event-time');
    if (timeDisplay && !updatedEvent.isAllDay) {
      const timeStr = `${formatTime(updatedEvent.start)} – ${formatTime(updatedEvent.end)}`;
      timeDisplay.textContent = timeStr;
    } else if (timeDisplay && updatedEvent.isAllDay) {
      timeDisplay.textContent = '';
    }
    
    // Update title if changed
    const titleDisplay = card.querySelector('.event-title');
    if (titleDisplay) {
      titleDisplay.textContent = escapeHtml(updatedEvent.title);
    }
    
    // Update location if changed
    const locationDisplay = card.querySelector('.event-location');
    if (updatedEvent.location) {
      if (!locationDisplay) {
        // Need to add location - would require more complex update, so re-render
        renderEvents(currentEvents);
        return;
      }
      locationDisplay.textContent = `📍 ${escapeHtml(updatedEvent.location)}`;
    } else if (locationDisplay) {
      locationDisplay.remove();
    }
  }
}

// Compare events to check if they've changed
function areEventsEqual(events1, events2) {
  if (!events1 || !events2) return false;
  if (events1.length !== events2.length) return false;
  
  // Create maps for quick comparison
  const map1 = new Map(events1.map(e => [e.id, JSON.stringify(e)]));
  const map2 = new Map(events2.map(e => [e.id, JSON.stringify(e)]));
  
  if (map1.size !== map2.size) return false;
  
  for (const [id, data] of map1) {
    if (map2.get(id) !== data) return false;
  }
  
  return true;
}

// Render Events
function renderEvents(events) {
  hideAllStates();
  
  if (!events || events.length === 0) {
    showEmpty();
    return;
  }
  
  const allDayEvents = events.filter(e => e.isAllDay);
  const timedEvents = events.filter(e => !e.isAllDay);
  
  if (allDayEvents.length > 0) {
    allDaySectionEl.classList.remove('hidden');
    allDayListEl.innerHTML = allDayEvents.map(e => createEventCard(e)).join('');
    // Restore toggle state (default: expanded)
    const isExpanded = getAllDayToggleState();
    updateAllDayToggleUI(isExpanded);
  } else {
    allDaySectionEl.classList.add('hidden');
  }
  
  renderTimedEvents(timedEvents);
  
  // Add click handlers to event cards
  document.querySelectorAll('.event-card').forEach(card => {
    const isReadOnly = card.dataset.readonly === 'true';
    const isExternal = card.dataset.external === 'true';
    
    if (isExternal) {
      // External calendar event - show notification
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showNotification('This event is from an external calendar and cannot be edited.');
      });
    } else if (!isReadOnly) {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const eventId = card.dataset.eventId;
        const event = currentEvents.find(ev => ev.id === eventId);
        if (event) {
          openEventModal(event);
        }
      });
    }
  });
}

function renderTimedEvents(events) {
  const now = new Date();
  const isToday = isSameDay(currentDate, now);
  
  // Debug: log events to console
  console.log('Rendering timed events:', events);
  
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  // Create timeline structure with separate areas for labels and content
  let html = '<div class="timeline-container">';
  
  // Hour labels area (left side, fixed width)
  html += '<div class="timeline-hour-labels">';
  for (let hour = 0; hour < 24; hour++) {
    const hourTime = new Date(currentDate);
    hourTime.setHours(hour, 0, 0, 0);
    
    html += `<div class="timeline-hour-label-wrapper" data-hour="${hour}">`;
    if (hour === 0) {
      // Show timezone instead of 12 AM
      html += `<div class="timeline-hour-label timeline-timezone-label">${formatTimezone()}</div>`;
    } else {
      html += `<div class="timeline-hour-label">${formatHour(hour)}</div>`;
    }
    html += `</div>`;
  }
  html += '</div>'; // timeline-hour-labels
  
  // Content area (right side, flexible width)
  html += '<div class="timeline-content">';
  
  // Create hour markers for background (0-23) with fixed 48px height each
  for (let hour = 0; hour < 24; hour++) {
    const hourTime = new Date(currentDate);
    hourTime.setHours(hour, 0, 0, 0);
    
    // Check if this hour is in the past (for today only)
    const isPastHour = isToday && hourTime < now;
    const hourClass = isPastHour ? 'timeline-hour past-hour' : 'timeline-hour';
    
    html += `<div class="${hourClass}" data-hour="${hour}"></div>`;
  }
  
  // Add events positioned on timeline
  html += '<div class="timeline-events">';
  
  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    let status = '';
    if (isToday) {
      if (eventEnd < now) {
        status = 'past';
      } else if (eventStart <= now && eventEnd >= now) {
        status = 'current';
      }
    }
    
    html += createTimelineEventCard(event, status, currentDate);
  }
  
  html += '</div>'; // timeline-events
  
  // Add current time indicator if today
  if (isToday) {
    html += createTimelineTimeIndicator(now, currentDate);
  }
  
  html += '</div>'; // timeline-content
  html += '</div>'; // timeline-container
  
  timedEventsEl.innerHTML = html;
  
  // Add click handlers to event cards
  document.querySelectorAll('.timeline-event-card').forEach(card => {
    const isReadOnly = card.dataset.readonly === 'true';
    const isExternal = card.dataset.external === 'true';
    
    if (isExternal) {
      // External calendar event - show notification
      card.addEventListener('click', (e) => {
        // Don't show notification if clicking on resize handle (shouldn't exist, but just in case)
        if (e.target.classList.contains('timeline-event-resize-handle')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        showNotification('This event is from an external calendar and cannot be edited.');
      });
    } else if (!isReadOnly) {
      // Track if this specific card was dragged or resized
      let cardWasDragged = false;
      let cardWasResized = false;
      
      card.addEventListener('click', (e) => {
        // Don't open modal if clicking on resize handle
        if (e.target.classList.contains('timeline-event-resize-handle')) {
          return;
        }
        // Don't open modal if we just dragged or resized this card
        if (cardWasDragged || cardWasResized) {
          cardWasDragged = false;
          cardWasResized = false;
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const eventId = card.dataset.eventId;
        const event = currentEvents.find(ev => ev.id === eventId);
        if (event) {
          openEventModal(event);
        }
      });
      
      // Setup drag and drop with card-specific tracking
      setupEventCardDragAndDrop(card, () => { cardWasDragged = true; });
      
      // Setup resize handles with card-specific tracking
      setupEventCardResize(card, () => { cardWasResized = true; });
    }
  });
  
  // Add click handler to timeline content for creating new events
  const timelineContent = timedEventsEl.querySelector('.timeline-content');
  if (timelineContent) {
    timelineContent.addEventListener('click', (e) => {
      // Don't create event if clicking on an event card
      if (e.target.closest('.timeline-event-card')) {
        return;
      }
      
      // Calculate time from click position
      const HOUR_HEIGHT = 48;
      
      // Get the position relative to timeline-content
      const rect = timelineContent.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      
      // Calculate hour from click position (round to nearest hour)
      const hour = Math.round(clickY / HOUR_HEIGHT);
      const finalHour = Math.max(0, Math.min(23, hour)); // Clamp between 0-23
      
      // Create start and end times (1 hour duration, rounded to hour)
      const startHour = finalHour;
      const startMinute = 0;
      const endHour = (startHour + 1) % 24;
      const endMinute = 0;
      
      // Open modal with pre-filled times
      openEventModal(null, {
        startHour,
        startMinute,
        endHour,
        endMinute
      });
    });
  }
  
  // Auto-scroll to current time if today
  if (isToday) {
    setTimeout(() => {
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const scrollPosition = (currentHour * 48) + (currentMinutes * 48 / 60); // 48px per hour
      const eventsContainer = document.getElementById('events-container');
      if (eventsContainer) {
        eventsContainer.scrollTop = Math.max(0, scrollPosition - 150); // Offset by 150px to show some context above
      }
    }, 100);
  }
}

function createEventCard(event, status = '') {
  const colorClass = event.colorId 
    ? `event-color-${event.colorId}` 
    : 'event-color-default';
  
  const timeStr = event.isAllDay 
    ? '' 
    : `${formatTime(event.start)} – ${formatTime(event.end)}`;
  
  const locationHtml = event.location 
    ? `<div class="event-location">📍 ${escapeHtml(event.location)}</div>` 
    : '';
  
  const meetHtml = event.hangoutLink 
    ? `<span class="event-meet-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Meet
       </span>` 
    : '';
  
  const isExternal = event.isExternal || false;
  const readonlyClass = (event.isReadOnly || isExternal) ? 'readonly' : '';
  const readonlyAttr = (event.isReadOnly || isExternal) ? 'data-readonly="true"' : '';
  const externalAttr = isExternal ? 'data-external="true"' : '';
  
  const readonlyIcon = (event.isReadOnly || isExternal)
    ? `<div class="readonly-icon" title="Read-only event">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </div>`
    : '';
  
  return `
    <div class="event-card ${status} ${readonlyClass}" data-event-id="${event.id}" ${readonlyAttr} ${externalAttr}>
      <div class="event-color-bar ${colorClass}"></div>
      <div class="event-content">
        <div class="event-title">${escapeHtml(event.title)}</div>
        ${timeStr ? `<div class="event-time">${timeStr}</div>` : ''}
        ${locationHtml}
        ${meetHtml}
      </div>
      ${readonlyIcon}
    </div>
  `;
}

function createTimeIndicator(time) {
  return `
    <div class="time-indicator">
      <span class="time-indicator-label">${formatTime(time)} now</span>
      <div class="time-indicator-line"></div>
    </div>
  `;
}

function createTimelineEventCard(event, status = '', date) {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  
  // Calculate position and height based on time
  // Each hour is 48px, each minute is 48/60 = 0.8px
  const HOUR_HEIGHT = 48;
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
  
  const startHour = eventStart.getHours();
  const startMinutes = eventStart.getMinutes();
  const endHour = eventEnd.getHours();
  const endMinutes = eventEnd.getMinutes();
  
  // Calculate top position in pixels
  const topPx = (startHour * HOUR_HEIGHT) + (startMinutes * MINUTE_HEIGHT);
  
  // Calculate height based on duration
  let durationMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
  if (durationMinutes < 0) {
    // Event spans midnight
    durationMinutes = (24 * 60) - (startHour * 60 + startMinutes) + (endHour * 60 + endMinutes);
  }
  const heightPx = Math.max(durationMinutes * MINUTE_HEIGHT, 24); // Minimum 24px (30 min)
  
  const colorClass = event.colorId 
    ? `event-color-${event.colorId}` 
    : 'event-color-default';
  
  const timeStr = `${formatTime(event.start)} – ${formatTime(event.end)}`;
  
  const locationHtml = event.location 
    ? `<div class="event-location">📍 ${escapeHtml(event.location)}</div>` 
    : '';
  
  const meetHtml = event.hangoutLink 
    ? `<span class="event-meet-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Meet
       </span>` 
    : '';
  
  const isExternal = event.isExternal || false;
  const readonlyClass = (event.isReadOnly || isExternal) ? 'readonly' : '';
  const readonlyAttr = (event.isReadOnly || isExternal) ? 'data-readonly="true"' : '';
  const externalAttr = isExternal ? 'data-external="true"' : '';
  
  const readonlyIcon = (event.isReadOnly || isExternal)
    ? `<div class="readonly-icon" title="Read-only event">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </div>`
    : '';
  
  return `
    <div class="timeline-event-card ${status} ${readonlyClass}" 
         data-event-id="${event.id}"
         data-start="${event.start}"
         data-end="${event.end}"
         ${readonlyAttr}
         ${externalAttr}
         style="top: ${topPx}px; height: ${heightPx}px;">
      ${(event.isReadOnly || isExternal) ? '' : '<div class="timeline-event-resize-handle timeline-event-resize-handle-top"></div>'}
      <div class="timeline-event-inner">
        <div class="timeline-event-color-bar ${colorClass}"></div>
        <div class="timeline-event-content">
          <div class="timeline-event-title">${escapeHtml(event.title)}</div>
          <div class="timeline-event-time">${timeStr}</div>
          ${locationHtml}
          ${meetHtml}
        </div>
        ${readonlyIcon}
      </div>
      ${(event.isReadOnly || isExternal) ? '' : '<div class="timeline-event-resize-handle timeline-event-resize-handle-bottom"></div>'}
    </div>
  `;
}

function createTimelineTimeIndicator(time, date) {
  const hour = time.getHours();
  const minutes = time.getMinutes();
  
  // Calculate position in pixels (48px per hour)
  const HOUR_HEIGHT = 48;
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
  const topPx = (hour * HOUR_HEIGHT) + (minutes * MINUTE_HEIGHT);
  
  return `
    <div class="timeline-time-indicator" style="top: ${topPx}px;">
      <div class="timeline-time-indicator-dot"></div>
      <div class="timeline-time-indicator-line"></div>
    </div>
  `;
}

function formatHour(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour} ${period}`;
}

function formatTimezone() {
  const offset = -new Date().getTimezoneOffset() / 60; // Convert minutes to hours, negate to get GMT offset
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  return `GMT${sign}${String(Math.floor(absOffset)).padStart(2, '0')}`;
}

// Event Modal
function openEventModal(event = null, timePrefs = null) {
  editingEventId = event ? event.id : null;
  
  // Reset form
  eventForm.reset();
  
  if (event) {
    // Edit mode
    modalTitle.textContent = 'Edit event';
    deleteEventBtn.classList.remove('hidden');
    
    eventIdInput.value = event.id;
    eventTitleInput.value = event.title;
    eventAllDayInput.checked = event.isAllDay;
    eventLocationInput.value = event.location || '';
    eventDescriptionInput.value = event.description || '';
    
    if (event.isAllDay) {
      eventStartDateInput.value = event.start;
      eventEndDateInput.value = event.end;
      eventStartTimeInput.value = '';
      eventEndTimeInput.value = '';
    } else {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      eventStartDateInput.value = formatDateForInput(startDate);
      eventEndDateInput.value = formatDateForInput(endDate);
      eventStartTimeInput.value = formatTimeForInput(startDate);
      eventEndTimeInput.value = formatTimeForInput(endDate);
    }
  } else {
    // Create mode
    modalTitle.textContent = 'Add event';
    deleteEventBtn.classList.add('hidden');
    
    // Use time preferences if provided (from timeline click), otherwise use defaults
    if (timePrefs) {
      eventStartDateInput.value = formatDateForInput(currentDate);
      eventEndDateInput.value = formatDateForInput(currentDate);
      eventStartTimeInput.value = `${String(timePrefs.startHour).padStart(2, '0')}:${String(timePrefs.startMinute).padStart(2, '0')}`;
      eventEndTimeInput.value = `${String(timePrefs.endHour).padStart(2, '0')}:${String(timePrefs.endMinute).padStart(2, '0')}`;
    } else {
      // Default to current date and next hour
      const now = new Date();
      const startHour = now.getHours() + 1;
      
      eventStartDateInput.value = formatDateForInput(currentDate);
      eventEndDateInput.value = formatDateForInput(currentDate);
      eventStartTimeInput.value = `${String(startHour % 24).padStart(2, '0')}:00`;
      eventEndTimeInput.value = `${String((startHour + 1) % 24).padStart(2, '0')}:00`;
    }
  }
  
  handleAllDayToggle();
  updateInputBorders(); // Update borders based on current values
  setupInputBorderListeners(); // Setup listeners for input changes
  eventModal.classList.remove('hidden');
  eventTitleInput.focus();
}

function closeEventModal() {
  eventModal.classList.add('hidden');
  editingEventId = null;
  // Remove all has-value classes when closing
  document.querySelectorAll('.form-input').forEach(input => {
    input.classList.remove('has-value');
  });
}

function updateInputBorders() {
  // Update borders for all inputs based on their values
  const inputs = eventForm.querySelectorAll('.form-input');
  inputs.forEach(input => {
    if (input.value && input.value.trim() !== '') {
      input.classList.add('has-value');
    } else {
      input.classList.remove('has-value');
    }
  });
}

function setupInputBorderListeners() {
  // Already set up via event delegation in setupEventListeners
  // This function is kept for consistency but does nothing
}

function handleAllDayToggle() {
  const isAllDay = eventAllDayInput.checked;
  eventStartTimeInput.disabled = isAllDay;
  eventEndTimeInput.disabled = isAllDay;
  
  if (isAllDay) {
    eventStartTimeInput.value = '';
    eventEndTimeInput.value = '';
  } else if (!eventStartTimeInput.value) {
    const now = new Date();
    const startHour = now.getHours() + 1;
    eventStartTimeInput.value = `${String(startHour % 24).padStart(2, '0')}:00`;
    eventEndTimeInput.value = `${String((startHour + 1) % 24).padStart(2, '0')}:00`;
  }
}

async function handleSaveEvent(e) {
  e.preventDefault();
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    const isAllDay = eventAllDayInput.checked;
    
    const eventData = {
      title: eventTitleInput.value.trim(),
      isAllDay,
      location: eventLocationInput.value.trim() || null,
      description: eventDescriptionInput.value.trim() || null
    };
    
    if (isAllDay) {
      eventData.startDate = eventStartDateInput.value;
      // Google Calendar expects end date to be exclusive for all-day events
      const endDate = new Date(eventEndDateInput.value);
      endDate.setDate(endDate.getDate() + 1);
      eventData.endDate = formatDateForInput(endDate);
    } else {
      eventData.startDateTime = `${eventStartDateInput.value}T${eventStartTimeInput.value}:00`;
      eventData.endDateTime = `${eventEndDateInput.value}T${eventEndTimeInput.value}:00`;
    }
    
    let response;
    if (editingEventId) {
      const event = currentEvents.find(ev => ev.id === editingEventId);
      if (event && event.calendarId) {
        eventData.calendarId = event.calendarId;
      }
      response = await sendMessage({ 
        action: 'updateEvent', 
        eventId: editingEventId, 
        event: eventData 
      });
    } else {
      response = await sendMessage({ 
        action: 'createEvent', 
        event: eventData 
      });
    }
    
    if (response.success) {
      closeEventModal();
      if (editingEventId && response.event) {
        // Update existing event card without reloading
        updateEventCard(editingEventId, response.event);
        showNotification('Event updated successfully', 'success');
      } else {
        // New event created, reload to show it
        loadEvents();
        showNotification('Event created successfully', 'success');
      }
    } else {
      alert('Failed to save event: ' + response.error);
    }
  } catch (error) {
    alert('Failed to save event: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// Delete Modal
function openDeleteModal() {
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
}

async function handleDeleteEvent() {
  if (!editingEventId) return;
  
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Deleting...';
  
  try {
    const response = await sendMessage({ 
      action: 'deleteEvent', 
      eventId: editingEventId 
    });
    
    if (response.success) {
      closeDeleteModal();
      closeEventModal();
      loadEvents();
    } else {
      alert('Failed to delete event: ' + response.error);
    }
  } catch (error) {
    alert('Failed to delete event: ' + error.message);
  } finally {
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = 'Delete';
  }
}

// UI State Management
function showLoginScreen() {
  loginScreen.classList.remove('hidden');
  calendarScreen.classList.add('hidden');
}

function showCalendarScreen() {
  loginScreen.classList.add('hidden');
  calendarScreen.classList.remove('hidden');
  updateDateDisplay();
}

function showLoading() {
  hideAllStates();
  loadingEl.classList.remove('hidden');
}

function showEmpty() {
  hideAllStates();
  emptyStateEl.classList.remove('hidden');
}

function showError(message) {
  hideAllStates();
  errorMessageEl.textContent = message || 'Something went wrong';
  errorStateEl.classList.remove('hidden');
}

function hideAllStates() {
  loadingEl.classList.add('hidden');
  emptyStateEl.classList.add('hidden');
  errorStateEl.classList.add('hidden');
  allDaySectionEl.classList.add('hidden');
  timedEventsEl.innerHTML = '';
}

// Auto Refresh
function startAutoRefresh() {
  stopAutoRefresh();
  
  // Update every 30 seconds for real-time updates
  // Don't show loading indicator during auto-refresh to prevent flickering
  refreshInterval = setInterval(() => {
    loadEvents(false);
  }, 30 * 1000); // 30 seconds
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (todayRefreshInterval) {
    clearInterval(todayRefreshInterval);
    todayRefreshInterval = null;
  }
}

// Utilities
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }).toLowerCase();
}

function formatDateForInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// All Day Toggle Functions
function toggleAllDaySection() {
  const isCurrentlyExpanded = !allDayListEl.classList.contains('collapsed');
  const newState = !isCurrentlyExpanded;
  
  setAllDayToggleState(newState);
  updateAllDayToggleUI(newState);
}

function updateAllDayToggleUI(isExpanded) {
  if (isExpanded) {
    allDayListEl.classList.remove('collapsed');
    allDayToggleBtn.classList.remove('collapsed');
  } else {
    allDayListEl.classList.add('collapsed');
    allDayToggleBtn.classList.add('collapsed');
  }
}

function getAllDayToggleState() {
  const saved = localStorage.getItem('allDayExpanded');
  // Default to true (expanded) if not set
  return saved !== null ? saved === 'true' : true;
}

function setAllDayToggleState(isExpanded) {
  localStorage.setItem('allDayExpanded', isExpanded.toString());
}

// Notification Toast Management
let notificationToasts = [];
const MAX_TOASTS = 3;

function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  // Remove oldest toast if we have max toasts
  if (notificationToasts.length >= MAX_TOASTS) {
    const oldestToast = notificationToasts.shift();
    if (oldestToast && oldestToast.element) {
      oldestToast.element.classList.add('hidden');
      setTimeout(() => {
        if (oldestToast.element && oldestToast.element.parentNode) {
          oldestToast.element.parentNode.removeChild(oldestToast.element);
        }
      }, 300);
    }
  }
  
  // Create new toast element
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.id = toastId;
  
  const content = document.createElement('div');
  content.className = 'notification-content';
  
  const icon = document.createElement('div');
  icon.className = 'notification-icon';
  
  // Set icon based on type
  if (type === 'success') {
    icon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"></path>
      </svg>
    `;
    toast.classList.add('success');
  } else {
    // Default: info icon (eye icon for external calendar)
    icon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }
  
  const messageEl = document.createElement('span');
  messageEl.className = 'notification-message';
  messageEl.textContent = message;
  
  content.appendChild(icon);
  content.appendChild(messageEl);
  toast.appendChild(content);
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Store toast info
  const toastInfo = {
    id: toastId,
    element: toast,
    timeout: null
  };
  
  // Auto-hide after 3 seconds
  toastInfo.timeout = setTimeout(() => {
    removeNotification(toastId);
  }, 3000);
  
  notificationToasts.push(toastInfo);
}

function removeNotification(toastId) {
  const index = notificationToasts.findIndex(t => t.id === toastId);
  if (index === -1) return;
  
  const toastInfo = notificationToasts[index];
  if (toastInfo.timeout) {
    clearTimeout(toastInfo.timeout);
  }
  
  if (toastInfo.element) {
    toastInfo.element.classList.remove('show');
    toastInfo.element.classList.add('hidden');
    setTimeout(() => {
      if (toastInfo.element && toastInfo.element.parentNode) {
        toastInfo.element.parentNode.removeChild(toastInfo.element);
      }
    }, 300);
  }
  
  notificationToasts.splice(index, 1);
}

// Drag and Drop for Event Cards
let dragState = null;
let hasDragged = false;

function setupEventCardDragAndDrop(card, onDragStartCallback = null) {
  card.addEventListener('mousedown', (e) => {
    // Don't start drag if clicking on resize handle
    if (e.target.classList.contains('timeline-event-resize-handle')) {
      return;
    }
    
    const eventId = card.dataset.eventId;
    const event = currentEvents.find(ev => ev.id === eventId);
    if (!event || event.isAllDay || event.isReadOnly || event.isExternal) return; // Can't drag all-day, readonly, or external events
    
    const timelineContent = card.closest('.timeline-content');
    if (!timelineContent) return;
    
    const HOUR_HEIGHT = 48;
    const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
    
    const originalStart = new Date(event.start);
    const originalEnd = new Date(event.end);
    const duration = originalEnd - originalStart;
    
    const cardRect = card.getBoundingClientRect();
    const timelineRect = timelineContent.getBoundingClientRect();
    const startY = e.clientY;
    const startTop = cardRect.top - timelineRect.top;
    
    hasDragged = false;
    
    dragState = {
      eventId,
      event,
      originalStart,
      originalEnd,
      duration,
      startY,
      startTop,
      card,
      timelineContent,
      onDragStartCallback
    };
    
    card.classList.add('dragging');
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
}

document.addEventListener('mousemove', (e) => {
  if (!dragState) return;
  
  const { startY, startTop, duration, card, timelineContent, originalStart, onDragStartCallback } = dragState;
  const timelineRect = timelineContent.getBoundingClientRect();
  const deltaY = e.clientY - startY;
  
  // Mark that we've actually dragged (moved more than 3px)
  if (Math.abs(deltaY) > 3) {
    hasDragged = true;
    if (onDragStartCallback) {
      onDragStartCallback();
    }
  }
  
  const newTop = startTop + deltaY;
  
  // Calculate new start time (snap to 15-minute intervals)
  const HOUR_HEIGHT = 48;
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
  const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4; // 15 minutes = 12px
  
  // Snap to nearest 15-minute interval
  const snappedTop = Math.round(newTop / QUARTER_HOUR_HEIGHT) * QUARTER_HOUR_HEIGHT;
  const newStartMinutes = Math.max(0, Math.min(24 * 60 - 1, Math.round(snappedTop / MINUTE_HEIGHT)));
  
  // Round to nearest 15 minutes
  const roundedMinutes = Math.round(newStartMinutes / 15) * 15;
  
  const newStart = new Date(currentDate);
  newStart.setHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);
  
  // Calculate new end time (preserve duration)
  const newEnd = new Date(newStart.getTime() + duration);
  
  // Update card position (use snapped position)
  const snappedTopPx = (roundedMinutes * MINUTE_HEIGHT);
  card.style.top = `${snappedTopPx}px`;
  
  // Update data attributes for preview
  card.dataset.dragStart = newStart.toISOString();
  card.dataset.dragEnd = newEnd.toISOString();
  
  // Update time display
  const timeDisplay = card.querySelector('.timeline-event-time');
  if (timeDisplay) {
    timeDisplay.textContent = `${formatTime(newStart.toISOString())} – ${formatTime(newEnd.toISOString())}`;
  }
});

document.addEventListener('mouseup', async (e) => {
  if (!dragState) return;
  
  const { eventId, card, originalStart } = dragState;
  
  // Check if position actually changed
  const newStart = card.dataset.dragStart ? new Date(card.dataset.dragStart) : null;
  const newEnd = card.dataset.dragEnd ? new Date(card.dataset.dragEnd) : null;
  
  if (hasDragged && newStart && newEnd && (newStart.getTime() !== originalStart.getTime())) {
    // Update event via API
    const event = currentEvents.find(ev => ev.id === eventId);
    if (event) {
      const eventData = {
        title: event.title,
        isAllDay: false,
        startDateTime: newStart.toISOString(),
        endDateTime: newEnd.toISOString(),
        location: event.location || null,
        description: event.description || null,
        calendarId: event.calendarId || 'primary'
      };
      
      try {
        const response = await sendMessage({
          action: 'updateEvent',
          eventId: eventId,
          event: eventData
        });
        
        if (response.success && response.event) {
          // Update the card without reloading all events
          updateEventCard(eventId, response.event);
          showNotification('Event updated successfully', 'success');
        } else {
          // Revert on error
          renderEvents(currentEvents);
          alert('Failed to update event: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        // Revert on error
        renderEvents(currentEvents);
        alert('Failed to update event: ' + error.message);
      }
    }
  }
  
  // Cleanup
  card.classList.remove('dragging');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  delete card.dataset.dragStart;
  delete card.dataset.dragEnd;
  dragState = null;
  hasDragged = false;
});

// Resize Handles for Event Cards
let resizeState = null;
let hasResized = false;

function setupEventCardResize(card, onResizeStartCallback = null) {
  const topHandle = card.querySelector('.timeline-event-resize-handle-top');
  const bottomHandle = card.querySelector('.timeline-event-resize-handle-bottom');
  
  if (!topHandle || !bottomHandle) return;
  
  // Top handle - resize start time
  topHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    hasResized = false;
    startResize(card, 'top', e, onResizeStartCallback);
  });
  
  // Bottom handle - resize end time
  bottomHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    hasResized = false;
    startResize(card, 'bottom', e, onResizeStartCallback);
  });
}

function startResize(card, handle, e, onResizeStartCallback = null) {
  const eventId = card.dataset.eventId;
  const event = currentEvents.find(ev => ev.id === eventId);
  if (!event || event.isAllDay || event.isReadOnly || event.isExternal) return; // Can't resize all-day, readonly, or external events
  
  const timelineContent = card.closest('.timeline-content');
  if (!timelineContent) return;
  
  const HOUR_HEIGHT = 48;
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
  
  const originalStart = new Date(event.start);
  const originalEnd = new Date(event.end);
  const cardRect = card.getBoundingClientRect();
  const timelineRect = timelineContent.getBoundingClientRect();
  const startY = e.clientY;
  const startTop = cardRect.top - timelineRect.top;
  const startHeight = cardRect.height;
  
  resizeState = {
    eventId,
    event,
    originalStart,
    originalEnd,
    handle,
    startY,
    startTop,
    startHeight,
    card,
    timelineContent,
    onResizeStartCallback
  };
  
  card.classList.add('resizing');
  document.body.style.cursor = handle === 'top' ? 'n-resize' : 's-resize';
  document.body.style.userSelect = 'none';
}

document.addEventListener('mousemove', (e) => {
  if (!resizeState) return;
  
  const { handle, startY, startTop, startHeight, card, timelineContent, originalStart, originalEnd, onResizeStartCallback } = resizeState;
  const timelineRect = timelineContent.getBoundingClientRect();
  const deltaY = e.clientY - startY;
  
  // Mark that we've actually resized (moved more than 3px)
  if (Math.abs(deltaY) > 3) {
    hasResized = true;
    if (onResizeStartCallback) {
      onResizeStartCallback();
    }
  }
  
  const HOUR_HEIGHT = 48;
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
  const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4; // 15 minutes = 12px
  
  let newStart = new Date(originalStart);
  let newEnd = new Date(originalEnd);
  
  if (handle === 'top') {
    // Resize start time (snap to 15-minute intervals)
    const newTop = startTop + deltaY;
    const snappedTop = Math.round(newTop / QUARTER_HOUR_HEIGHT) * QUARTER_HOUR_HEIGHT;
    const newStartMinutes = Math.max(0, Math.min(24 * 60 - 1, Math.round(snappedTop / MINUTE_HEIGHT)));
    
    // Round to nearest 15 minutes
    const roundedMinutes = Math.round(newStartMinutes / 15) * 15;
    
    newStart = new Date(currentDate);
    newStart.setHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);
    
    // Don't allow start to be after end
    if (newStart >= newEnd) {
      newStart = new Date(newEnd.getTime() - 15 * 60 * 1000); // Minimum 15 minutes
    }
    
    const topPx = (newStart.getHours() * HOUR_HEIGHT) + (newStart.getMinutes() * MINUTE_HEIGHT);
    const heightPx = (newEnd.getHours() * HOUR_HEIGHT + newEnd.getMinutes() * MINUTE_HEIGHT) - topPx;
    
    card.style.top = `${topPx}px`;
    card.style.height = `${Math.max(24, heightPx)}px`;
  } else {
    // Resize end time (snap to 15-minute intervals)
    const newHeight = startHeight + deltaY;
    const snappedBottom = startTop + Math.round(newHeight / QUARTER_HOUR_HEIGHT) * QUARTER_HOUR_HEIGHT;
    const endMinutes = Math.round(snappedBottom / MINUTE_HEIGHT);
    const newEndMinutes = Math.max(0, Math.min(24 * 60 - 1, endMinutes));
    
    // Round to nearest 15 minutes
    const roundedEndMinutes = Math.round(newEndMinutes / 15) * 15;
    
    newEnd = new Date(currentDate);
    newEnd.setHours(Math.floor(roundedEndMinutes / 60), roundedEndMinutes % 60, 0, 0);
    
    // Don't allow end to be before start
    if (newEnd <= newStart) {
      newEnd = new Date(newStart.getTime() + 15 * 60 * 1000); // Minimum 15 minutes
    }
    
    const topPx = (newStart.getHours() * HOUR_HEIGHT) + (newStart.getMinutes() * MINUTE_HEIGHT);
    const heightPx = (newEnd.getHours() * HOUR_HEIGHT + newEnd.getMinutes() * MINUTE_HEIGHT) - topPx;
    
    card.style.height = `${Math.max(24, heightPx)}px`;
  }
  
  // Update data attributes for preview
  card.dataset.resizeStart = newStart.toISOString();
  card.dataset.resizeEnd = newEnd.toISOString();
  
  // Update time display
  const timeDisplay = card.querySelector('.timeline-event-time');
  if (timeDisplay) {
    timeDisplay.textContent = `${formatTime(newStart.toISOString())} – ${formatTime(newEnd.toISOString())}`;
  }
});

document.addEventListener('mouseup', async (e) => {
  if (!resizeState) return;
  
  const { eventId, card, originalStart, originalEnd } = resizeState;
  
  // Check if time actually changed
  const newStart = card.dataset.resizeStart ? new Date(card.dataset.resizeStart) : null;
  const newEnd = card.dataset.resizeEnd ? new Date(card.dataset.resizeEnd) : null;
  
  if (hasResized && newStart && newEnd && 
      (newStart.getTime() !== originalStart.getTime() || newEnd.getTime() !== originalEnd.getTime())) {
    // Update event via API
    const event = currentEvents.find(ev => ev.id === eventId);
    if (event) {
      const eventData = {
        title: event.title,
        isAllDay: false,
        startDateTime: newStart.toISOString(),
        endDateTime: newEnd.toISOString(),
        location: event.location || null,
        description: event.description || null,
        calendarId: event.calendarId || 'primary'
      };
      
      try {
        const response = await sendMessage({
          action: 'updateEvent',
          eventId: eventId,
          event: eventData
        });
        
        if (response.success && response.event) {
          // Update the card without reloading all events
          updateEventCard(eventId, response.event);
          showNotification('Event updated successfully', 'success');
        } else {
          // Revert on error
          renderEvents(currentEvents);
          alert('Failed to update event: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        // Revert on error
        renderEvents(currentEvents);
        alert('Failed to update event: ' + error.message);
      }
    }
  }
  
  // Cleanup
  card.classList.remove('resizing');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  delete card.dataset.resizeStart;
  delete card.dataset.resizeEnd;
  resizeState = null;
  hasResized = false;
});
