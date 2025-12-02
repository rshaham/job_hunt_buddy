# Career Forager Browser Extension

Chrome extension for one-click job capture from LinkedIn, Indeed, Greenhouse, Lever, and other job sites.

## Features

- **Auto-detection**: Automatically extracts job title, company, and description from supported sites
- **Manual capture**: Select text on any page to capture custom content
- **Quick preview**: Review extracted data before sending to Career Forager
- **Configurable URL**: Set your Career Forager instance URL in settings

## Supported Sites

- LinkedIn Jobs
- Indeed
- Greenhouse ATS (boards.greenhouse.io)
- Lever ATS (jobs.lever.co)
- Generic fallback for other job sites (uses JSON-LD schema or page content)

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder

## Usage

1. Navigate to a job posting page
2. Click the Career Forager extension icon
3. Review the extracted job details
4. Click "Send to Career Forager"
5. The app opens with the job pre-filled

## Configuration

1. Click the extension icon
2. Click "Settings" at the bottom
3. Enter your Career Forager app URL (default: `http://localhost:5173`)
4. Click "Save Settings"

## Development Notes

### File Structure

```
browser-extension/
├── manifest.json           # Extension manifest (Manifest V3)
├── src/
│   ├── popup/              # Extension popup UI
│   ├── options/            # Settings page
│   ├── content/            # Content scripts for job extraction
│   │   └── extractors/     # Site-specific extractors
│   └── background/         # Service worker
└── icons/                  # Extension icons
```

### Adding New Site Extractors

1. Create a new file in `src/content/extractors/` (e.g., `mysite.js`)
2. Export an extraction function:
   ```javascript
   export function extractMySite() {
     return {
       title: '...',
       company: '...',
       description: '...',
       url: window.location.href
     };
   }
   ```
3. Import and add to `src/content/content.js`:
   ```javascript
   if (host.includes('mysite.com')) return extractMySite;
   ```
4. Add URL pattern to `manifest.json` content_scripts matches

### Icons

The icons in the `icons/` folder are placeholders. For production, replace with properly sized icons:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## Troubleshooting

### Extension not detecting jobs
- Make sure you're on a job detail page, not a search results page
- Try refreshing the page after installing the extension
- Check the browser console for errors

### Can't connect to Career Forager
- Verify the app URL in extension settings
- Make sure Career Forager is running at the configured URL
- Check that the app's URL matches exactly (including http/https)
