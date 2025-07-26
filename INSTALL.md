# Installation Instructions

## Quick Setup

1. **Install all dependencies:**
   ```bash
   npm install
   ```

2. **Start both frontend and backend:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## If you get dependency errors:

1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Install missing dependencies manually:**
   ```bash
   npm install tailwind-merge@^2.2.0 @radix-ui/react-slot@^1.0.2 class-variance-authority@^0.7.0
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Individual server commands:

- Frontend only: `npm run dev:frontend` 
- Backend only: `npm run dev:backend`
- Test backend: `npm run test:backend`

## Troubleshooting:

### CSS Styles Not Working (Most Common Issue)
If the application appears unstyled (no dark theme, no proper layout):

1. **Check Tailwind Import:** Ensure `/styles/globals.css` starts with `@import "tailwindcss";`
2. **Clear Browser Cache:** Hard refresh with Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. **Restart Dev Server:** Stop the dev server (Ctrl+C) and run `npm run dev` again
4. **Clear Node Cache:** Run `npm cache clean --force` and reinstall dependencies
5. **Check Console:** Look for CSS-related errors in browser developer console

### Other Common Issues
- **"tailwind-merge not found"**: Run `npm install tailwind-merge`
- **"Hello World" instead of app**: Clear browser cache (Ctrl+Shift+R)
- **Network errors**: Make sure backend is running on port 3001
- **CORS errors**: Backend should be running with proper CORS setup

### Verification Steps
1. Visit http://localhost:3000 - you should see a dark-themed search interface
2. The search field should be white text on dark background
3. Placeholder results should be visible initially
4. Search animation should work when clicking the search field