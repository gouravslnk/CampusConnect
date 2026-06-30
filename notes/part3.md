# 9. State Management Deep Dive

### Where state lives and Why
In React, "state" is any data that changes over time and affects what the user sees. State can live in two places:
1. **Local State:** Lives inside a single component (e.g., text typed into a specific search bar). We use `useState` for this.
2. **Global State:** Lives at the top of the application and is shared across many components (e.g., the currently logged-in user, or light/dark mode preference).

### Prop Drilling (The Problem)
Imagine your `<App />` component knows who the user is. But a button inside `<Navbar />`, which is inside `<Layout />`, needs to know the user's name. 
To get the data there, you have to pass it as a prop from App -> Layout -> Navbar -> Button. This is called **Prop Drilling**. It makes code messy and hard to maintain because components in the middle (like Layout) are forced to carry data they don't even care about.

### React Context (The Solution)
Context solves Prop Drilling. It acts like a global teleportation system for data. You wrap your app in a `<Provider>`, and then *any* component inside the app can use a hook (like `useAuth`) to instantly teleport that data directly into itself, skipping the middleman.

### Context vs. Redux (Important Interview Question)
* **Why did you use Context API instead of Redux?**
  * *Context* is built directly into React. It is excellent for data that doesn't change very often (like User Auth status, Theme preference, or occasional UI Toasts). 
  * *Redux* is an external library. It is built for complex, rapidly changing state (like a real-time stock trading dashboard where numbers update every millisecond). Redux adds a massive amount of boilerplate code. 
  * *Your Defense:* "In CampusConnect, our global state needs are simple: Authentication, Theme, and Notifications. Introducing Redux or Redux Toolkit would have been severe over-engineering. The Context API provided a lightweight, built-in solution that kept the codebase clean."

---

# 8. Hooks Deep Dive (Part 1: The Context Hooks)

In the context files, you use several critical React Hooks: `createContext`, `useContext`, `useState`, `useEffect`, `useCallback`, and `useMemo`.

* **`createContext`**: Creates the "teleporter." It creates an empty context object that can hold data.
* **`useContext`**: The receiver for the teleporter. It allows a component to read the data inside a Context.
* **`useCallback`**: Remembers a function so that it doesn't get recreated every time the component re-renders. This is crucial for performance.
* **`useMemo`**: Remembers a calculated value (or an object) so it doesn't get recreated on every re-render.

---

# 5. Every File (The Context Folder)

## File 7: `src/context/AuthContext.jsx`

### Basic Information
* **File location:** `src/context/AuthContext.jsx`
* **Why this file exists:** To securely track if the user is logged in, load their profile data from Supabase, and share that user object with the entire application.

### Functionality
When the app loads, this file immediately checks if Supabase has an active session cookie. If a user is found, it queries the `profiles` table to get extra data (like their name and role) and stores it in the `user` state. It also sets up a "listener" to watch for log-ins or log-outs in real-time.

### Imports
* **`createContext`, `useContext`, `useState`, `useEffect`**: Core React hooks.
* **`supabase` from `../lib/supabase`**: The database client needed to check the user's session.

### The Code Breakdown
```jsx
const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // 1. State for the user data and a loading flag
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2. Helper function to load the user's full profile
    async function loadSessionProfile(activeUser) {
      if (!activeUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Query the database for the user's specific role/name
      const { data } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      if (data) {
        setUser({ ...activeUser, ...data });
      } else {
        setUser(activeUser);
      }
      setLoading(false);
    }

    // 3. Initial check when the app first loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionProfile(session?.user);
    });

    // 4. Set up a real-time listener for Auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionProfile(session?.user);
    });

    // 5. Cleanup function
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 6. Custom hook to make reading the context easy
export const useAuth = () => useContext(AuthContext);
```

### Interview Section for `AuthContext.jsx`
**How to explain this in 60 seconds:**
"My AuthContext creates a global state for the current user. When it mounts, a `useEffect` checks Supabase for an active session. If a user exists, it fetches their extended profile (like their role) from the `profiles` table. Crucially, I subscribe to `onAuthStateChange` so if the user logs out in another tab, the app updates instantly. It returns a `loading` state so I can show a spinner in `App.jsx` until the auth check is complete."

