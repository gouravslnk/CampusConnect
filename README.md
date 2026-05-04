# CampusConnect

CampusConnect is a comprehensive platform built to streamline university life by connecting students, clubs, and developers. Whether you're looking to join an event, find team members for a project, or discover campus clubs, CampusConnect brings your campus ecosystem into one unified hub.

## Features

- **Event Management**: Discover, register for, and manage campus events with real-time updates.
- **Club Hub**: Explore university clubs, join communities, and stay engaged with campus organizations.
- **Developer Connections**: Connect with fellow developers and collaborate on projects.
- **Real-Time Chat**: Integrated messaging system with emoji support and group chats to keep in touch with peers and project teams.
- **AI-Powered Team Builder**: Smart team recommendations and matchmaking using integrated AI to help you find the perfect partners for hackathons and projects.
- **Responsive Design**: A sleek, modern, and fully responsive UI built with Tailwind CSS, supporting dark/light mode themes.

## Tech Stack

- **Frontend**: React (v18), Vite, React Router
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime Subscriptions, Row Level Security)
- **Deployment**: Ready for Vercel, Netlify, or any static hosting service.

## Local Development Setup

Follow these steps to run the project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gouravslnk/CampusConnect.git
   cd CampusConnect
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:5173` to view the application.

## Database Setup (Supabase)

If you are setting up a fresh Supabase project, you can use the SQL scripts provided in the `sql/` directory to create the required tables, triggers, and Row Level Security (RLS) policies.

- `sql/supabase_schema.sql` - Core schema setup
- `sql/add_missing_rls_policies.sql` - Security policies

## License

This project is open-source and available under the [MIT License](LICENSE).
