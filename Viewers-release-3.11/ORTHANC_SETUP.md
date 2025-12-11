# Connecting to Your Orthanc Server

This guide explains how to configure OHIF Viewer to connect to your Orthanc server.

## Configuration File

A configuration file has been created at:
```
platform/app/public/config/orthanc_server.js
```

## Server Details

- **URL**: `http://20.124.233.83:8042/`
- **Username**: `alice`
- **Password**: `alicePassword`
- **DICOMweb Endpoint**: `http://20.124.233.83:8042/dicom-web`

## How to Use

### Option 1: Development Mode (Recommended)

Run the development server with the Orthanc configuration:

```bash
# From the project root
cd platform/app
APP_CONFIG=config/orthanc_server.js yarn dev

# Or from root directory
cd platform/app && APP_CONFIG=config/orthanc_server.js yarn dev
```

### Option 2: Build with Orthanc Config

Build the production version with your Orthanc configuration:

```bash
# From project root
cd platform/app
APP_CONFIG=config/orthanc_server.js yarn build:viewer

# Then serve the built files
cd dist
npx serve -p 3000
```

### Option 3: Set as Default Config

If you want to use this as your default configuration, you can:

1. **Rename the file**:
   ```bash
   # Backup current default
   cp platform/app/public/config/default.js platform/app/public/config/default.js.backup
   
   # Copy your Orthanc config as default
   cp platform/app/public/config/orthanc_server.js platform/app/public/config/default.js
   ```

2. **Or modify default.js** directly to use your Orthanc settings

## Configuration Details

The configuration includes:

- **DICOMweb Endpoints**:
  - `qidoRoot`: For querying studies (QIDO-RS)
  - `wadoRoot`: For retrieving images (WADO-RS)
  - `wadoUriRoot`: For WADO-URI requests

- **Authentication**:
  - Uses HTTP Basic Authentication
  - Format: `username:password` in `requestOptions.auth`

- **Features Enabled**:
  - Study list querying
  - Image retrieval
  - DICOM upload
  - Fuzzy matching
  - Wildcard search

## Testing the Connection

1. **Start the development server**:
   ```bash
   cd platform/app
   APP_CONFIG=config/orthanc_server.js yarn dev
   ```

2. **Open your browser**:
   - Navigate to `http://localhost:3000`
   - You should see the study list screen

3. **Check for studies**:
   - The viewer will automatically query your Orthanc server
   - If studies exist, they will appear in the list
   - If no studies are found, you'll see an empty state

## Troubleshooting

### Connection Errors

**401 Unauthorized**:
- Check that username and password are correct
- Verify Orthanc authentication is enabled
- Check Orthanc configuration for registered users

**403 Forbidden**:
- Verify user permissions in Orthanc
- Check that DICOMweb plugin is enabled in Orthanc

**CORS Errors**:
- Orthanc must allow cross-origin requests
- Check Orthanc `RemoteAccessAllowed` setting
- May need to configure CORS headers in Orthanc

**Connection Refused**:
- Verify the server is running: `http://20.124.233.83:8042`
- Check network connectivity
- Verify firewall settings

### Verify Orthanc is Accessible

Test the connection directly:

```bash
# Test basic connectivity
curl http://20.124.233.83:8042/

# Test with authentication
curl -u alice:alicePassword http://20.124.233.83:8042/

# Test DICOMweb endpoint
curl -u alice:alicePassword http://20.124.233.83:8042/dicom-web/studies
```

### Check Orthanc Configuration

Ensure Orthanc has:
1. **DICOMweb plugin enabled**
2. **Authentication configured** (if using auth)
3. **Remote access allowed**
4. **CORS enabled** (for browser access)

## Alternative: Environment Variables

If you prefer using environment variables, you can modify the config to read from them:

```javascript
// In orthanc_server.js
const ORTHANC_URL = process.env.ORTHANC_URL || 'http://20.124.233.83:8042';
const ORTHANC_USERNAME = process.env.ORTHANC_USERNAME || 'alice';
const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD || 'alicePassword';

// Then use in configuration:
wadoUriRoot: `${ORTHANC_URL}/dicom-web`,
qidoRoot: `${ORTHANC_URL}/dicom-web`,
wadoRoot: `${ORTHANC_URL}/dicom-web`,
requestOptions: {
  auth: `${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`,
},
```

Then set environment variables:
```bash
export ORTHANC_URL="http://20.124.233.83:8042"
export ORTHANC_USERNAME="alice"
export ORTHANC_PASSWORD="alicePassword"
```

## Security Notes

⚠️ **Important Security Considerations**:

1. **Credentials in Config File**:
   - The config file contains plaintext credentials
   - Do NOT commit this file to public repositories
   - Consider using environment variables for production

2. **HTTP vs HTTPS**:
   - Current configuration uses HTTP (not secure)
   - For production, use HTTPS
   - Update URL to `https://20.124.233.83:8042/` if SSL is configured

3. **Network Security**:
   - Ensure the Orthanc server is behind a firewall
   - Use VPN or secure network connection
   - Consider IP whitelisting

## Next Steps

1. **Test the connection** using the development server
2. **Verify studies appear** in the study list
3. **Test viewing** a study by clicking on it
4. **Configure for production** if needed

## Quick Start Command

```bash
# From project root
cd platform/app && APP_CONFIG=config/orthanc_server.js yarn dev
```

Then open: `http://localhost:3000`

