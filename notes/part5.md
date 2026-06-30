# 7. Components Deep Dive

### Why Components Exist
If you built this app in Vanilla HTML, you would have to copy and paste the Navbar HTML onto every single page. If you wanted to change a link, you would have to change it in 20 different files.
React Components solve this. You write `<Navbar />` once, and use it everywhere. When you update the Navbar file, it updates across the entire application instantly.

### Parent-Child Relationship & Props
Data in React flows **downward** (one-way data binding). A Parent component (like `App.jsx`) passes data to a Child component (like `Navbar.jsx`) using **Props** (Properties).
* Example: `<Navbar user={user} onLogout={handleLogout} />`
* The Navbar cannot change the `user` object directly. It can only read it or trigger the `onLogout` function provided by the parent.

### Re-render Conditions
A component re-renders (updates what you see on the screen) ONLY when:
1. Its internal state (`useState`) changes.
2. The props passed to it by its parent change.
3. The context it consumes (`useContext`) changes.

---

# 5. Every File (The Components)

## File 16: `src/components/EventCard.jsx`

### Basic Information
* **File location:** `src/components/EventCard.jsx`
* **Why this file exists:** To display a preview of an event (Title, Date, Image, Registrations) in a nice, clickable card. It is used on the Home Page, Events Page, and Profile Page.

### Functionality
It takes an `event` object as a prop. It calculates the percentage of seats filled to render a progress bar. It checks the event date against today's date to see if it is "Expired". It handles broken images gracefully.

### Variables & Logic
* **`const maxSeats = Number(event.maxSeats) || 0;`**: Safely parses the seats to a number, defaulting to 0 if null.
* **`const filled = ...`**: Calculates the percentage filled. If it is 100%, the progress bar turns red. If >70%, yellow. Otherwise, blue.
* **`const showImage = event.image && !imageFailed;`**: If the event has an image URL, we try to load it.

### Hooks Used
* **`useState(false)`**: We keep track of `imageFailed`. If the `<img>` tag fails to load the picture from the internet (the `onError` event fires), we set this to `true`. When it becomes `true`, React re-renders the component and shows a beautiful gradient placeholder instead of a broken image icon.

### Interview Section for `EventCard.jsx`
**How to explain this in 30 seconds:**
"The EventCard is a highly reusable presentation component. It accepts an event object as a prop. It features defensive programming: if the image URL is broken, it catches the `onError` event and swaps the UI to a styled gradient fallback. It also dynamically calculates registration capacity to render a color-coded progress bar."

* **Beginner Question:** Why is this a separate component instead of just writing the HTML inside the `EventsPage`?
  * *Ideal Answer:* Reusability and readability. I render lists of events on the Home page, the main Events page, and the user's Profile page. If I didn't componentize this, I would have duplicated 100 lines of code three times.
* **Intermediate Question:** How does the progress bar color change dynamically?
  * *Ideal Answer:* I calculate the `filled` percentage using math. Then, using Tailwind, I apply a template literal: `` `h-1.5 rounded-full ${filled >= 100 ? 'bg-red-500' : filled >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}` ``. This injects different CSS utility classes based on the capacity threshold.

---

## File 17: `src/components/Navbar.jsx`

### Basic Information
* **File location:** `src/components/Navbar.jsx`
* **Why this file exists:** To provide global navigation, user profile management, and real-time notifications at the top of every screen.

### Functionality
This is a massive and complex component. 
1. **Navigation:** Shows different links depending on if the user is a Student, a Club Admin, or a System Admin.
2. **Notifications Dropdown:** Fetches notifications from Supabase, listens for real-time connection requests, and allows the user to accept/decline them directly from the Navbar.
3. **Profile Dropdown:** Allows the user to access their dashboard or log out.
4. **Mobile Responsiveness:** Uses a Hamburger menu (`menuOpen` state) to toggle navigation on small screens.

