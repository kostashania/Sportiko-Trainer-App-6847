# Sportiko Trainer - SaaS Platform

A comprehensive SaaS platform for personal trainers to manage their clients (players) with multi-tenant architecture.

## Features

### 🔐 Authentication & Multi-Tenancy
- Supabase Auth integration with social login support
- Each trainer gets a dedicated schema and storage bucket
- 14-day trial period management
- Role-based access control (superadmin, trainer, player)

### 👥 Player Management
- CRUD operations for players
- Player profiles with avatars and contact information
- Invitation system for player registration

### 📚 Homework & Assessments
- Exercise templates and homework assignments
- Monthly player assessments with customizable metrics
- Progress tracking and visualization

### 💳 Payments & Subscriptions
- Stripe integration for payment processing
- Subscription management with trial periods
- Invoice and payment history

### 🛍️ Mini E-shop
- Product catalog for training equipment
- Order management and history

### 📢 Advertisement System
- Superadmin and trainer ad management
- Ad placement and scheduling

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage)
- **State Management**: React Context API
- **Routing**: React Router DOM
- **UI Components**: Custom components with Framer Motion
- **Icons**: React Icons (Feather Icons)
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Charts**: Recharts
- **Date Handling**: date-fns

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sportiko-trainer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your Supabase and Stripe credentials.

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations (SQL scripts provided)
   - Configure Row Level Security (RLS) policies
   - Set up storage buckets

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Schema

### Shared Schema (plrs_saas)
- `trainers` - Trainer profiles and trial information
- `ads` - Advertisement management

### Tenant Schema (trainer_[id])
- `players` - Player profiles and information
- `exercises` - Exercise templates
- `homework` - Homework assignments
- `homework_items` - Individual homework exercises
- `assessments` - Monthly player assessments
- `payments` - Payment and subscription tracking
- `shop_items` - E-shop product catalog
- `orders` - Order history

## Architecture

The platform uses a multi-tenant architecture where:
- Each trainer gets their own database schema
- Isolated storage buckets for file uploads
- Row Level Security (RLS) for data protection
- Shared resources for global features (ads, admin)

## Security

- Row Level Security (RLS) enabled on all tables
- Tenant isolation at the database level
- Secure file uploads with access controls
- JWT-based authentication via Supabase Auth

## PWA Support

The application is configured as a Progressive Web App (PWA) with:
- Offline capability
- Install prompts
- Mobile-responsive design
- Service worker registration

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard components
│   ├── layout/         # Layout components
│   └── players/        # Player management
├── contexts/           # React Context providers
├── lib/               # Utility libraries
├── common/            # Shared components
└── App.jsx            # Main application component
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.