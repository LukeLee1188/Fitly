import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator 
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User, CheckCircle2, Trophy, Info } from 'lucide-react-native';

// FIREBASE ENGINE
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, arrayUnion } from "firebase/firestore";

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyA6NYMuK3mUsSq2lqdDbQe-wXs-JADflLk",
  authDomain: "least-common-multiple.firebaseapp.com",
  projectId: "least-common-multiple",
  storageBucket: "least-common-multiple.firebasestorage.app",
  messagingSenderId: "889087754267",
  appId: "1:889087754267:web:cd090f9fd0ca2e1fec78be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const Tab = createBottomTabNavigator();

// --- CHALLENGE SCREEN ---
function ChallengeScreen() {
  const [exercise, setExercise] = useState({ name: "Goal", reps: "0", description: "" });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(new Date().toLocaleDateString());

  const isDoneToday = history.includes(today);

  useEffect(() => {
    // 1. Math to pick 1-30 based on the date
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const exerciseIndex = (dayOfYear % 30) + 1;

    // 2. Fetch Daily Exercise from 'library' collection
    const unsubTask = onSnapshot(doc(db, "library", exerciseIndex.toString()), (snap) => {
      if (snap.exists()) {
        setExercise(snap.data());
      } else {
        setExercise({ name: "Push ups", reps: "10", description: "Keep your back straight and lower your chest to the floor." });
      }
      setLoading(false);
    });

    // 3. Listen for User Progress
    const unsubUser = onSnapshot(doc(db, "users", "test_user"), (snap) => {
      if (snap.exists()) setHistory(snap.data().history || []);
    });

    // 4. Midnight Refresh
    const interval = setInterval(() => {
      const checkDate = new Date().toLocaleDateString();
      if (checkDate !== today) setToday(checkDate);
    }, 60000);

    return () => { unsubTask(); unsubUser(); clearInterval(interval); };
  }, [today]);

  const handleDone = async () => {
    if (isDoneToday) return;

    try {
      const userRef = doc(db, "users", "test_user");
      await setDoc(userRef, { history: arrayUnion(today) }, { merge: true });
      Alert.alert("Awesome!", "You finished today's challenge.");
    } catch (e) {
      Alert.alert("Error", "Check your connection.");
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.label}>TODAY'S GLOBAL CHALLENGE</Text>
        
        {isDoneToday ? (
          <View style={styles.center}>
            <Trophy color="#FFCC00" size={100} strokeWidth={1.5} />
            <Text style={styles.titleText}>Goal Completed!</Text>
            <Text style={styles.subText}>See you tomorrow for a new one.</Text>
          </View>
        ) : (
          <View style={styles.center}>
            {/* NAME AND REPS */}
            <Text style={styles.task}>{exercise.reps} {exercise.name}</Text>
            
            {/* DESCRIPTION AREA */}
            <View style={styles.descriptionBox}>
              <Info color="#8E8E93" size={18} style={{marginBottom: 8}} />
              <Text style={styles.descriptionText}>{exercise.description}</Text>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleDone}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <CheckCircle2 color="white" size={20} style={{marginRight: 10}} />
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

  const streak = history.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{alignItems: 'center', padding: 20}}>
        <View style={styles.avatar}><Text style={{fontSize: 40}}>⚡️</Text></View>
        <Text style={styles.name}>Fitness Champ</Text>
        <Text style={styles.level}>Level {Math.floor(streak / 5) + 1} Athlete</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{streak}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
          <View style={[styles.statBox, {backgroundColor: '#FF9500'}]}>
            <Text style={styles.statNum}>{streak * 50}</Text>
            <Text style={[styles.statLabel, {color: 'white'}]}>Total XP</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity History</Text>
          <View style={styles.grid}>
            {[...Array(12)].map((_, i) => (
              <View key={i} style={[styles.dot, i < streak ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- NAVIGATION ---
export default function App() {
  return (
    <NavigationContainer theme={DefaultTheme}>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: { height: 90, paddingBottom: 30 },
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

// --- STYLING ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { justifyContent: 'center', alignItems: 'center' },
  main: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  label: { color: '#8E8E93', fontWeight: 'bold', letterSpacing: 2, fontSize: 12 },
  task: { fontSize: 48, fontWeight: '900', color: '#007AFF', marginTop: 30, textAlign: 'center' },
  
  descriptionBox: { 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    padding: 20, 
    borderRadius: 20, 
    marginVertical: 30, 
    alignItems: 'center',
    width: '100%'
  },
  descriptionText: { 
    fontSize: 15, 
    color: '#48484A', 
    lineHeight: 22, 
    textAlign: 'center',
    fontWeight: '500'
  },

  btn: { backgroundColor: '#007AFF', paddingHorizontal: 45, paddingVertical: 20, borderRadius: 35, elevation: 5 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  titleText: { fontSize: 28, fontWeight: 'bold', marginTop: 20, color: '#1C1C1E' },
  subText: { color: '#8E8E93', marginTop: 10, fontSize: 16, textAlign: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  name: { fontSize: 26, fontWeight: 'bold', marginTop: 15 },
  level: { color: '#007AFF', fontWeight: '600', marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  statBox: { backgroundColor: 'white', padding: 20, borderRadius: 25, width: '47%', alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 30, width: '100%' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 35, height: 35, borderRadius: 10, margin: 6 },
  dotActive: { backgroundColor: '#34C759' },
  dotInactive: { backgroundColor: '#E5E5EA' }
});