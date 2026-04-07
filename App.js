import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform, FlatList 
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User, CheckCircle2, Trophy, Info, Flame, Camera } from 'lucide-react-native';

// FIREBASE ENGINE
import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, arrayUnion, collection, query, orderBy, limit } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
const auth = getAuth(app);      // <--- THIS IS THE MISSING LINE
const Tab = createBottomTabNavigator();

// Custom Alert that works on Web and Mobile
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// --- 1. AUTHENTICATION ---
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) { showAlert("Error", "Fill in all fields"); return; }
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email, history: [], xp: 0, bio: 'New Athlete', displayName: email.split('@')[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) { showAlert("Auth Error", error.message); }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.heroTitle}>Fitly</Text>
      <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} value={email} autoCapitalize="none" />
      <TextInput placeholder="Password" style={styles.input} secureTextEntry onChangeText={setPassword} value={password} />
      <TouchableOpacity style={styles.btn} onPress={handleAuth}>
        <Text style={styles.btnText}>{isRegistering ? "Sign Up" : "Login"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
        <Text style={styles.toggleText}>{isRegistering ? "Back to Login" : "Create Account"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- 2. CHALLENGE SCREEN (WITH MEDIA UPLOAD) ---
function ChallengeScreen() {
  const [exercise, setExercise] = useState(null);
  const [userData, setUserData] = useState({ history: [], xp: 0 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // Bring back the full list to match your database
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
    const selectedName = exerciseNames[dayOfYear % exerciseNames.length] || "Pushups";
    
    console.log("Fetching challenge for today:", selectedName);

    const unsubEx = onSnapshot(doc(db, "exercises", selectedName), (snap) => {
      if (snap.exists()) {
        setExercise(snap.data());
      } else {
        console.warn(`Missing Document: Create "${selectedName}" in your exercises collection!`);
      }
      setLoading(false);
    });

    const unsubUser = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    return () => { unsubEx(); unsubUser(); };
  }, [userId]);

  const handleDone = async () => {
    // 1. Get Camera Permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert("Permission Denied", "Camera access is needed to verify workouts.");
      return;
    }

    // 2. Open Camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });

    if (result.canceled) return;

    try {
      setLoading(true);
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      // 3. Upload Proof to Storage (Using the real userId)
      const fileRef = ref(storage, `proofs/${userId}/${today.replace(/\//g, '-')}.jpg`);
      await uploadBytes(fileRef, blob);
      const photoUrl = await getDownloadURL(fileRef);

      // 4. Update Firestore: Use userId instead of "test_user"
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { 
        history: arrayUnion(today),
        xp: (userData.xp || 0) + 50, // This makes you move up the leaderboard!
        lastProofUrl: photoUrl 
      }, { merge: true });

      showAlert("Success!", "Workout verified and 50 XP earned!");
    } catch (e) {
      console.error(e);
      showAlert("Error", "Failed to upload proof.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  const isDone = userData.history?.includes(today);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>DAILY CHALLENGE</Text>
          <View style={styles.streakBadge}>
            <Flame color="#FF9500" size={16} /><Text style={styles.streakText}>{userData.history?.length || 0}</Text>
          </View>
        </View>
        <View style={styles.center}>
          <Text style={styles.taskTitle}>{isDone ? "🏆 Verified" : `${exercise?.reps || "20"} ${exercise?.name || "Reps"}`}</Text>
          {!isDone && (
            <TouchableOpacity style={styles.btn} onPress={handleDone}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Camera color="white" size={20} style={{marginRight: 10}}/>
                <Text style={styles.btnText}>Submit Proof</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- 3. LEADERBOARD ---
function LeaderboardScreen() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(10));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.sectionLabel}>LEADERBOARD</Text>
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({item, index}) => (
            <View style={styles.leaderboardRow}>
              <Text style={styles.rankText}>{index + 1}</Text>
              <Text style={styles.userNameText}>{item.displayName}</Text>
              <Text style={styles.xpText}>{item.xp} XP</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

// --- 4. PROFILE SCREEN ---
function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    return onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setNewName(data.displayName || '');
        setNewBio(data.bio || '');
      }
    });
  }, [userId]);

  const handleUpdate = async () => {
    try {
      await setDoc(doc(db, "users", userId), { displayName: newName, bio: newBio }, { merge: true });
      setIsEditing(false);
      showAlert("Saved", "Profile updated.");
    } catch (e) { showAlert("Error", "Could not save."); }
  };

  if (!userData) return <ActivityIndicator style={{flex: 1}} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarCircle}><Text style={{fontSize: 40}}>👤</Text></View>
        {isEditing ? (
          <View style={{width: '100%', padding: 20}}>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Name"/>
            <TextInput style={[styles.input, {height: 80}]} value={newBio} onChangeText={setNewBio} placeholder="Bio" multiline />
            <TouchableOpacity style={styles.btn} onPress={handleUpdate}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={{alignItems: 'center', width: '100%'}}>
            <Text style={styles.profileName}>{userData.displayName}</Text>
            <Text style={styles.bioText}>{userData.bio}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}><Text style={styles.statValue}>{userData.history?.length || 0}</Text><Text style={styles.statLabel}>Streak</Text></View>
              <View style={[styles.statItem, {backgroundColor: '#5856D6'}]}><Text style={[styles.statValue, {color: 'white'}]}>{userData.xp}</Text><Text style={[styles.statLabel, {color: '#DDD'}]}>XP</Text></View>
            </View>
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#8E8E93', marginTop: 20}]} onPress={() => setIsEditing(true)}>
              <Text style={styles.btnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
              <Text style={styles.btnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 5. NAVIGATION ---
export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => { return onAuthStateChanged(auth, (u) => setUser(u)); }, []);
  if (!user) return <AuthScreen />;

  return (
    <NavigationContainer theme={DefaultTheme}>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#007AFF' }}>
        <Tab.Screen name="Challenge" component={ChallengeScreen} options={{ tabBarIcon: ({color}) => <Home color={color} size={24}/> }} />
        <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ tabBarIcon: ({color}) => <Trophy color={color} size={24}/> }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({color}) => <User color={color} size={24}/> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  main: { flex: 1, padding: 25 },
  heroTitle: { fontSize: 42, fontWeight: '900', color: '#007AFF', marginBottom: 30 },
  input: { width: '100%', backgroundColor: 'white', padding: 18, borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  btn: { backgroundColor: '#007AFF', paddingVertical: 18, borderRadius: 15, width: '100%', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  toggleText: { marginTop: 20, color: '#007AFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionLabel: { color: '#8E8E93', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 6, borderRadius: 10, borderWidth: 1, borderColor: '#FF9500' },
  streakText: { marginLeft: 5, color: '#FF9500', fontWeight: 'bold' },
  taskTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  profileName: { fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  bioText: { fontSize: 16, color: '#3A3A3C', textAlign: 'center', marginBottom: 30, fontStyle: 'italic' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  statItem: { backgroundColor: 'white', padding: 20, borderRadius: 20, width: '48%', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, color: '#8E8E93' },
  logoutBtn: { backgroundColor: '#FF3B30', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginTop: 10 },
  leaderboardRow: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center' },
  rankText: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', width: 35 },
  userNameText: { flex: 1, fontSize: 16, fontWeight: '600' },
  xpText: { fontWeight: 'bold', color: '#5856D6' },
  scrollContent: { alignItems: 'center', paddingBottom: 30 }
});