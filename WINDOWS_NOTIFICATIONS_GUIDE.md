# Windows Notifications Setup Guide

## 🔔 How to Enable Notifications for Trading Signals

### Step 1: Enable Browser Notifications

#### For Chrome:
1. **Open the trading application** in Chrome
2. **Look for the notification icon** 🔔 in the address bar when the app loads
3. **Click "Allow"** when prompted for notification permission
4. If you missed it, click the **🔒 lock icon** next to the URL
5. Set **Notifications** to **"Allow"**

#### For Edge:
1. **Open the trading application** in Edge
2. **Click the notification prompt** and select **"Allow"**
3. If you missed it, click the **🔒 lock icon** next to the URL
4. Set **Notifications** to **"Allow"**

#### For Firefox:
1. **Open the trading application** in Firefox
2. **Click "Allow"** when the notification permission popup appears
3. If you missed it, click the **🛡️ shield icon** in the address bar
4. **Enable notifications** for this site

### Step 2: Enable Windows Notifications

#### Windows 10/11 Settings:
1. **Open Windows Settings** (Windows key + I)
2. Go to **System** > **Notifications & actions**
3. Make sure **"Get notifications from apps and other senders"** is **ON**
4. Scroll down and ensure your browser (Chrome/Edge/Firefox) notifications are **ON**

#### Focus Assist Settings:
1. In **Settings** > **System** > **Focus assist**
2. Set to **"Off"** or **"Priority only"**
3. If using "Priority only", add your browser to the priority list

### Step 3: Test Notifications

#### In the Trading App:
1. **Open the trading application**
2. **Click the API status indicator** (top of the page)
3. **Click "テスト通知" (Test Notification)** button
4. You should see a Windows notification appear

#### Manual Test:
```javascript
// Open browser console (F12) and run:
new Notification('🎯 Test Trading Signal', {
  body: 'This is a test notification from your trading app',
  icon: '/favicon.ico'
});
```

### Step 4: Configure Signal Notifications

#### In the Trading App:
1. **Start the application** with `npm run dev`
2. **Click the settings/API status indicator**
3. **Ensure notifications are enabled** in the app settings
4. **Enable "Auto Trading"** to start receiving signal notifications

#### Notification Types You'll Receive:
- **🎯 Trading Signals**: HIGH/LOW signals with confidence levels
- **⚠️ Platform Status**: When TheOption platform goes online/offline
- **💰 Balance Updates**: When your account balance changes
- **📊 Market Alerts**: Important market condition changes

### Step 5: Troubleshooting Common Issues

#### ❌ **"Notifications blocked"**
**Solution:**
1. Clear browser notification permissions
2. Go to browser settings > Privacy > Notifications
3. Remove the localhost entry and refresh the page
4. Allow notifications when prompted again

#### ❌ **"No notifications appearing"**
**Solution:**
1. Check Windows notification settings
2. Ensure Focus Assist is not blocking notifications
3. Test with browser console: `Notification.permission`
4. Should return `"granted"`

#### ❌ **"Notifications work but no sound"**
**Solution:**
1. Check Windows sound settings
2. Ensure notification sounds are enabled
3. The app also generates custom audio alerts using Web Audio API

#### ❌ **"Notifications only work when browser is active"**
**Solution:**
1. This is normal browser behavior
2. For persistent notifications, keep the browser tab active
3. Consider using the app in fullscreen mode

### Step 6: Advanced Notification Features

#### Push Notifications (Service Worker):
The app includes a service worker for enhanced notifications:
```javascript
// Service worker automatically handles:
- Background notifications (when supported)
- Notification click actions
- Auto-opening jp.theoption.com when clicked
```

#### Custom Notification Sounds:
The app generates different sounds based on signal confidence:
- **High Confidence (85%+)**: Higher pitch tone + vibration
- **Medium Confidence (70-84%)**: Standard tone
- **Low Confidence (<70%)**: Lower pitch tone

#### Notification Actions:
When you click a trading signal notification:
1. **Opens jp.theoption.com** in a new tab
2. **Starts 15-second countdown** for trade entry
3. **Closes the notification** automatically

### Step 7: Best Practices

#### For Optimal Performance:
1. **Keep the browser tab active** when trading
2. **Don't minimize the browser** during active trading hours
3. **Ensure stable internet connection** for real-time notifications
4. **Test notifications** before important trading sessions

#### Recommended Trading Hours (for best signal quality):
- **Tokyo Session**: 9:00-11:00 JST
- **Europe Session**: 15:00-17:00 JST
- **Avoid major news events** (app will warn you)

### Step 8: Mobile Notifications (Bonus)

#### If using on mobile browser:
1. **Add to Home Screen** for app-like experience
2. **Enable browser notifications** in mobile settings
3. **Keep screen on** during active trading
4. **Use landscape mode** for better chart viewing

## 🔧 Technical Details

### Browser Compatibility:
- ✅ **Chrome 50+**: Full support
- ✅ **Edge 79+**: Full support  
- ✅ **Firefox 70+**: Full support
- ❌ **Safari**: Limited support (iOS restrictions)

### Notification API Features Used:
```javascript
// The app uses modern notification features:
- Notification.requestPermission()
- new Notification() with custom icons
- notification.onclick handlers
- Custom audio using Web Audio API
- Vibration API (mobile devices)
```

### Troubleshooting Commands:
```javascript
// Check notification permission status:
console.log(Notification.permission);

// Test notification manually:
new Notification('Test', { body: 'Testing notifications' });

// Check if notifications are supported:
console.log('Notification' in window);
```

## 📞 Support

If you're still having issues with notifications:

1. **Check browser console** for error messages (F12)
2. **Verify Windows notification settings** are correct
3. **Test with a simple notification** using browser console
4. **Try a different browser** if issues persist
5. **Restart browser** after changing notification settings

Happy Trading! 🎯📊💰 