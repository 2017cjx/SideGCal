// Calendar Sidebar - Service Worker
// Handles authentication and Google Calendar API calls

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Message handler for communication with side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'login') {
    handleLogin(sendResponse);
    return true;
  }
  
  if (message.action === 'logout') {
    handleLogout(sendResponse);
    return true;
  }
  
  if (message.action === 'getEvents') {
    handleGetEvents(message.date, sendResponse);
    return true;
  }
  
  if (message.action === 'checkAuth') {
    checkAuthStatus(sendResponse);
    return true;
  }
  
  if (message.action === 'createEvent') {
    handleCreateEvent(message.event, sendResponse);
    return true;
  }
  
  if (message.action === 'updateEvent') {
    handleUpdateEvent(message.eventId, message.event, sendResponse);
    return true;
  }
  
  if (message.action === 'deleteEvent') {
    handleDeleteEvent(message.eventId, sendResponse);
    return true;
  }
});

// Login - get OAuth token
async function handleLogin(sendResponse) {
  try {
    const token = await getAuthToken(true);
    if (token) {
      await chrome.storage.local.set({ isLoggedIn: true });
      sendResponse({ success: true, token });
    } else {
      sendResponse({ success: false, error: 'Failed to get token' });
    }
  } catch (error) {
    console.error('Login error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Logout - revoke token
async function handleLogout(sendResponse) {
  try {
    const token = await getAuthToken(false);
    if (token) {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
      chrome.identity.removeCachedAuthToken({ token });
    }
    await chrome.storage.local.set({ isLoggedIn: false });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Check if user is authenticated
async function checkAuthStatus(sendResponse) {
  try {
    const token = await getAuthToken(false);
    const isLoggedIn = !!token;
    await chrome.storage.local.set({ isLoggedIn });
    sendResponse({ isLoggedIn, token });
  } catch (error) {
    sendResponse({ isLoggedIn: false });
  }
}

// Get events for a specific date
async function handleGetEvents(dateString, sendResponse) {
  try {
    const token = await getAuthToken(false);
    
    if (!token) {
      sendResponse({ success: false, error: 'Not authenticated', needsLogin: true });
      return;
    }
    
    const date = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const events = await fetchCalendarEvents(token, startOfDay, endOfDay);
    
    sendResponse({ success: true, events });
  } catch (error) {
    console.error('Get events error:', error);
    
    if (error.message.includes('401')) {
      chrome.identity.removeCachedAuthToken({ token: await getAuthToken(false) });
      sendResponse({ success: false, error: 'Token expired', needsLogin: true });
    } else {
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Create a new event
async function handleCreateEvent(eventData, sendResponse) {
  try {
    const token = await getAuthToken(false);
    
    if (!token) {
      sendResponse({ success: false, error: 'Not authenticated', needsLogin: true });
      return;
    }
    
    const event = buildEventPayload(eventData);
    
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }
    
    const createdEvent = await response.json();
    sendResponse({ success: true, event: transformEvent(createdEvent) });
  } catch (error) {
    console.error('Create event error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Update an existing event
async function handleUpdateEvent(eventId, eventData, sendResponse) {
  try {
    const token = await getAuthToken(false);
    
    if (!token) {
      sendResponse({ success: false, error: 'Not authenticated', needsLogin: true });
      return;
    }
    
    const event = buildEventPayload(eventData);
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }
    
    const updatedEvent = await response.json();
    sendResponse({ success: true, event: transformEvent(updatedEvent) });
  } catch (error) {
    console.error('Update event error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Delete an event
async function handleDeleteEvent(eventId, sendResponse) {
  try {
    const token = await getAuthToken(false);
    
    if (!token) {
      sendResponse({ success: false, error: 'Not authenticated', needsLogin: true });
      return;
    }
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Build event payload for Google Calendar API
function buildEventPayload(eventData) {
  const event = {
    summary: eventData.title
  };
  
  // Handle all-day events
  if (eventData.isAllDay) {
    event.start = { date: eventData.startDate };
    event.end = { date: eventData.endDate || eventData.startDate };
  } else {
    event.start = { dateTime: eventData.startDateTime, timeZone: eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone };
    event.end = { dateTime: eventData.endDateTime, timeZone: eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone };
  }
  
  if (eventData.location) {
    event.location = eventData.location;
  }
  
  if (eventData.description) {
    event.description = eventData.description;
  }
  
  if (eventData.colorId) {
    event.colorId = eventData.colorId;
  }
  
  return event;
}

// Get OAuth token
function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// Fetch events from Google Calendar API
async function fetchCalendarEvents(token, startDate, endDate) {
  const params = new URLSearchParams({
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50'
  });
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return (data.items || []).map(transformEvent);
}

// Transform API event to our format
function transformEvent(event) {
  return {
    id: event.id,
    title: event.summary || '(No title)',
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    isAllDay: !event.start.dateTime,
    location: event.location || null,
    description: event.description || null,
    htmlLink: event.htmlLink,
    colorId: event.colorId || null,
    hangoutLink: event.hangoutLink || null,
    attendees: event.attendees || []
  };
}
