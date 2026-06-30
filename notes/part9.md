# 19. Interview Questions (Comprehensive List)

Here is a massive list of interview questions generated specifically from this project's architecture, categorized by difficulty.

## Easy
* What is the Virtual DOM and why does React use it?
* What is the difference between `useState` and `useEffect`?
* Why do we use `.map()` to render lists of components instead of `for` loops?
* What is the purpose of the `key` prop when rendering lists?
* How did you apply custom fonts (like 'Inter') to your Tailwind configuration?

## Medium
* How do you prevent a form from refreshing the page when a user clicks submit? (Answer: `e.preventDefault()`)
* What is prop drilling, and how did you avoid it in this project? (Answer: Using Context API for global state like `user` and `theme`).
* In your Supabase database, why do you need Row Level Security (RLS) if you already have protected routes in React?
* Explain the difference between client-side routing (React Router) and server-side routing.
* Why did you use `useMemo` in the AITeamsPage? What problem did it solve?

## Hard
* Explain the reconciliation process in React. If the parent component re-renders, do all children automatically re-render? How do you prevent it? (Answer: Yes they do, unless prevented with `React.memo`).
* In the `ChatPage`, you receive incoming messages via WebSockets. Why must you use the functional state update pattern `setMessages(prev => [...prev, newMsg])` instead of `setMessages([...messages, newMsg])`? (Answer: To avoid stale closures).
* Your app currently sends the entire student database to the Gemini API as a context string. How would you architect this to scale for 100,000 students without hitting token limits? (Answer: Vector database, embeddings, RAG similarity search).

## Very Hard (Architecture)
* Imagine 1,000 students try to register for an event with only 50 seats at the exact same second. How do you prevent race conditions in your Supabase database so you don't overbook the event to 60 people?
  * *Answer:* You cannot rely on the frontend or a simple `select` then `update`. You must use a database transaction or an RPC function in PostgreSQL that locks the row, checks the current count, and increments it atomically, reverting if the maximum capacity is reached.

---

# 20. "Why" Questions

* **Why React?** Because it allows us to build reusable UI components and handles DOM updates efficiently via the Virtual DOM, making it perfect for a dynamic Single Page Application (SPA).
* **Why Vite?** Because it uses native ES modules and esbuild for lightning-fast hot module replacement during development, unlike Webpack which is notoriously slow for large projects.
* **Why Tailwind?** To rapidly build custom designs without leaving the HTML/JSX. It removes the need for context-switching to CSS files and automatically purges unused styles for a tiny production bundle.
* **Why Context API?** We only had a few pieces of global state (Auth, Theme, Toasts). Redux would have required writing actions, reducers, and store configurations, which is massive overkill for this app.
* **Why Supabase instead of a custom Node.js backend?** Because it provides a fully managed PostgreSQL database, real-time WebSockets, Authentication, and Storage out-of-the-box. It allowed us to focus entirely on frontend business logic and ship the MVP much faster.

---

# 21. "What If" Questions

* **What if Context API was removed from React?** We would have to rely on extreme prop drilling (passing `user` props down 10 levels of components) or install an external state management library like Zustand or Redux.
* **What if the Supabase API fails completely?** The frontend try/catch blocks would catch the network error. Instead of crashing, the app would show a Toast notification saying "Service unavailable." We could implement a retry mechanism for transient errors.
* **What if 10,000 users use this app? How would you scale?** The frontend scale isn't an issue since it's hosted statically on a CDN (like Vercel). The bottleneck would be Supabase/PostgreSQL. We would need to add connection pooling (PgBouncer), optimize database indexes (e.g., indexing `requester_id` on the connections table), and implement Redis caching for frequently accessed data like the public events list.

---

# 22. Alternatives Explained

* **React vs Vue/Angular:** React relies on a Virtual DOM and JSX. Vue uses templates and a reactive data model. Angular is a massive, highly-opinionated framework using TypeScript and RxJS. React was chosen for its massive ecosystem and flexibility.
* **Tailwind vs Styled Components:** Styled components generate CSS via JavaScript at runtime, which is slightly slower. Tailwind generates static CSS files during build time, which is faster for the browser to render.
* **Context API vs Redux:** Redux is a centralized store with strict rules (actions/reducers). Context is just a dependency injection system for React. Context is best for low-frequency updates (like Auth state), Redux is better for high-frequency complex state changes.
* **Supabase vs Firebase:** Firebase is a NoSQL document database (Firestore). Supabase is a relational SQL database (PostgreSQL). Supabase was chosen because social networks require complex relationships (Users -> Events -> Registrations -> Connections) which are much easier to query efficiently with SQL JOINs.

---

# 23. Possible Improvements

* **Performance:** Implement Code Splitting (`React.lazy`) so the user doesn't download the Chat page logic when they are just viewing the Landing page.
* **Accessibility (a11y):** Many buttons lack `aria-labels`. We should add proper ARIA attributes so screen readers can navigate the app for visually impaired students.
* **Testing:** The project currently has zero automated tests. We should add **Jest** and **React Testing Library** for unit testing components, and **Cypress** or **Playwright** for End-to-End (E2E) testing of the login and event registration flows.
* **Security:** Implement rate limiting on the Supabase backend to prevent malicious users from spamming the "Send Connection Request" API.

---

# 24. Potential Bugs & Code Smells

* **Memory Leaks:** In `ChatPage.jsx`, if the user unmounts the component before the Supabase WebSocket channel finishes connecting, it could cause state updates on an unmounted component. We must ensure the `useEffect` cleanup function properly calls `supabase.removeChannel()`.
* **Race Conditions:** As mentioned earlier, event registrations currently rely on simple client-side checks for `isAtCapacity`. A smart user could bypass the frontend button disable logic and hit the API directly. The backend must enforce capacity limits natively.
* **Unnecessary Renders:** The `AuthContext` provides a single object `value={{ user, session, loading }}`. If `session` updates but `user` doesn't, every component consuming `useAuth` will still re-render. Splitting contexts or using memoization could fix this.

---

# 25. What You Have Learned

After analyzing this entire project, you have learned:
1. **Modern Frontend Architecture:** How to structure a React SPA using Vite, Tailwind, and React Router.
2. **Real-time Systems:** How to use WebSockets to build a live chat application without polling the server.
3. **AI Integration (RAG):** How to inject contextual database data into an LLM prompt to make an AI assistant aware of localized information.
4. **Relational Databases:** How frontend clients interact with complex SQL schemas using Supabase.
5. **State Management:** How to effectively use `useState`, `useEffect`, and `useContext` to manage application data flows without Redux.

You should primarily revise **React rendering behavior** (when and why components re-render) and **Asynchronous JavaScript** (Promises, async/await, try/catch), as these are the most heavily tested topics in Senior Frontend interviews based on this codebase architecture.
