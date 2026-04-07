# FITLY: Fitness, Inspiration, Teamwork, Lifestyle, You
Our project, Fitly, is an app aimed to motivate and influence adolescents and young adults to exercise. 

### Description
FITLY is a cross-platform mobile fitness app built for teens and young adults who want to build a consistent exercise habit but struggle with motivation and accountability. Rather than overwhelming users with complex programs or endless content choices, FITLY delivers one shared daily exercise challenge to every user at the same time — no fitness knowledge required, no barrier to entry.

To get started, create an account with a unique email and password. The home screen displays the day's challenge, including rep count and a how-to description. Upload a photo or video as proof of completion to automatically mark the task as done, earn XP, and extend your streak. Completed submissions also unlock the community feed, where you can view other users' uploads from that day.

**Current Status:** Core challenge delivery, completion tracking, streaks, and XP are fully functional. The community feed is under active development and not yet available in this version.

### Dependencies

**Runtime Environment**
- Node.js v18 or later
- npm v9 or later
- Expo CLI — `npm install -g expo-cli`
- Expo Go app (for physical device testing) or iOS Simulator / Android Emulator

**Core packages (installed automatically via `npm install`)**
- `expo` ~54.0.0
- `react` ^18.2.0
- `react-native` ^0.83.4
- `react-dom` ^18.2.0
- `react-native-web` ^0.21.0
- `@expo/metro-runtime` ~55.0.7
- `expo-status-bar` ~55.0.4

**Navigation**
- `@react-navigation/native` ^6.1.9
- `@react-navigation/bottom-tabs` ^6.5.11
- `react-native-screens` ~4.23.0
- `react-native-safe-area-context` ~5.6.2

**Firebase**
- `firebase` ^10.10.0

**UI & Media**
- `lucide-react-native` ^0.344.0
- `react-native-svg` ^15.15.4
- `expo-image-picker` ^55.0.16

**Dev Dependencies**
- `@babel/core` ^7.20.0


### Installing

1. Clone the repository:
```bash
   git clone [https://github.com/your-org/fitly.git](https://github.com/LukeLee1188/Fitly.git)
   cd fitly
```

2. Install dependencies:
```bash
   npm install
```

### Executing the Program

1. Start the Expo development server with a cleared cache:
```bash
   npx expo start -c
```

2. Run on your preferred service:
   - **Physical device**: Scan the QR code in the terminal with the Expo Go app
   - **Web**: Press the link in the terminal

3. When opened, tap **Create Account** and register with your email and password.

4. The **Challenge** tab displays the day's exercise. Tap **Submit Proof** to upload. Once complete, you will be directed to a screen that says 'Task Completed', and your streak and XP update automatically.

5. Visit the **Profile** tab to view or edit your display name, bio, and streak.
