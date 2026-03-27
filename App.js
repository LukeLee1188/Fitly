import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, 
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User, CheckCircle2, Trophy, Info, Flame } from 'lucide-react-native';

// FIREBASE ENGINE
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, arrayUnion } from "firebase/firestore";

// IMPORT ENV KEYS
import { 
  FIREBASE_API_KEY, 
  FIREBASE_AUTH_DOMAIN, 
  FIREBASE_PROJECT_ID 
} from '@env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY || "AIzaSyA6NYMuK3mUsSq2lqdDbQe-wXs-JADflLk",
  authDomain: FIREBASE_AUTH_DOMAIN || "least-common-multiple.firebaseapp.com",
  projectId: FIREBASE_PROJECT_ID || "least-common-multiple",
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
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const exerciseIndex = (dayOfYear % 30) + 1;

    const unsubTask = onSnapshot(doc(db, "library", exerciseIndex.toString()), (snap) => {
      if (snap.exists()) setExercise(snap.data());
      setLoading(false);
    });

    const unsubUser = onSnapshot(doc(db, "users", "test_user"), (snap) => {
      if (snap.exists()) setHistory(snap.data().history || []);
    });

    const interval = setInterval(() => {
      const checkDate = new Date().toLocaleDateString();
      if (checkDate !== today) setToday(checkDate);
    }, 30000);

    return () => { unsubTask(); unsubUser(); clearInterval(interval); };
  }, [today]);

  const handleDone = async () => {
    if (isDoneToday) return;
    try {
      const userRef = doc(db, "users", "test_user");
      await setDoc(userRef, { 
        history: arrayUnion(today),
        lastCompletedAt: new Date().toISOString() 
      }, { merge: true });
      Alert.alert("Boom!", "Daily challenge crushed.");
    } catch (e) {
      Alert.alert("Offline?", "Check your connection and try again.");
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.label}>TODAY'S GLOBAL CHALLENGE</Text>
          <View style={styles.streakBadge}>
            <Flame color="#FF9500" size={16} fill="#FF9500" />
            <Text style={styles.streakText}>{history.length}</Text>
          </View>
        </View>
        
        {isDoneToday ? (
          <View style={styles.center}>
            <Trophy color="#FFCC00" size={120} strokeWidth={1} />
            <Text style={styles.titleText}>You're All Set!</Text>
            <Text style={styles.subText}>New challenge drops at midnight.</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.task}>{exercise.reps} {exercise.name}</Text>
            
            <View style={styles.descriptionBox}>
              <Info color="#8E8E93" size={18} style={{marginBottom: 8}} />
              <Text style={styles.descriptionText}>{exercise.description}</Text>
            </View>

            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.btn} 
              onPress={handleDone}
            >
              <View style={styles.btnContent}>
                <CheckCircle2 color="white" size={24} style={{marginRight: 12}} />
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

  const totalPoints = history.length * 50;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatar}>
          <Text style={{fontSize: 44}}>👤</Text>
        </View>
        <Text style={styles.name}>Athlete #8890</Text>
        <Text style={styles.level}>Pro Member</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{history.length}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={[styles.statBox, {backgroundColor: '#5856D6'}]}>
            <Text style={[styles.statNum, {color: 'white'}]}>{totalPoints}</Text>
            <Text style={[styles.statLabel, {color: 'rgba(255,255,255,0.7)'}]}>Total XP</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Consistency</Text>
          <View style={styles.grid}>
            {[...Array(30)].map((_, i) => (
              <View 
                key={i} 
                style={[styles.dot, i < history.length ? styles.dotActive : styles.dotInactive]} 
              />
            ))}
          </View>
          <Text style={styles.gridFooter}>Every dot represents a completed daily goal</Text>
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
        tabBarInactiveTintColor: '#C7C7CC',
        tabBarStyle: { 
          height: Platform.OS === 'ios' ? 90 : 70, 
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 10,
          shadowOpacity: 0.1
        },
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
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { alignItems: 'center', padding: 20 },
  main: { flex: 1, padding: 25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  label: { color: '#8E8E93', fontWeight: 'bold', letterSpacing: 1.5, fontSize: 11 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FF9500' },
  streakText: { marginLeft: 4, fontWeight: 'bold', color: '#FF9500' },
  task: { fontSize: 44, fontWeight: '900', color: '#1C1C1E', marginTop: 40, textAlign: 'center' },
  descriptionBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, marginVertical: 40, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  descriptionText: { fontSize: 16, color: '#3A3A3C', lineHeight: 24, textAlign: 'center' },
  btn: { backgroundColor: '#007AFF', width: '100%', paddingVertical: 20, borderRadius: 20, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  titleText: { fontSize: 26, fontWeight: 'bold', marginTop: 24, color: '#1C1C1E' },
  subText: { color: '#8E8E93', marginTop: 8, fontSize: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginTop: 40, elevation: 4 },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  level: { color: '#8E8E93', marginBottom: 30 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  statBox: { backgroundColor: 'white', padding: 24, borderRadius: 28, width: '47%', alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '900', color: '#1C1C1E' },
  statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 4 },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 32, width: '100%' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dot: { width: 20, height: 20, borderRadius: 6, margin: 4 },
  dotActive: { backgroundColor: '#34C759' },
  dotInactive: { backgroundColor: '#E5E5EA' },
  gridFooter: { fontSize: 12, color: '#C7C7CC', marginTop: 15, textAlign: 'center' }
});
