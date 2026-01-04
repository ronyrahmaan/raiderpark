# RaiderPark

Premium TTU Parking Intelligence Platform - Real-time parking availability, AI predictions, and smart navigation for Texas Tech University.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)

## Screenshots

<!-- Add screenshots here -->
| Home | Map | Lot Details |
|:----:|:---:|:-----------:|
| ![Home](docs/screenshots/home.png) | ![Map](docs/screenshots/map.png) | ![Details](docs/screenshots/details.png) |

## Features

- **Real-time Availability** - Live parking spot counts across all TTU lots
- **AI-Powered Predictions** - ML models predict parking availability based on historical data
- **Smart Navigation** - Turn-by-turn directions to available parking spots
- **Auto-detect Parking** - Background location tracking to detect when you park
- **Push Notifications** - Timely reminders before parking permits expire
- **Event Awareness** - Automatic adjustments for game days and special events
- **Offline Support** - Core features work without internet connection

## Tech Stack

### Frontend
- **React Native** with Expo SDK 54
- **Expo Router** for file-based navigation
- **NativeWind** (Tailwind CSS) for styling
- **Zustand** for state management
- **React Query** for data fetching and caching
- **React Native Maps** for map integration
- **Lottie** for animations

### Backend
- **Supabase** - PostgreSQL database, authentication, and realtime subscriptions
- **Supabase Edge Functions** - Serverless API endpoints
- **PostGIS** - Geospatial queries and calculations

### Machine Learning
- **TensorFlow Lite** - On-device ML inference
- **Custom prediction models** - Trained on historical parking data

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- iOS Simulator (macOS) or Android Emulator
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ronyrahmaan/raiderpark.git
   cd raiderpark
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

### Building for Production

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

## Architecture

```
raiderpark/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── lot/               # Lot detail screens
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base UI components
│   │   └── parking/      # Parking-specific components
│   ├── constants/         # App constants and config
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Third-party integrations
│   ├── services/         # API and service layers
│   ├── stores/           # Zustand state stores
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── supabase/
│   ├── functions/        # Edge Functions
│   ├── migrations/       # Database migrations
│   └── seed/            # Seed data
├── ml/                   # Machine learning models
└── assets/              # Images, fonts, sounds
```

## API Documentation

### Supabase Tables

| Table | Description |
|-------|-------------|
| `parking_lots` | Lot metadata and coordinates |
| `parking_availability` | Real-time spot counts |
| `parking_history` | Historical availability data |
| `user_preferences` | User settings and favorites |
| `events` | TTU events affecting parking |

### Edge Functions

| Function | Description |
|----------|-------------|
| `predict-availability` | ML-based availability predictions |
| `sync-parking-data` | Sync data from TTU parking API |
| `send-notifications` | Push notification dispatcher |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|:--------:|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (server only) | Server |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

- Texas Tech University Transportation & Parking Services
- Expo team for the excellent React Native tooling
- Supabase team for the backend infrastructure

---

Built with pride for the Red Raiders
