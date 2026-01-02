# Calendar Sidebar - Chrome Extension

A slim sidebar extension to view and manage your Google Calendar events at a glance.

## Features

- View today's events in a narrow sidebar
- **Create new events** with full details (title, time, location, description)
- **Edit existing events** - click any event to modify
- **Delete events** with confirmation
- Google Calendar-inspired design
- All-day events support
- Current time indicator
- Navigate between days
- Quick access to Google Meet links
- Auto-refresh every 10 minutes

## Setup Instructions

### Step 1: Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click Enable

4. Configure OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields (App name, email)
   - Add scope: `https://www.googleapis.com/auth/calendar.events`
   - Add your email as a test user
   - Save (can stay in "Testing" mode for personal use)

5. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Chrome Extension**
   - Name: "Calendar Sidebar"
   - Item ID: (get this from Step 2 first, then come back)

### Step 2: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `calendar-sidebar` folder
5. Note the **Extension ID** displayed under your extension

### Step 3: Complete Google Cloud Setup

1. Go back to Google Cloud Console → Credentials
2. Edit your OAuth client ID
3. Add your Extension ID in the "Item ID" field
4. Copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`)

### Step 4: Configure Extension

1. Open `manifest.json`
2. Replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
3. Save the file
4. Go back to `chrome://extensions/`
5. Click the refresh icon on your extension

### Step 5: Test

1. Click the extension icon in Chrome toolbar
2. The side panel should open
3. Click "Sign in with Google"
4. Authorize the app
5. Your calendar events should appear!

## Troubleshooting

**"Authorization failed" error:**
- Make sure your Client ID is correct in manifest.json
- Verify you added your email as a test user in OAuth consent screen
- Check that the Extension ID matches in Google Cloud

**No events showing:**
- Make sure you have events on your primary Google Calendar
- Try the refresh button
- Check browser console for errors (right-click → Inspect)

**Side panel not opening:**
- Make sure you're on Chrome 114 or later
- Try right-clicking the extension icon → "Open side panel"

## File Structure

```
calendar-sidebar/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (auth & API)
├── sidepanel/
│   ├── sidepanel.html     # Side panel UI
│   ├── sidepanel.js       # UI logic
│   └── sidepanel.css      # Styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Customization

**Change colors:** Edit CSS variables in `sidepanel.css` under `:root`

**Change refresh interval:** Edit `startAutoRefresh()` in `sidepanel.js`

**Add more calendars:** Modify `background.js` to fetch from multiple calendars

## Privacy

This extension:
- Only requests read-only access to your calendar
- Does not store your data on any server
- All data stays in your browser
- You can revoke access anytime at https://myaccount.google.com/permissions
# SideGCal
