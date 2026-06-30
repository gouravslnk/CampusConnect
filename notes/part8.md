# 12. Authentication

## What is it?
Authentication in this project is handled by **Supabase Auth**. It uses a token-based authentication system (specifically JSON Web Tokens, or JWTs) to verify who the user is and what they are allowed to access.

## How it works internally
When a user logs in via `LoginPage.jsx` (using `supabase.auth.signInWithPassword`), Supabase verifies their credentials on the backend. If successful, Supabase sends back a **session object**. This session contains an `access_token` (JWT) and a `refresh_token`.
The `AuthContext.jsx` file listens to this session using `supabase.auth.onAuthStateChange`. It takes the user's session and stores it in React state (`user`).
Supabase automatically stores these tokens in the browser's `localStorage` or `sessionStorage` so that the user stays logged in even if they refresh the page.

## Protected Routes
In `App.jsx`, we use a `<ProtectedRoute>` component. If a user tries to visit `/dashboard` but the `user` state in `AuthContext` is null, the ProtectedRoute forces them back to the `/login` page using the `<Navigate>` component from React Router.

## Security
* **JWT (JSON Web Token):** A secure string that proves the user's identity. It cannot be tampered with because it is cryptographically signed by the Supabase backend.
* **Refresh Tokens:** Access tokens expire quickly for security. The refresh token automatically gets a new access token in the background without forcing the user to log in again.
* **RLS (Row Level Security):** Even if a hacker modifies the frontend code to bypass the `<ProtectedRoute>`, the Supabase database has RLS policies. The database checks the JWT on every API request. If the user isn't authenticated, the database rejects the request.

## Interview Questions
* **Medium:** How does the app remember a user after they refresh the page?
  * *Ideal Answer:* Supabase automatically persists the auth session (including the JWT and refresh token) in the browser's local storage. On page load, `supabase.auth.getSession()` retrieves it, and `AuthContext` sets it into React state.
* **Hard:** Is hiding routes using `<ProtectedRoute>` enough for security?
  * *Ideal Answer:* No. Frontend route protection is only for user experience (UX). All real security must happen on the backend. We rely on Supabase Row Level Security (RLS) policies to ensure that even if a user manipulates the frontend, the database will reject unauthorized read or write operations.

---

# 13. Styling

## What is it?
This project uses **Tailwind CSS**. Tailwind is a utility-first CSS framework. Instead of writing custom CSS files (like `style.css`), we write predefined class names directly inside our React components (like `className="bg-blue-500 text-white p-4"`).

## Why this approach was chosen?
* **Speed:** Developers don't have to switch between JS files and CSS files.
* **Consistency:** Tailwind provides a strict design system (standardized colors, spacing, and font sizes).
* **Bundle Size:** During the build process, Tailwind removes any CSS classes that are not used, resulting in a tiny, highly optimized CSS file.

## Responsive Design
Tailwind uses simple prefixes for responsive design:
* `sm:` (small screens, like large phones)
* `md:` (medium screens, like tablets)
* `lg:` (large screens, like laptops)
Example: `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"` means 1 column on mobile, 2 on tablets, and 3 on laptops.

## Design Choices
The project uses a modern, clean UI with gradient backgrounds (`bg-gradient-to-br`), glassmorphism effects (`backdrop-blur-sm`), and soft shadows (`shadow-sm`, `shadow-lg`). We extract repeated utility strings into reusable CSS classes inside `index.css` (like `.btn-primary` and `.input-field`) using Tailwind's `@apply` directive to keep our JSX clean.

## Alternatives
* **Plain CSS / CSS Modules:** Requires manually naming every class and writing custom CSS rules. Harder to maintain in large teams.
* **Styled Components:** A CSS-in-JS library. Great for component-scoped styles, but adds runtime performance overhead because the browser has to calculate styles using JavaScript. Tailwind is faster because it compiles to pure, static CSS.

## Interview Questions
* **Medium:** Why did you use `@apply` in `index.css` instead of writing inline Tailwind classes for buttons?
  * *Ideal Answer:* While inline Tailwind classes are great for one-off layouts, elements like buttons and inputs are used everywhere. Extracting them into `.btn-primary` using `@apply` ensures visual consistency across the app and makes it much easier to update the brand color later without changing 50 different files.

---

# 15. Build Process

## What happens after `npm run dev`?
1. Vite starts a local development server.
2. It uses **esbuild** (written in Go) to instantly pre-bundle all our dependencies (like `react`, `react-dom`, `lucide-react`).
3. It serves the source code over native ES modules. When you edit a file, Vite uses **Hot Module Replacement (HMR)** to instantly inject the updated module into the browser without doing a full page reload.

