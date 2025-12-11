# Quick Start: Using Orthanc Server

## ✅ Configuration Updated

I've updated `platform/app/public/config/default.js` to use your Orthanc server as the default data source.

## 🔄 Steps to See Your Orthanc Studies

### 1. Stop the current dev server (if running)
Press `Ctrl+C` in the terminal where the dev server is running.

### 2. Restart the dev server
```bash
cd platform/app
yarn dev
```

### 3. Clear browser cache
**Important**: The browser may have cached the old studies. You need to do a hard refresh:

- **Chrome/Edge**: Press `Ctrl+Shift+R` or `Ctrl+F5`
- **Firefox**: Press `Ctrl+Shift+R` or `Ctrl+F5`
- **Safari**: Press `Cmd+Shift+R`

Or manually:
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 4. Verify the connection

Open the browser console (F12 → Console tab) and check for:
- Network requests to `http://20.124.233.83:8042/dicom-web/studies`
- Any authentication errors (401, 403)
- Successful responses from Orthanc

## 🔍 Troubleshooting

### Still seeing old studies?

1. **Check browser console** for errors:
   - 401 = Authentication failed
   - 403 = Access forbidden
   - CORS errors = Server not allowing cross-origin requests

2. **Verify network requests**:
   - Open DevTools → Network tab
   - Look for requests to `20.124.233.83:8042`
   - Check if requests include Authorization header

3. **Test Orthanc directly**:
   ```bash
   curl -u alice:alicePassword http://20.124.233.83:8042/dicom-web/studies
   ```

4. **Check if studies exist**:
   ```bash
   curl -u alice:alicePassword http://20.124.233.83:8042/studies
   ```

### No studies showing?

- The Orthanc server might not have any studies yet
- Check Orthanc web interface: `http://20.124.233.83:8042/`
- Upload some DICOM files to Orthanc if needed

## 📝 Configuration Details

- **Server**: `http://20.124.233.83:8042/`
- **DICOMweb Endpoint**: `http://20.124.233.83:8042/dicom-web`
- **Username**: `alice`
- **Default Data Source**: `orthanc`

The configuration is now in `platform/app/public/config/default.js` at the first position in the `dataSources` array.

