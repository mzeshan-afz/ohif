# Deploying OHIF Viewer to Netlify

This guide will help you deploy the OHIF Viewer to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://www.netlify.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Node.js 20.18.1 and Yarn 1.22.5 installed locally (for testing builds)

## Deployment Options

### Option 1: Deploy via Netlify UI (Recommended for first-time deployment)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**
   Netlify should automatically detect the `netlify.toml` file, but verify these settings:
   - **Base directory**: Leave empty (or set to root `/`)
   - **Build command**: `cd platform/app && yarn run build:viewer:ci`
   - **Publish directory**: `platform/app/dist`
   - **Node version**: `20.18.1`
   - **Yarn version**: `1.22.5`

4. **Environment Variables** (if needed)
   - Go to Site settings → Environment variables
   - Add any required variables:
     - `APP_CONFIG` (if you need a custom config)
     - `PUBLIC_URL` (defaults to `/`)
     - Any other environment-specific variables

5. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete (may take 10-15 minutes on first build)
   - Your site will be live at `https://your-site-name.netlify.app`

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize the site**
   ```bash
   netlify init
   ```
   - Follow the prompts to link your site
   - Choose "Create & configure a new site"
   - Select your team
   - Choose a site name

4. **Build and deploy**
   ```bash
   # Build the project
   cd platform/app
   yarn run build:viewer:ci
   cd ../..
   
   # Deploy to production
   netlify deploy --prod
   ```

   Or deploy to a draft URL first:
   ```bash
   netlify deploy
   ```

5. **Continuous Deployment**
   - Once initialized, Netlify will automatically deploy on every push to your main branch
   - Deploy previews will be created for pull requests

## Build Configuration

The `netlify.toml` file in the root directory contains:

- **Build command**: Builds the viewer using the CI configuration
- **Publish directory**: `platform/app/dist` (where webpack outputs the built files)
- **Node version**: 20.18.1
- **Yarn version**: 1.22.5
- **Redirects**: All routes redirect to `index.html` for SPA routing
- **Headers**: Security headers and cache control for static assets

## Custom Configuration

If you need to use a different app configuration:

1. **Create a custom config file** in `platform/app/config/`
2. **Set environment variable** in Netlify:
   - Go to Site settings → Environment variables
   - Add: `APP_CONFIG` = `config/your-config.js`

Or modify the build command in `netlify.toml`:
```toml
[build]
  command = "cd platform/app && APP_CONFIG=config/your-config.js yarn run build:viewer:ci"
```

## Troubleshooting

### Build Fails

1. **Check build logs** in Netlify dashboard
2. **Common issues**:
   - Memory limits: Already configured with `NODE_OPTIONS = "--max_old_space_size=8096"`
   - Missing dependencies: Ensure `yarn install` completes successfully
   - Build timeout: May need to increase timeout in Netlify settings

### Site Not Loading

1. **Check publish directory**: Should be `platform/app/dist`
2. **Check redirects**: Ensure `index.html` exists in the dist folder
3. **Check browser console**: Look for any JavaScript errors

### Routing Issues

- The `netlify.toml` includes SPA redirect rules
- All routes should redirect to `index.html` with status 200
- If you have issues, verify the redirect rule is active

## Performance Optimization

The configuration includes:
- **Long-term caching** for static assets (JS, CSS, images)
- **Security headers** for protection
- **No caching** for HTML files (always fresh)

## Environment-Specific Deployments

You can create multiple sites in Netlify for different environments:

1. **Production**: `main` branch → `your-site.netlify.app`
2. **Staging**: `develop` branch → `staging-your-site.netlify.app`
3. **Preview**: Each PR gets a unique preview URL

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify TOML Reference](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [OHIF Viewer Documentation](https://docs.ohif.org/)

## Notes

- First build may take 10-15 minutes due to dependency installation
- Subsequent builds are typically faster (5-8 minutes)
- The build process uses `QUICK_BUILD=false` for production builds
- Ensure your repository is public or you have Netlify access to private repos

