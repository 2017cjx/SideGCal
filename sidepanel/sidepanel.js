// Calendar Sidebar - Side Panel Logic

// State
let currentDate = new Date();
let refreshInterval = null;
let currentEvents = [];
let editingEventId = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const calendarScreen = document.getElementById('calendar-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
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
  prevDayBtn.addEventListener('click', () => navigateDay(-1));
  nextDayBtn.addEventListener('click', () => navigateDay(1));
  todayBtn.addEventListener('click', goToToday);
  retryBtn.addEventListener('click', () => loadEvents());
  
  // Add Event
  addEventBtn.addEventListener('click', () => openEventModal());
  emptyAddBtn.addEventListener('click', () => openEventModal());
  
  // Modal
  modalClose.addEventListener('click', closeEventModal);
  cancelBtn.addEventListener('click', closeEventModal);
  eventModal.querySelector('.modal-backdrop').addEventListener('click', closeEventModal);
  eventForm.addEventListener('submit', handleSaveEvent);
  eventAllDayInput.addEventListener('change', handleAllDayToggle);
  deleteEventBtn.addEventListener('click', () => openDeleteModal());
  
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
async function loadEvents() {
  showLoading();
  
  try {
    const response = await sendMessage({ 
      action: 'getEvents', 
      date: currentDate.toISOString() 
    });
    
    if (response.success) {
      currentEvents = response.events;
      renderEvents(response.events);
    } else if (response.needsLogin) {
      showLoginScreen();
    } else {
      showError(response.error);
    }
  } catch (error) {
    showError(error.message);
  }
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
  } else {
    allDaySectionEl.classList.add('hidden');
  }
  
  renderTimedEvents(timedEvents);
  
  // Add click handlers to event cards
  document.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const eventId = card.dataset.eventId;
      const event = currentEvents.find(ev => ev.id === eventId);
      if (event) {
        openEventModal(event);
      }
    });
  });
}

function renderTimedEvents(events) {
  const now = new Date();
  const isToday = isSameDay(currentDate, now);
  
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  let html = '';
  let timeIndicatorInserted = false;
  
  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    if (isToday && !timeIndicatorInserted && eventStart > now) {
      html += createTimeIndicator(now);
      timeIndicatorInserted = true;
    }
    
    let status = '';
    if (isToday) {
      if (eventEnd < now) {
        status = 'past';
      } else if (eventStart <= now && eventEnd >= now) {
        status = 'current';
      }
    }
    
    html += createEventCard(event, status);
  }
  
  if (isToday && !timeIndicatorInserted) {
    html += createTimeIndicator(now);
  }
  
  timedEventsEl.innerHTML = html;
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
  
  return `
    <div class="event-card ${status}" data-event-id="${event.id}">
      <div class="event-color-bar ${colorClass}"></div>
      <div class="event-content">
        <div class="event-title">${escapeHtml(event.title)}</div>
        ${timeStr ? `<div class="event-time">${timeStr}</div>` : ''}
        ${locationHtml}
        ${meetHtml}
      </div>
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

// Event Modal
function openEventModal(event = null) {
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
    
    // Default to current date and next hour
    const now = new Date();
    const startHour = now.getHours() + 1;
    
    eventStartDateInput.value = formatDateForInput(currentDate);
    eventEndDateInput.value = formatDateForInput(currentDate);
    eventStartTimeInput.value = `${String(startHour % 24).padStart(2, '0')}:00`;
    eventEndTimeInput.value = `${String((startHour + 1) % 24).padStart(2, '0')}:00`;
  }
  
  handleAllDayToggle();
  eventModal.classList.remove('hidden');
  eventTitleInput.focus();
}

function closeEventModal() {
  eventModal.classList.add('hidden');
  editingEventId = null;
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
      loadEvents();
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
  refreshInterval = setInterval(() => {
    loadEvents();
  }, 10 * 60 * 1000);
  
  setInterval(() => {
    if (isSameDay(currentDate, new Date())) {
      loadEvents();
    }
  }, 60 * 1000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
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