* **Intermediate Question:** Why do you return `return () => subscription.unsubscribe();` inside your `useEffect`?
  * *Ideal Answer:* That is a cleanup function. When we subscribe to Supabase auth changes, it opens a listener in the browser's memory. If this component ever unmounted and we didn't unsubscribe, that listener would stay in memory forever, causing a Memory Leak. The cleanup function ensures the listener is destroyed when the component is removed.

---

## File 8: `src/context/ThemeContext.jsx`

### Basic Information
* **File location:** `src/context/ThemeContext.jsx`
* **Why this file exists:** To manage the Light/Dark mode of the application and remember the user's preference using browser storage.

### Functionality
It checks the browser's `localStorage` to see if the user previously chose dark mode. It stores that choice in state. Whenever the state changes, a `useEffect` physically injects the word "dark" or "light" into the root HTML tag (`<html>`). Tailwind CSS looks for this specific class to apply dark mode styles.

### The Code Breakdown
```jsx
export function ThemeProvider({ children }) {
  // 1. Initialize state by checking localStorage first. Fallback to 'light'.
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  useEffect(() => {
    const root = window.document.documentElement; // Grabs the <html> tag
    root.classList.remove('light', 'dark');       // Clear old theme
    root.classList.add(theme);                    // Inject new theme
    localStorage.setItem('theme', theme);         // Save to browser storage
  }, [theme]); // Run this effect ONLY when 'theme' changes

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Interview Section for `ThemeContext.jsx`
**How to explain this in 30 seconds:**
"The ThemeContext manages dark mode. It initializes its state by checking `localStorage` to respect the user's past choices. A `useEffect` listens for changes to this state; when it changes, it updates the `classList` on the root HTML element, which triggers Tailwind's dark mode utility classes across the entire app."

* **Beginner Question:** Why do you use `localStorage` here?
  * *Ideal Answer:* Without `localStorage`, if the user switches to Dark Mode and refreshes the page, the app would reset to Light Mode. `localStorage` persists data in the user's browser across sessions so their preference is saved.

---

## File 9: `src/context/ToastContext.jsx`

### Basic Information
* **File location:** `src/context/ToastContext.jsx`
* **Why this file exists:** To provide a global, reusable way to show floating notification messages (Toasts) anywhere in the application (like "Event Created Successfully" or "Invalid Password").

### Functionality
This is the most complex of the three contexts. It stores an array of toast objects in state. It provides a `showToast` function to the rest of the app. It also physically renders the floating notification UI on top of the app using absolute positioning (`fixed right-4 top-4`).

### The Code Breakdown (Key Parts)
```jsx
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // 1. useCallback ensures this function is not recreated on every render
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // 2. Generates a toast, adds it to state, and sets a timer to auto-delete it
  const showToast = useCallback((message, options = {}) => {
    // Generate a pseudo-random unique ID for the toast
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const type = options.type || 'info';
    const duration = options.duration ?? 3000; // Default 3 seconds

    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  // 3. useMemo ensures the context value object is not recreated on every render
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* 4. Render the UI for the toasts over the app */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="...">
             {/* Toast Content Here */}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

### Interview Section for `ToastContext.jsx`
**How to explain this in 60 seconds:**
"I built a custom Toast Context to handle application-wide notifications. It maintains an array of active toasts in state. It exposes a `showToast` method that generates a unique ID, adds the message to the array, and sets a `setTimeout` to automatically remove the toast after a few seconds. I heavily utilized `useCallback` and `useMemo` here to ensure the context object remains perfectly stable, preventing unnecessary re-renders of the entire application whenever a toast appears."

* **Advanced Question:** You used `useMemo` for the context `value`. Why is this so important for a Context Provider?
  * *Ideal Answer:* Every component that consumes a Context will re-render whenever the Context's `value` prop changes. If I just passed `value={{ showToast }}`, React creates a *brand new object in memory* every time ToastProvider renders. That would force every component using `useToast` to re-render unnecessarily. By using `useMemo`, I guarantee the object reference stays identical unless `showToast` itself changes.
* **Advanced Question:** What is a potential bug with using `setTimeout` inside `showToast` if the user navigates away very fast?
  * *Ideal Answer:* The `setTimeout` holds a reference to `removeToast`. In this specific implementation, because `removeToast` uses the functional state update `setToasts(prev => ...)`, it is actually perfectly safe. If we had accessed state directly inside the timeout without functional updates, we would risk "stale closures" (referencing old state data).

