# Using Ngrok to Forward OHIF Viewer Traffic

This guide explains how to use ngrok to expose your local OHIF Viewer development server to the internet, allowing you to:
- Test on mobile devices
- Share your development environment with others
- Test webhooks and external integrations
- Access the viewer from anywhere

## What is Ngrok?

Ngrok creates a secure tunnel from a public URL to your local development server. It's perfect for:
- Mobile device testing (test your responsive design on real devices)
- Demo sharing with clients/team members
- Testing integrations that require public URLs
- Webhook development

## Prerequisites

1. **Node.js and Yarn installed** (already done for this project)
2. **Ngrok account** (free tier available)
   - Sign up at: https://dashboard.ngrok.com/signup
   - Free tier includes: 1 tunnel, random subdomain

## Installation

### Option 1: Download Ngrok (Recommended)

1. **Download ngrok**:
   - Go to: https://ngrok.com/download
   - Download for your OS (Windows/Mac/Linux)
   - Or use package manager:
     ```bash
     # Windows (with Chocolatey)
     choco install ngrok
     
     # Mac (with Homebrew)
     brew install ngrok/ngrok/ngrok
     
     # Linux
     wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
     tar -xvzf ngrok-v3-stable-linux-amd64.tgz
     ```

2. **Get your authtoken**:
   - Go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authtoken

3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

### Option 2: Use Ngrok via npm (Alternative)

```bash
npm install -g ngrok
```

## Setup Instructions

### Step 1: Start the OHIF Viewer Development Server

First, start your local development server:

```bash
# From the project root
yarn dev

# Or if you prefer the fast dev server
yarn dev:fast
```

The server will typically start on `http://localhost:3000` (check the terminal output for the exact port).

**Note**: The default port is usually **3000**, but it may vary. Check the terminal output to confirm.

### Step 2: Start Ngrok Tunnel

Open a **new terminal window** and run:

```bash
# Basic tunnel (free tier - random subdomain)
ngrok http 3000

# Or if your server is on a different port
ngrok http 8080
```

### Step 3: Access Your Tunneled Site

Ngrok will display:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

**Note about URL structure:**
- Ngrok URLs always end with `.ngrok-free.app` (free tier) or `.ngrok.io` (paid)
- The subdomain (e.g., `abc123`) is randomly generated on the free tier
- You're tunneling to your **development server** (localhost:3000), not a production build
- The "dev" you might see is because we're using `yarn dev` (development mode), not because of ngrok

You can now:
- Open the ngrok URL in any browser
- Share this URL with others
- Test on mobile devices using this URL

## Advanced Configuration

### Custom Domain (Paid Plans)

If you have a paid ngrok plan, you can use a custom domain:

```bash
ngrok http 3000 --domain=your-custom-domain.ngrok.io
```

### Additional Options

```bash
# Set a custom subdomain (requires paid plan)
ngrok http 3000 --subdomain=ohif-viewer

# Allow access from specific IPs only
ngrok http 3000 --remote-addr=1.2.3.4

# Enable basic authentication
ngrok http 3000 --basic-auth="username:password"

# Show web interface (port 4040)
ngrok http 3000
# Then visit http://localhost:4040 for web UI
```

## Ngrok Configuration File

Create a config file for persistent settings:

1. **Create config file** (`~/.ngrok2/ngrok.yml` on Mac/Linux or `%USERPROFILE%\.ngrok2\ngrok.yml` on Windows):

```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  ohif-viewer:
    addr: 3000
    proto: http
    # Optional: set subdomain (requires paid plan)
    # subdomain: ohif-viewer
```

2. **Use the named tunnel**:
```bash
ngrok start ohif-viewer
```

## Mobile Testing

### Access from Mobile Device

1. **Start ngrok tunnel** (see Step 2 above)
2. **Get the ngrok URL** (e.g., `https://abc123.ngrok-free.app`)
3. **On your mobile device**:
   - Connect to the same network (or use mobile data)
   - Open browser and navigate to the ngrok URL
   - Test your responsive design!

### Important Notes for Mobile Testing

- **HTTPS**: Ngrok provides HTTPS by default, which is required for many modern web features
- **Network**: Your mobile device doesn't need to be on the same network
- **CORS**: If you encounter CORS issues, you may need to configure your app's CORS settings

## Troubleshooting

### "Tunnel session failed: Too Many Connections"

**Solution**: 
- Free tier has connection limits
- Wait a few minutes and try again
- Consider upgrading to a paid plan

### "Port already in use"

**Solution**: 
```bash
# Check what's using the port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux

# Use a different port for OHIF
PORT=8080 yarn dev
# Then tunnel that port
ngrok http 8080
```

