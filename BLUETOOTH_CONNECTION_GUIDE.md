# Bluetooth & WiFi Connection Modal

## Overview
Added a quick-access connection modal on the home screen to easily pair and switch between Bluetooth and WiFi connections.

## Features

### 1. **Connection Button in Header**
- Located in the top-right of the home dashboard
- Shows current connection type icon (WiFi/Bluetooth/Offline)
- Tap to open the connection modal

### 2. **Connection Modal UI**
The modal displays:

#### WiFi Connection Card
- Current WiFi status
- Connected device name (if available)
- Quick indicator showing if connected

#### Bluetooth Connection Card
- Bluetooth status
- **When NOT connected:**
  - List of available paired devices
  - Refresh button to reload device list
  - "Pair Device" button to open Bluetooth settings
  - Tap any device to connect instantly

- **When CONNECTED:**
  - Shows connected device name
  - "Disconnect" button to break connection

#### Quick Tip Card
- Helpful information about WiFi vs Bluetooth usage
- WiFi: Faster response times through router
- Bluetooth: Direct control without needing WiFi

### 3. **Easy Device Pairing**

**Step 1: Pair Device First**
- Go to Android Settings → Bluetooth
- Search for and pair "Vista-IoT" device
- Return to the app

**Step 2: Connect in App**
- Tap the connection button (WiFi/Bluetooth icon)
- Connection modal opens
- Tap your device in the "Available Devices" list
- Device connects automatically

**Step 3: Start Controlling**
- All controls now work via Bluetooth
- Modal closes automatically after connection
- Connection status shows in header

## File Changes

### New Files Created
- `components/ConnectionModal.tsx` - Main connection management modal

### Modified Files
- `app/(tabs)/home.tsx`:
  - Added ConnectionModal import
  - Added connectionModalVisible state
  - Added connection button in header
  - Integrated modal at bottom
  - Updated header styles for dual buttons

## UI Layout

```
Header:
┌─────────────────────────────────────────┐
│ VISTA                      [WiFi] [Mic] │
│ Smart Home Dashboard                    │
└─────────────────────────────────────────┘
```

## Connection Modal Structure

```
Connection Modal (slide up from bottom)
├── Header
│   ├── "Connection" title
│   └── Close button
├── Content (scrollable)
│   ├── WiFi Connection Card
│   │   ├── Status
│   │   └── Network info (if connected)
│   ├── Bluetooth Connection Card
│   │   ├── Status
│   │   ├── Connected device (if connected)
│   │   ├── Disconnect button (if connected)
│   │   └── Available Devices List (if not connected)
│   │       ├── Device name
│   │       ├── Device address
│   │       └── Connect button
│   └── Info card with usage tips
└── Close button
```

## How to Use

### To Switch to Bluetooth:
1. Tap the connection icon in the header
2. Tap your paired device in the list
3. Wait for "Success" alert
4. Modal closes automatically
5. Connection icon changes to Bluetooth

### To Switch to WiFi:
1. Tap the connection icon
2. The WiFi card shows "Connected"
3. Close the modal
4. WiFi will be used for next commands

### To Disconnect Bluetooth:
1. Tap the connection icon
2. When Bluetooth is connected, see the "Disconnect" button
3. Tap it to disconnect
4. Device returns to WiFi mode

## Features Included

- ✅ Real-time device list refresh
- ✅ Automatic device detection (Vista-IoT, ESP32, HC-05, HC-06)
- ✅ Show both Bluetooth and WiFi options
- ✅ Easy toggle between connection types
- ✅ Status indicators (connected/not connected)
- ✅ Device address display for troubleshooting
- ✅ Quick access to Bluetooth settings
- ✅ Loading states during connection
- ✅ Success/error alerts
- ✅ Responsive design with scaling

## Styling
- Uses app's Teal primary color (#008080)
- Gradient buttons for visual appeal
- Smooth animations (slide up modal)
- Touch-friendly button sizes
- Clear visual feedback for connection status

## Notes
- For Bluetooth: Device must be paired in Android Settings first
- For WiFi: Uses mDNS (vista-iot.local) or stored IP
- Connection state syncs with home dashboard device controls
- Disconnection triggers re-initialization of esp connection

## Testing Checklist
- [ ] Tap connection icon from home screen
- [ ] Modal slides up from bottom
- [ ] Both WiFi and Bluetooth cards visible
- [ ] Can see available paired devices
- [ ] Tap device to connect
- [ ] Connection succeeds with alert
- [ ] Modal closes after success
- [ ] Header icon changes to show new connection type
- [ ] Disconnect button appears when connected
- [ ] Tap disconnect works
- [ ] All device controls work with new connection