### Deep Dive into Notifications (Real-Time Subscriptions)
The most impressive part of this file is the `useEffect` that handles notifications.
* **Initial Fetch:** When the Navbar mounts, it queries the `notifications` table and the `connection_requests` table. It synthesizes them into one unified list.
* **Real-time Subscriptions:**
  ```javascript
  const notificationsChannel = supabase
    .channel('notifications_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      setNotifications(prev => [payload.new, ...prev]);
    })
    .subscribe();
  ```
  * *What this does:* It opens a WebSocket connection to Supabase. If another user in a different city sends this user a connection request, Supabase pushes the event through the WebSocket, and the Navbar instantly updates the `unreadCount` to show a red dot without the user ever refreshing the page.

### Memory Leak Prevention
At the end of the `useEffect`, we return a cleanup function:
```javascript
return () => {
  supabase.removeChannel(notificationsChannel);
};
```
If the Navbar is destroyed (e.g., the user logs out), we must close the WebSocket connection. Otherwise, the browser keeps listening forever in the background.

### Interview Section for `Navbar.jsx`
**How to explain this in 60 seconds:**
"The Navbar is the most interactive component in the app. Beyond responsive routing, it houses a real-time notification engine. On mount, it fetches the user's notifications and pending connection requests from Supabase. I then initialize two Supabase Realtime Channels to listen for PostgreSQL `INSERT` and `UPDATE` events. When a payload arrives over the WebSocket, I prepend it to local state, instantly updating the UI. I also handle connection Request accepting/rejecting directly inside the dropdown."

* **Advanced Question:** You have a `handleClickOutside` event listener to close the notifications dropdown. How does it work?
  * *Ideal Answer:* I attach a `mousedown` listener to the global `document` object. Inside the listener, I check if `notifRef.current.contains(event.target)`. The `notifRef` points to the DOM node of the dropdown wrapper. If the click happened *outside* that node, I set `notifOpen` to false. Crucially, I return a cleanup function in the `useEffect` to `removeEventListener` when the component unmounts.
* **Advanced Question:** What is synthesizing connection requests, and why did you do it here?
  * *Ideal Answer:* Connection requests live in a different database table than standard notifications. To provide a unified inbox experience in the UI, I fetch both tables, map the `connection_requests` into an object shape that perfectly matches the `notifications` schema, merge the arrays, and sort them by date.

---

## File 18: `src/components/FloatingAIChatbot.jsx`

### Basic Information
* **File location:** `src/components/FloatingAIChatbot.jsx`
* **Why this file exists:** Provides an accessible, floating chat bubble on the bottom right of the screen for users to ask AI questions at any time.

### Functionality
* It only renders if a user is logged in.
* When opened, it fetches *all* upcoming events and student profiles into memory. This serves as the "Context" for the AI.
* When the user types a message, it adds it to the `messages` array, sets a `thinking` state to true (showing a loader), and calls the `answerQuestion` function we analyzed earlier in `campusAssistant.js`.
* It auto-scrolls to the bottom of the chat whenever a new message arrives.

### Hooks Used
* **`useRef(null)`**: We attach `bottomRef` to an empty `div` at the very bottom of the message list. We use `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` inside a `useEffect` to automatically scroll down whenever `messages` change.
* **`useMemo`**: Used to cache the `getQuickPrompts()` array so it isn't recalculated every time the user types a letter in the input box.

### Interview Section for `FloatingAIChatbot.jsx`
**How to explain this in 60 seconds:**
"This component is a floating UI for the AI Assistant. When opened, a `useEffect` aggressively pre-fetches upcoming events and student data to form the AI's context window. I manage the chat history using a `messages` state array. When a user submits a prompt, I append it to state, activate a `thinking` boolean to show a loader, and pass the prompt to my campus assistant logic. I also implemented an auto-scroll feature using `useRef` and `scrollIntoView` triggered by a `useEffect` whenever the messages array updates."

* **Intermediate Question:** Why do you pass a callback function to `setMessages` (e.g., `setMessages((current) => [...current, newMessage])`) instead of just `setMessages([...messages, newMessage])`?
  * *Ideal Answer:* In React, state updates can be asynchronous and batched. If I reference the `messages` variable directly inside an async function, I might be referencing a "stale" version of the array. By passing a callback `(current) =>`, React guarantees I am appending the new message to the absolute most recent version of the state in memory.