### CORS Errors

If you see CORS errors when accessing via ngrok:

1. **Check your app's CORS configuration** in `platform/app/config/`
2. **Add ngrok domain to allowed origins** (if your config restricts origins)
3. **For development**, you can disable CORS checks temporarily

### WebSocket Issues

If WebSocket connections fail:

1. **Ngrok supports WebSockets** automatically
2. **Check your WebSocket configuration** in the app
3. **Verify the WebSocket URL** uses the ngrok domain

### "ERR_CONNECTION_REFUSED"

**Solution**:
- Make sure your local dev server is running
- Verify the port number matches (3000 or whatever port is shown)
- Check firewall settings

## Security Considerations

### ⚠️ Important Security Notes

1. **Anyone with the ngrok URL can access your dev server**
   - Use basic authentication if sharing with others
   - Don't expose sensitive data

2. **Ngrok free tier**:
   - URLs are random and change each time
   - URLs are public (anyone with the link can access)
   - Consider paid plans for production use

3. **For production**:
   - Use proper hosting (Netlify, Vercel, etc.)
   - Don't use ngrok for production deployments

## Best Practices

1. **Use ngrok for development/testing only**
2. **Enable authentication** if sharing with others:
   ```bash
   ngrok http 3000 --basic-auth="username:password"
   ```
3. **Monitor ngrok dashboard** for usage and connections
4. **Stop the tunnel** when not in use to save quota

## Alternative: Localtunnel (Free Alternative)

If you prefer a free alternative without signup:

```bash
# Install
npm install -g localtunnel

# Start tunnel
lt --port 3000
```

**Note**: Localtunnel URLs are also random and change each time.

## Integration with Development Workflow

### Quick Start Script

Create a script to start both server and ngrok:

**`start-with-ngrok.sh`** (Mac/Linux):
```bash
#!/bin/bash
# Start OHIF dev server in background
yarn dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Start ngrok
ngrok http 3000

# Cleanup on exit
trap "kill $DEV_PID" EXIT
```

**`start-with-ngrok.bat`** (Windows):
```batch
@echo off
start "OHIF Dev Server" cmd /k "yarn dev"
timeout /t 5
ngrok http 3000
```

## Monitoring and Debugging

### Ngrok Web Interface

When ngrok is running, visit:
```
http://localhost:4040
```

This shows:
- Request inspector (all HTTP requests)
- Response details
- WebSocket connections
- Replay requests

### View Logs

```bash
# Verbose logging
ngrok http 3000 --log=stdout

# Log to file
ngrok http 3000 --log=stdout > ngrok.log
```

## Example Workflow

```bash
# Terminal 1: Start dev server
cd Viewers-release-3.11
yarn dev
# Server starts on http://localhost:3000

# Terminal 2: Start ngrok
ngrok http 3000

# Output:
# Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
# 
# Visit https://abc123.ngrok-free.app in your browser
# Or share this URL with others for testing
```

## Why Use Dev Server Instead of Production Build?

### Development Server (`yarn dev`)
- ✅ **Hot reload**: Changes appear instantly without rebuilding
- ✅ **Faster iteration**: No need to rebuild for each change
- ✅ **Source maps**: Better debugging with original source code
- ✅ **Development tools**: React DevTools, error overlays, etc.
- ⚠️ **Slower performance**: Not optimized for production
- ⚠️ **Larger bundle size**: Includes development code

### Production Build (`yarn build`)
- ✅ **Optimized**: Minified, tree-shaken, optimized code
- ✅ **Faster loading**: Smaller bundle sizes
- ✅ **Production-ready**: Same as what you'd deploy
- ❌ **No hot reload**: Must rebuild for each change
- ❌ **Slower development**: Rebuild takes time

**For ngrok testing, we use `yarn dev` because:**
1. You can make changes and see them instantly
2. Better debugging experience
3. Easier to test new features

**If you want to test production build with ngrok:**
```bash
# Build the production version
yarn build

# Serve the built files (you'll need a static server)
cd platform/app/dist
npx serve -p 3000

# Then tunnel it
ngrok http 3000
```

## Summary

- ✅ **Easy to set up**: Just install ngrok and run `ngrok http 3000`
- ✅ **Great for mobile testing**: Access your dev server from any device
- ✅ **Free tier available**: Perfect for development and testing
- ✅ **URL structure**: Ngrok URLs end with `.ngrok-free.app` or `.ngrok.io` (not "dev" or "app")
- ⚠️ **Not for production**: Use proper hosting for production deployments
- ⚠️ **Security**: Be careful when sharing ngrok URLs

Happy tunneling! 🚇

