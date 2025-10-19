# KiriNet (キリネット) Messenger

A modern, real-time mobile messenger with dark Japanese cyberpunk aesthetic.

## Features

### Core Functionality
- ✅ **Nickname-based Authentication** - Simple nickname entry to start chatting
- ✅ **Global Chat Room** - キリネット Global room for all users
- ✅ **Direct Messages** - 1-on-1 private conversations
- ✅ **Real-time Messaging** - Socket.IO powered real-time communication
- ✅ **Online Status** - See who's online in real-time
- ✅ **Typing Indicators** - Know when someone is typing

### Design
- 🎨 **Dark Japanese Cyberpunk Theme**
  - Neon purple primary (#b300ff)
  - Cyan accents (#00fff2)
  - Deep black background (#0a0a0f)
- 🇯🇵 **Bilingual Interface** - Japanese katakana + English
- ✨ **Smooth Animations** - Professional transitions and effects
- 📱 **Mobile-First** - Optimized for iOS and Android

### Settings
- 🔔 Push notifications (toggle)
- 🔊 Sound effects (toggle)
- 🌙 Dark mode (always on - cyberpunk theme)
- 👤 User profile view
- 🚪 Logout functionality

## Technology Stack

### Frontend
- **Expo** (React Native) - Cross-platform mobile framework
- **Expo Router** - File-based navigation
- **Socket.IO Client** - Real-time messaging
- **Zustand** - State management
- **AsyncStorage** - Local data persistence

### Backend
- **FastAPI** - High-performance Python API
- **Python Socket.IO** - WebSocket server
- **MongoDB** - NoSQL database
- **Motor** - Async MongoDB driver

## Project Structure

```
app/
├── backend/
│   ├── server.py         # Main FastAPI + Socket.IO server
│   ├── models.py         # Pydantic data models
│   ├── app.py           # ASGI application entry point
│   └── requirements.txt  # Python dependencies
│
└── frontend/
    ├── app/
    │   ├── index.tsx              # Nickname entry screen
    │   ├── _layout.tsx            # Root layout
    │   ├── (tabs)/
    │   │   ├── _layout.tsx        # Tab navigation
    │   │   ├── chats.tsx          # Chat list screen
    │   │   └── settings.tsx       # Settings screen
    │   └── chat/
    │       └── [id].tsx           # Message screen (dynamic route)
    │
    ├── services/
    │   ├── api.ts                 # REST API service
    │   └── socket.ts              # Socket.IO service
    │
    ├── stores/
    │   └── userStore.ts           # User state management
    │
    ├── constants/
    │   └── theme.ts               # Design system constants
    │
    └── package.json               # JavaScript dependencies
```

## API Endpoints

### REST API
- `GET /api/` - Health check
- `POST /api/users` - Create user
- `GET /api/users` - Get all users
- `GET /api/users/{user_id}` - Get user by ID
- `GET /api/conversations?user_id={id}` - Get user's conversations
- `POST /api/conversations` - Create conversation
- `GET /api/messages/{conversation_id}` - Get messages
- `POST /api/messages` - Create message

### WebSocket Events
- `connect` - Client connected
- `disconnect` - Client disconnected
- `user_online` - User comes online
- `send_message` - Send a message
- `new_message` - Receive a message
- `typing` - User is typing
- `user_typing` - Someone is typing
- `user_status` - User status changed

## Running the App

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI

### Development

1. **Start Backend**:
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

2. **Start Frontend**:
```bash
cd frontend
yarn install
yarn start
```

3. **Run on Device**:
- Scan QR code with Expo Go app
- Or run `yarn android` / `yarn ios`

### Production Build

**Android APK**:
```bash
cd frontend
eas build --platform android --profile preview
```

**iOS**:
```bash
cd frontend
eas build --platform ios --profile preview
```

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=kirinet
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://your-api-url.com
```

## Design System

### Colors
```javascript
background: '#0a0a0f'      // Deep black
surface: '#141420'          // Dark surface
primary: '#b300ff'          // Neon purple
secondary: '#00fff2'        // Cyan
accent: '#ff00aa'          // Pink accent
online: '#00ff88'          // Green (online status)
```

### Typography
- Header: Japanese katakana + English
- Body: Bilingual labels (日本語 / English)
- Monospace for IDs

### Spacing
- 8pt grid system (8px, 16px, 24px, 32px)
- Consistent padding and margins

## User Flow

1. **First Launch** → Enter nickname → Auto-create user
2. **Main Screen** → See online users + conversations
3. **Start Chat** → Tap user or global room
4. **Message** → Type and send with real-time delivery
5. **Settings** → Manage preferences and logout

## Database Schema

### Users Collection
```javascript
{
  id: "uuid",
  nickname: "string",
  socket_id: "string | null",
  is_online: boolean,
  created_at: datetime,
  last_seen: datetime
}
```

### Conversations Collection
```javascript
{
  id: "uuid",
  type: "global" | "direct",
  participants: ["user_id"],
  name: "string | null",
  created_at: datetime,
  last_message: "string | null",
  last_message_time: "datetime | null"
}
```

### Messages Collection
```javascript
{
  id: "uuid",
  conversation_id: "uuid",
  sender_id: "uuid",
  sender_nickname: "string",
  content: "string",
  timestamp: datetime,
  is_read: boolean
}
```

## Future Enhancements

### Planned Features
- [ ] Message read receipts
- [ ] File and image sharing
- [ ] Voice messages
- [ ] Message reactions (emoji)
- [ ] User avatars
- [ ] Group chats (multiple users)
- [ ] Message search
- [ ] Push notifications (actual implementation)
- [ ] Message encryption
- [ ] User blocking
- [ ] Message editing/deletion
- [ ] Status updates
- [ ] Custom themes

### Technical Improvements
- [ ] Message pagination
- [ ] Offline message queue
- [ ] Message caching
- [ ] Connection retry logic
- [ ] Rate limiting
- [ ] Authentication tokens
- [ ] User sessions
- [ ] Admin panel

## Testing

All backend REST API endpoints have been tested and verified:
- ✅ User creation and retrieval
- ✅ Conversation management
- ✅ Message handling
- ✅ MongoDB integration
- ✅ UUID serialization
- ✅ Error handling

## Credits

**Design Inspiration**: Japanese cyberpunk aesthetic, neon-lit Tokyo nights

**Developer**: Built with Expo + FastAPI + MongoDB

**License**: MIT

---

**キリネット / KiriNet** - Japanese Cyberpunk Messenger 🌆✨