## What happens after `npm run build`?
1. Vite switches from esbuild to **Rollup** (a highly optimized production bundler).
2. **Bundling:** It combines all our JavaScript files into a few large chunks.
3. **Tree Shaking:** It analyzes our code and removes any unused functions or imports from libraries (dead code elimination).
4. **Minification:** It removes all spaces, comments, and shortens variable names (e.g., `let myLongVariableName = 1` becomes `let a=1`) to make the file size as small as possible.
5. **Output:** It generates a `/dist` folder containing static `index.html`, highly compressed `.js` files, and `.css` files ready to be deployed to a server like Vercel or Netlify.

## Interview Questions
* **Hard:** Why is Vite so much faster than Create React App (Webpack) during development?
  * *Ideal Answer:* Webpack has to crawl, build, and bundle the entire application into a single file before the dev server can start. Vite relies on modern browser support for native ES modules. It only processes and serves the exact files the browser requests on the current route, and it uses esbuild (written in Go, which is multi-threaded and incredibly fast) to pre-bundle node_modules.

---

# 16. Performance

## Current Optimizations
* **Memoization:** Components like `AITeamsPage` use the `useMemo` hook to cache expensive calculations (like formatting project context) so they don't re-run on every single keystroke.
* **Debouncing:** In `ChatPage.jsx`, the user search input uses a `setTimeout` (debounce) of 300ms. This prevents the app from firing 10 API requests to Supabase if the user types 10 characters quickly.

## Potential Improvements (Code Splitting & Lazy Loading)
Currently, all pages are imported statically in `App.jsx`. If the app grows, the initial JavaScript bundle will become too large, slowing down the initial load time.
* **Fix:** We should implement **React.lazy()** and **Suspense** for our routes. This would split the code so that if a user visits the Landing Page, their browser only downloads the JavaScript for the Landing Page, and delays downloading the `DashboardPage` code until they actually navigate there.

## Image Optimization
Currently, users can upload huge 5MB images for event banners. 
* **Fix:** We should compress and resize images on the client side before uploading them to Supabase Storage, or use a CDN image optimization service.

## Interview Questions
* **Medium:** What is debouncing, and where did you use it?
  * *Ideal Answer:* Debouncing is a technique that delays the execution of a function until a certain amount of time has passed since the last time it was called. I used it in the Chat search bar. Instead of hitting the database on every keystroke, I wait 300ms after the user stops typing to send the API request, saving database reads and improving performance.

---

# 17. Error Handling

## Current Implementation
* **Toast Notifications:** Handled by `ToastContext.jsx`. Instead of ugly browser `alert()` popups, we show smooth, non-blocking UI notifications when APIs succeed or fail.
* **Try/Catch Blocks:** Almost all Supabase API calls are wrapped in `try/catch`. If an API fails, the `catch` block captures the error, prevents the app from crashing, logs it to the console for debugging, and triggers a Toast notification to inform the user gracefully.
* **Validation:** Forms (like Register and Event Creation) manually check if inputs are valid (e.g., `password !== confirmPassword`) and set local state `error` strings to display inline error messages above the submit buttons.

## Potential Improvements
* **Error Boundaries:** React components will crash the entire page if an unhandled error occurs during rendering (e.g., trying to map over `null`). We should wrap our main routes in a React Error Boundary component to show a friendly "Something went wrong" fallback UI instead of a blank white screen.

## Interview Questions
* **Medium:** How do you handle a scenario where the backend database goes offline?
  * *Ideal Answer:* Every API call should be inside a try/catch block. If the network request fails, the catch block intercepts it. I would stop any loading spinners, and use the ToastContext to display a user-friendly error message like "Unable to connect to the server. Please try again later," ensuring the UI remains usable rather than freezing.

---

# 18. Git

## Recommended Workflow for this Project
* **Main Branch:** The `main` (or `master`) branch should always be stable and deployable to production.
* **Feature Branches:** Whenever adding a new feature (e.g., `git checkout -b feature/ai-teams`), work is isolated. This prevents breaking the main app.
* **Commits:** Commits should be atomic (small and focused) with clear messages (e.g., `feat: add RAG context to AI assistant`).
* **Pull Requests (PRs):** Before merging a feature into `main`, a PR should be created. This allows for code review, ensuring no bugs or bad architecture slip into production.

## Rebase vs Merge
* **Merge:** Creates a new "merge commit" that ties two branches together. Preserves the exact history but can make the commit graph look messy.
* **Rebase:** Rewrites your feature branch so it looks like you wrote all your code *after* the latest updates on the main branch. Creates a very clean, linear history, but is dangerous if you rewrite commits that other developers are using.

## Interview Questions
* **Beginner:** What is the difference between `git pull` and `git fetch`?
  * *Ideal Answer:* `git fetch` downloads the latest updates from the remote repository (like GitHub) but does not touch your local code. `git pull` does a fetch, and then immediately tries to merge those updates into your current working files.
