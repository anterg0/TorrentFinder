# CSS Styling Issues - Troubleshooting Guide

## Problem: Website appears unstyled when running locally

If your torrent search app appears without any styling (no dark theme, plain HTML appearance), this is most likely due to Tailwind CSS not loading properly.

## Quick Fix

Run this command in your project directory:
```bash
npm run fix-css
```

This will automatically check and fix the CSS import issue.

## Manual Fix

If the automatic fix doesn't work, follow these steps:

### 1. Check Tailwind Import

Open the file `/styles/globals.css` and make sure it starts with:
```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));
```

If it doesn't have the `@import "tailwindcss";` line at the top, add it.

### 2. Check Main Entry Point

Open `/src/main.tsx` and verify it contains:
```tsx
import '../styles/globals.css'
```

### 3. Clear Cache and Restart

1. Stop the development server (Ctrl+C)
2. Clear browser cache (Ctrl+Shift+R or hard refresh)
3. Restart the development server:
   ```bash
   npm run dev
   ```

### 4. Verify Dependencies

Make sure you have all required dependencies:
```bash
npm install tailwindcss@^4.0.0-alpha.25 tailwind-merge@^2.2.0
```

## What Should You See?

When the CSS is working correctly, you should see:

✅ **Dark gray/black background**
✅ **White text**
✅ **Rounded search field with white text**
✅ **Styled placeholder results**
✅ **Smooth animations**

## Still Having Issues?

1. **Check browser console** for any error messages
2. **Try a different browser** to rule out browser-specific issues
3. **Delete node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
4. **Check Node.js version** - make sure you're using Node.js 18+

## Why Does This Happen?

This issue occurs because:
- Tailwind CSS v4 requires the `@import "tailwindcss";` directive
- Without this import, none of the Tailwind utility classes work
- The app relies heavily on Tailwind for all styling, including the dark theme

## Contact

If you're still experiencing issues after following this guide, please check:
1. Your Node.js version (`node --version`)
2. Your npm version (`npm --version`)
3. Browser developer console for error messages