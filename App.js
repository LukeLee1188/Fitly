import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform, FlatList 
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User as UserIcon, Trophy, Flame, Camera, Heart, MessageCircle } from 'lucide-react-native';
// Note: Changed User to UserIcon to avoid conflicts if you ever create a User variable. Update your Tab.Screen for Profile to use UserIcon!
import { Image } from 'react-native';

// FIREBASE ENGINE
import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, limit } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

//EXPO FOR AUDIO
import { Audio } from 'expo-av';

const firebaseConfig = {
  apiKey: "AIzaSyA6NYMuK3mUsSq2lqdDbQe-wXs-JADflLk",
  authDomain: "least-common-multiple.firebaseapp.com",
  projectId: "least-common-multiple",
  storageBucket: "least-common-multiple.firebasestorage.app",
  messagingSenderId: "889087754267",
  appId: "1:889087754267:web:cd090f9fd0ca2e1fec78be"
};

// Initialize Engines in correct order
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 
const storage = getStorage(app);
const Tab = createBottomTabNavigator();

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

  // Function for Login and Sign Up
  const handleAuth = async () => {
    if (!email || !password) { showAlert("Error", "Fill in all fields"); return; }
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email, history: [], xp: 0, streak: 0, bio: 'New Athlete', displayName: email.split('@')[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) { showAlert("Auth Error", error.message); }
  };

  // Function for Reset Password
  const handleResetPassword = async () => {
    if (!email) {
      showAlert("Email Required", "Please type your email address above to receive a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showAlert("Email Sent", "Check your inbox (and spam) for a link to reset your password.");
    } catch (error) {
      showAlert("Reset Error", error.message);
    }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.heroTitle}>Fitly</Text>
      
      <TextInput 
        placeholder="Email" 
        style={styles.input} 
        onChangeText={setEmail} 
        value={email} 
        autoCapitalize="none" 
      />
      
      <TextInput 
        placeholder="Password" 
        style={styles.input} 
        secureTextEntry 
        onChangeText={setPassword} 
        value={password} 
      />

      <TouchableOpacity style={styles.btn} onPress={handleAuth}>
        <Text style={styles.btnText}>{isRegistering ? "Sign Up" : "Login"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
        <Text style={styles.toggleText}>
          {isRegistering ? "Back to Login" : "Create Account"}
        </Text>
      </TouchableOpacity>

      {/* NEW: Reset Password Button */}
      {!isRegistering && (
        <TouchableOpacity onPress={handleResetPassword} style={{ marginTop: 20 }}>
          <Text style={{ color: '#7a7a7e', fontWeight: '500' }}>Forgot Password?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- 2. CHALLENGE SCREEN ---
// --- 2. CHALLENGE SCREEN ---
function ChallengeScreen() {
  const [exercise, setExercise] = useState(null);
  const [userData, setUserData] = useState({ history: [], xp: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString();
  const userId = auth.currentUser?.uid;
  const [currentExerciseName, setCurrentExerciseName] = useState("Pushups");

  useEffect(() => {
    if (!userId) return;

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
    const dayOfYear = Math.floor((now - start) / 86400000);
    const selectedName = exerciseNames[dayOfYear % exerciseNames.length] || "Pushups";
    setCurrentExerciseName(selectedName);
    
    const unsubEx = onSnapshot(doc(db, "exercises", selectedName), (snap) => {
      if (snap.exists()) setExercise(snap.data());
      setLoading(false);
    });

    const unsubUser = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);

        // --- NEW: THE STREAK BREAKER LOGIC ---
        if (data.streak > 0 && data.history) {
          // 1. Calculate the exact dates for Today and Yesterday
          const todayDate = new Date();
          const yesterdayDate = new Date();
          yesterdayDate.setDate(todayDate.getDate() - 1);

          // 2. Format them to match how you save to Firebase (e.g., "4/21/2026")
          const todayStr = todayDate.toLocaleDateString();
          const yesterdayStr = yesterdayDate.toLocaleDateString();

          // 3. If neither date is in their history, the streak is dead
          if (!data.history.includes(todayStr) && !data.history.includes(yesterdayStr)) {
            
            // Reset streak to 0 in Firebase
            setDoc(doc(db, "users", userId), { streak: 0 }, { merge: true });
            
            // Show them a heartbreaking alert
            showAlert("Streak Broken 💔", "You missed a day! Your streak has been reset to 0. Time to start fresh!");
          }
        }
      }
    });

    return () => { unsubEx(); unsubUser(); };
  }, [userId]);

  // --- NEW: Audio function for submitting proof ---
  async function playSuccessSound() {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/click.wav') // Tip: You can change this to a 'tada.wav' or 'success.mp3' later!
      );
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  }

  const handleDone = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert("Permission Denied", "We need access to your gallery to upload proof.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });

    if (result.canceled) return;
    setLoading(true);

    const asset = result.assets[0];
    const fileExtension = asset.type === 'video' ? 'mp4' : 'jpg';
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    
    const fileRef = ref(storage, `proofs/${userId}/${today.replace(/\//g, '-')}.${fileExtension}`);
    await uploadBytes(fileRef, blob);
    const photoUrl = await getDownloadURL(fileRef);

    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { 
      history: arrayUnion(today),
      xp: (userData.xp || 0) + 50,
      streak: (userData.streak || 0) + 1,
      lastProofUrl: photoUrl 
    }, { merge: true });

    // --- NEW: Trigger the sound right before the success alert ---
    playSuccessSound();

    showAlert("Success!", "Video proof uploaded and streak updated!");
  } catch (e) {
    console.error(e);
    showAlert("Error", "Upload failed. Check your internet connection.");
  } finally {
    setLoading(false);
  }
};

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  const isDone = userData.history?.includes(today);

  // --- PROGRESSIVE OVERLOAD LOGIC ---
  const xpMultiplier = Math.floor((userData.xp || 0) / 500);
  const baseAmount = parseInt(exercise?.amount || 20, 10);
  const unitType = exercise?.reps || "Reps";
  const modifierText = exercise?.modifier ? ` ${exercise.modifier}` : "";

  let targetAmount = baseAmount;

  if (unitType === "Seconds") {
    targetAmount = baseAmount + (xpMultiplier * 10);
  } else {
    targetAmount = baseAmount + (xpMultiplier * 2);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>DAILY CHALLENGE</Text>
          <View style={styles.streakBadge}>
            <Flame color="#FF9500" size={16} /><Text style={styles.streakText}>{userData.streak || 0}</Text>
          </View>
        </View>
        <View style={styles.center}>
          
          {}
          <Text style={styles.taskTitle}>
            {isDone 
              ? "🏆 Completed!!!" 
              : `${targetAmount} ${unitType}${modifierText} of\n${exercise?.name || currentExerciseName}`}
          </Text>

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

// --- 3. Feed ---
// --- 3. Feed ---
function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for handling comments
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const q = query(
      collection(db, "users"), 
      orderBy("lastProofUrl"), 
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const feedData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.lastProofUrl); 
      
      setPosts(feedData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // --- NEW: Handle Likes ---
  const handleLike = async (postUserId, currentLikes = []) => {
    if (!currentUserId) return;
    const postRef = doc(db, "users", postUserId);
    
    // If they already liked it, remove their ID. Otherwise, add it.
    if (currentLikes.includes(currentUserId)) {
      await updateDoc(postRef, { likes: arrayRemove(currentUserId) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(currentUserId) });
    }
  };

  // --- NEW: Handle Comments ---
  const handleAddComment = async (postUserId) => {
    if (!commentText.trim() || !currentUserId) return;
    
    const postRef = doc(db, "users", postUserId);
    await updateDoc(postRef, {
      comments: arrayUnion({
        text: commentText,
        authorId: currentUserId,
        timestamp: new Date().toISOString()
      })
    });
    
    setCommentText("");
    setActiveCommentId(null); // Close the input box
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.sectionLabel}>COMMUNITY FEED</Text>
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasLiked = item.likes?.includes(currentUserId);
            const likeCount = item.likes?.length || 0;
            const comments = item.comments || [];

            return (
              <View style={styles.feedCard}>
                <View style={styles.feedHeader}>
                  <Text style={styles.userNameText}>{item.displayName || "Athlete"}</Text>
                  <Text style={styles.feedDate}>{item.streak || 0} Day Streak</Text>
                </View>
                
                <Image 
                  source={{ uri: item.lastProofUrl }} 
                  style={styles.feedImage} 
                  resizeMode="cover"
                />
                
                <View style={styles.feedFooter}>
                  {/* --- ACTION BUTTONS --- */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id, item.likes)}>
                      <Heart color={hasLiked ? "#FF3B30" : "#3A3A3C"} fill={hasLiked ? "#FF3B30" : "transparent"} size={24} />
                      <Text style={styles.actionText}>{likeCount}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveCommentId(activeCommentId === item.id ? null : item.id)}>
                      <MessageCircle color="#3A3A3C" size={24} />
                      <Text style={styles.actionText}>{comments.length}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.feedBio}>
                    <Text style={{fontWeight: 'bold'}}>{item.displayName || "Athlete"} </Text>
                    {"Just finished the daily challenge!"}
                  </Text>

                  {/* --- COMMENTS SECTION --- */}
                  {comments.length > 0 && (
                    <View style={styles.commentSection}>
                      {comments.slice(-3).map((comment, index) => ( // Show only latest 3 comments
                        <Text key={index} style={styles.commentText}>
                           <Text style={{fontWeight: '600'}}>Athlete: </Text>{comment.text}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* --- COMMENT INPUT BOX --- */}
                  {activeCommentId === item.id && (
                    <View style={styles.commentInputRow}>
                      <TextInput 
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        value={commentText}
                        onChangeText={setCommentText}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => handleAddComment(item.id)}>
                        <Text style={styles.postCommentBtn}>Post</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

// --- 4. LEADERBOARD ---
function LeaderboardScreen() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("streak", "desc"), limit(10));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.sectionLabel}>Leaderboard</Text>
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({item, index}) => (
            <View style={styles.leaderboardRow}>
              <Text style={styles.rankText}>{index + 1}</Text>
              <View style={{flex: 1}}>
                <Text style={styles.userNameText}>{item.displayName || "Athlete"}</Text>
                <Text style={{fontSize: 12, color: '#8E8E93'}}>{item.xp || 0} Total XP</Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Flame color="#FF9500" size={16} />
                <Text style={styles.streakVal}> {item.streak || 0}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

// --- 5. PROFILE SCREEN ---
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
              <View style={styles.statItem}><Text style={styles.statValue}>{userData.streak || 0}</Text><Text style={styles.statLabel}>Streak</Text></View>
              <View style={[styles.statItem, {backgroundColor: '#5856D6'}]}><Text style={[styles.statValue, {color: 'white'}]}>{userData.xp || 0}</Text><Text style={[styles.statLabel, {color: '#DDD'}]}>XP</Text></View>
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


// --- 6. NAVIGATION ---
export default function App() {
  const [user, setUser] = useState(null);
// 1. This function handles the actual sound playing
  async function playWelcomeSound() {
    try {
      // Ensure the audio mode allows playing
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, // This allows sound even if the ringer is off
      });

      const { sound } = await Audio.Sound.createAsync(
        require('./assets/click.wav') 
      );
      await sound.playAsync();
      
      // Automatically clean up memory after the sound plays
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  }
 useEffect(() => { 
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      // 2. Trigger the sound only when a user is successfully logged in
      if (u) {
        playWelcomeSound();
      }
    }); 
  }, []);

  if (!user) return <AuthScreen />;

  return (
    <NavigationContainer theme={DefaultTheme}>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#007AFF' }}>
        <Tab.Screen name="Challenge" component={ChallengeScreen} options={{ tabBarIcon: ({color}) => <Home color={color} size={24}/> }} />
        <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarIcon: ({color}) => <Camera color={color} size={24}/> }} />
        <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ tabBarIcon: ({color}) => <Trophy color={color} size={24}/> }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({color}) => <UserIcon color={color} size={24}/> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// --- 7. Styles---
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
  userNameText: { fontSize: 16, fontWeight: '600' },
  streakVal: { fontWeight: 'bold', color: '#FF9500', fontSize: 18 },
  scrollContent: { alignItems: 'center', paddingBottom: 30 },
  feedCard: { backgroundColor: 'white', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E5EA',},
  feedHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',},
  feedImage: { width: '100%', height: 300, backgroundColor: '#E5E5EA',},
  feedFooter: { padding: 15,},
  feedDate: { fontSize: 12, color: '#FF9500', fontWeight: 'bold',},
  feedBio: { fontSize: 14, color: '#3A3A3C',},
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionText: { marginLeft: 6, fontSize: 16, fontWeight: '600', color: '#3A3A3C' },
  commentSection: { marginTop: 10, paddingLeft: 5, borderLeftWidth: 2, borderLeftColor: '#E5E5EA' },
  commentText: { fontSize: 13, color: '#3A3A3C', marginBottom: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 10 },
  commentInput: { flex: 1, backgroundColor: '#F2F2F7', padding: 10, borderRadius: 10, marginRight: 10 },
  postCommentBtn: { color: '#007AFF', fontWeight: 'bold' }
});