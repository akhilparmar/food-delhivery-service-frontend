## Solstice Kitchens Frontend

Dashboard and auth experience for the Solstice Kitchens operations stack, powered by Next.js 14, the App Router, and Tailwind CSS.

### Prerequisites

- Node.js ≥ 18
- Backend API running from `../backend` with MongoDB accessible through `MONGO_URI`

### Environment

Create a `.env.local` file in `frontend/`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

This value is used by `/login` and `/register` to reach the Express auth endpoints (`/api/users/login` and `/api/users/register`). If the backend runs elsewhere (e.g., production), update the URL accordingly.

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the dashboard. Auth pages live at `/login` and `/register`. Successful logins persist the JWT in `localStorage` (`authToken` + `authUser`) for future API calls.

### Linting

```bash
npm run lint
```

### Deployment

Any platform that supports Next.js 14 (Vercel, Netlify, custom Node server) will work. Ensure the `NEXT_PUBLIC_API_BASE_URL` environment variable is set for the deployed environment.
