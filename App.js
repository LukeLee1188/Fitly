import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User, CheckCircle2, Trophy, Info, Flame } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// FIREBASE ENGINE
// 1. Imports (Only one from each location)
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // ONLY ONE OF THESE

// 2. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA6NYMuK3mUsSq2lqdDbQe-wXs-JADflLk",
  authDomain: "least-common-multiple.firebaseapp.com",
  projectId: "least-common-multiple",
  storageBucket: "least-common-multiple.firebasestorage.app",
  messagingSenderId: "889087754267",
  appId: "1:889087754267:web:cd090f9fd0ca2e1fec78be"
};

// 3. Initialize Engines (Use 'db' and 'storage' as names)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);// Make sure this is 'storage', NOT 'getStorage'

const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{marginTop: 20, color: '#8E8E93'}}>Fetching Daily Challenge...</Text>
    </View>
  );
}

// --- LOADING COMPONENT ---
function ChallengeScreen() {
  const [exercise, setExercise] = useState({ name: "Goal", reps: "0", description: "" });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date().toLocaleDateString());

  const isDoneToday = history.includes(today);

  useEffect(() => {
    const exerciseNames = [
      "Arm Circles", "Burpee", "Buttkick", "Calf Raises", "Crunch", 
      "Deadbugs", "Dips", "Glute Bridge", "High Knees", "Jogging", 
      "Karaoke", "Leg Raises", "Leg Swings", "Lunges", "Open and Close Gates", 
      "Pushups", "Quad Pull", "Russian Twists", "Scoops", "Seated Leg Lifts", 
      "Shadow Boxing", "Shoulder Shrugs", "Side Lunges", "Side Shuffles", 
      "Squats", "Standing March", "Standing On One Leg", "Superman", "Walking"
    ];

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / 86400000);
    const selectedName = exerciseNames[dayOfYear % exerciseNames.length] || "Arm Circles";

    const unsubTask = onSnapshot(doc(db, "exercises", selectedName), (snap) => {
      if (snap.exists()) setExercise(snap.data());
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    const unsubUser = onSnapshot(doc(db, "users", "test_user"), (snap) => {
      if (snap.exists()) setHistory(snap.data().history || []);
    });

    return () => { unsubTask(); unsubUser(); };
  }, []); 

  const handleDone = async () => {
  if (isDoneToday) return;

  // 1. Request Camera Permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert("Permission Denied", "We need camera access to verify your workout!");
    return;
  }

  // 2. Launch the Camera
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1], // Square photos look best in the profile feed
    quality: 0.3,   // Keep quality low to save your Firebase Storage quota!
  });

  if (result.canceled) return;

  try {
    setLoading(true);
    const imageUri = result.assets[0].uri;

    // 3. Convert Image to Blob (Firebase needs this format)
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // 4. Upload to Firebase Storage
    // We name the file based on the user and date: proofs/test_user/2026-03-31.jpg
    const fileRef = ref(storage, `proofs/test_user/${today.replace(/\//g, '-')}.jpg`);
    await uploadBytes(fileRef, blob);
    
    // 5. Get the permanent URL for the photo
    const photoUrl = await getDownloadURL(fileRef);

    // 6. Update Firestore history with the link to the proof
    const userRef = doc(db, "users", "test_user");
    await setDoc(userRef, { 
      history: arrayUnion(today),
      lastProofUrl: photoUrl,
      lastCompletedAt: new Date().toISOString() 
    }, { merge: true });

    Alert.alert("Verified!", "Workout saved with photo proof.");
  } catch (e) {
    console.error("Upload Error:", e);
    Alert.alert("Error", "Failed to upload proof. Check your connection.");
  } finally {
    setLoading(false);
  }
};

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.label}>TODAY'S GLOBAL CHALLENGE</Text>
          <View style={styles.streakBadge}>
            <Text style={{fontSize: 16}}>🔥 </Text>
            <Text style={styles.streakText}>{history?.length || 0}</Text>
          </View>
        </View>
        
        {isDoneToday ? (
          <View style={styles.center}>
            <Text style={{fontSize: 80, marginBottom: 20}}>🏆</Text>
            <Text style={styles.titleText}>You're All Set!</Text>
            <Text style={styles.subText}>New challenge drops at midnight.</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.task}>
              {exercise?.reps || "0"} {exercise?.name || "Exercise"}
            </Text>
            <View style={styles.descriptionBox}>
              <Text style={{fontSize: 18, marginBottom: 8}}>ℹ️</Text>
              <Text style={styles.descriptionText}>
                {exercise?.description || "No description available."}
              </Text>
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleDone}>
              <View style={styles.btnContent}>
                <Text style={{fontSize: 20, color: 'white', marginRight: 10}}>✅</Text>
                <Text style={styles.btnText}>Mark as Done</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- PROFILE SCREEN ---
function ProfileScreen() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    return onSnapshot(doc(db, "users", "test_user"), (snap) => {
      if (snap.exists()) setHistory(snap.data().history || []);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatar}><Text style={{fontSize: 44}}>👤</Text></View>
        <Text style={styles.name}>Athlete #8890</Text>
        <Text style={styles.level}>Level {Math.floor(history.length / 5) + 1}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{history.length}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={[styles.statBox, {backgroundColor: '#5856D6'}]}>
            <Text style={[styles.statNum, {color: 'white'}]}>{history.length * 50}</Text>
            <Text style={[styles.statLabel, {color: 'rgba(255,255,255,0.7)'}]}>Total XP</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={DefaultTheme}>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Challenge') return <Home color={color} size={size} />;
          if (route.name === 'Profile') return <User color={color} size={size} />;
        },
      })}>
        <Tab.Screen name="Challenge" component={ChallengeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { alignItems: 'center', padding: 20 },
  main: { flex: 1, padding: 25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  label: { color: '#8E8E93', fontWeight: 'bold', letterSpacing: 1.5, fontSize: 11 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FF9500' },
  streakText: { marginLeft: 4, fontWeight: 'bold', color: '#FF9500' },
  task: { fontSize: 44, fontWeight: '900', color: '#1C1C1E', marginTop: 40, textAlign: 'center' },
  descriptionBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, marginVertical: 40, width: '100%' },
  descriptionText: { fontSize: 16, color: '#3A3A3C', lineHeight: 24, textAlign: 'center' },
  btn: { backgroundColor: '#007AFF', width: '100%', paddingVertical: 20, borderRadius: 20 },
  btnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  titleText: { fontSize: 26, fontWeight: 'bold', marginTop: 24, color: '#1C1C1E' },
  subText: { color: '#8E8E93', marginTop: 8, fontSize: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  level: { color: '#8E8E93', marginBottom: 30 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  statBox: { backgroundColor: 'white', padding: 24, borderRadius: 28, width: '47%', alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '900', color: '#1C1C1E' },
  statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 4 }
});