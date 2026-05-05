/**
 * FITLY - Daily Fitness Challenge App
 *
 * Sources:
 * - Exercise list: Adapted from PE programs at 3 local schools
 * - Firebase (Auth, Firestore, Storage): https://firebase.google.com
 * - Expo ImagePicker & Audio: https://docs.expo.dev
 * - React Navigation (bottom tabs): https://reactnavigation.org
 * - Lucide icons: https://lucide.dev
 * - Autofills from VS Code
 */

import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform, FlatList 
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, User as UserIcon, Trophy, Flame, Camera, Heart, MessageCircle, Flag, Info } from 'lucide-react-native';
import { Image } from 'react-native';

// Firebase imports
import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, limit, addDoc, orderBy } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";



// Expo audio
import { Audio } from 'expo-av'; //audio from freesound.org

const firebaseConfig = { //taken from firebase
  apiKey: "AIzaSyA6NYMuK3mUsSq2lqdDbQe-wXs-JADflLk",
  authDomain: "least-common-multiple.firebaseapp.com",
  projectId: "least-common-multiple",
  storageBucket: "least-common-multiple.firebasestorage.app",
  messagingSenderId: "889087754267",
  appId: "1:889087754267:web:cd090f9fd0ca2e1fec78be"
};

// Initialize Engines
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

// Notifications on the app
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 1. Authentication (Firebase helped with this)
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

      {/* Reset Password Button */}
      {!isRegistering && (
        <TouchableOpacity onPress={handleResetPassword} style={{ marginTop: 20 }}>
          <Text style={{ color: '#7a7a7e', fontWeight: '500' }}>Forgot Password?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// 2. Challenge screen
function ChallengeScreen() {
  const [exercise, setExercise] = useState(null);
  const [userData, setUserData] = useState({ history: [], xp: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString();
  const userId = auth.currentUser?.uid;
  const [currentExerciseName, setCurrentExerciseName] = useState("Pushups");

  useEffect(() => {
    if (!userId) return;

    // Source: Exercise list adapted from PE programs
    const exerciseNames = [
      "Arm Circles", "Burpee", "Buttkick", "Calf Raises", "Crunch", 
      "Deadbugs", "Dips", "Glute Bridge", "High Knees", "Jogging", 
      "Karaoke", "Leg Raises", "Leg Swings", "Lunges", "Open and Close Gates", 
      "Pushups", "Quad Pull", "Russian Twists", "Scoops", "Seated Leg Lifts", 
      "Shadow Boxing", "Shoulder Shrugs", "Side Lunges", "Side Shuffles", 
      "Squats", "Standing March", "Standing On One Leg", "Superman", "Walking"
    ];

    // Picks a different exercise each day based on the day-of-year index
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

        // Runs on login: resets streak to 0 if the user missed yesterday and clears feed data if they haven't uploaded today
        // Daily Sweep and Streak Breaker
        const todayDate = new Date();
        const todayStr = todayDate.toLocaleDateString();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(todayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString();

        // 1. Break the streak if they missed yesterday
        if (data.streak > 0 && data.history) {
          if (!data.history.includes(todayStr) && !data.history.includes(yesterdayStr)) {
            setDoc(doc(db, "users", userId), { streak: 0 }, { merge: true });
            
            // Show them a heartbreaking alert
            showAlert("Streak Broken 💔", "You missed a day! Your streak has been reset to 0. Time to start fresh!");
          }
        }

        // 2. If their last upload wasn't today, wipe their feed data
        if (data.lastUploadDate !== todayStr && data.lastProofUrl) {
          updateDoc(doc(db, "users", userId), {
            lastProofUrl: null, 
            likes: [],          
            comments: []        
          });
        }
      }
    });

    return () => { unsubEx(); unsubUser(); };
  }, [userId]);

  // Audio function for submitting proof
  async function playSuccessSound() {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(require('./assets/click.wav'));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) sound.unloadAsync(); });
    } catch (error) { console.log("Audio failed:", error); }
  }

  const handleDone = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert("Permission Denied", "We need access to your gallery to upload proof.");
        return;
      }

      // Note: Only doing photos for now, no videos. mediaTypes includes 'videos' for future use but we only process images.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'], allowsEditing: true, aspect: [1, 1], quality: 0.3,
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
        lastProofUrl: photoUrl,
        lastUploadDate: today,
        lastUploadTime: new Date().toISOString()
      }, { merge: true });

      playSuccessSound();
      showAlert("Success!", "Proof uploaded to the community feed!");
    } catch (e) {
      console.error(e);
      showAlert("Error", "Upload failed. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const showAppInfo = () => {
    showAlert(
      "How Fitly Works", 
      "1. Get a quick, 5-minute daily exercise.\n2. Upload a photo/video to prove you did it.\n3. Build your streak and level up!\n\nPrivacy Note: Your uploaded proof is shared on the Community Feed to keep you accountable, but it automatically deletes every day at midnight."
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  const isDone = userData.history?.includes(today);
  // XP multiplier increases the target amount every 500 XP earned
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
      <ScrollView contentContainerStyle={styles.main}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.sectionLabel}>DAILY CHALLENGE</Text>
            <TouchableOpacity onPress={showAppInfo} style={{marginLeft: 10}}>
              <Info color="#8E8E93" size={18} />
            </TouchableOpacity>
          </View>
          <View style={styles.streakBadge}>
            <Flame color="#FF9500" size={16} /><Text style={styles.streakText}>{userData.streak || 0}</Text>
          </View>
        </View>

        <View style={styles.center}>
          <Text style={styles.taskTitle}>
            {isDone 
              ? "🏆 Completed!!!" 
              : `${targetAmount} ${unitType}${modifierText} of\n${exercise?.name || currentExerciseName}`}
          </Text>

          {/* Only shows the image card if a url exists in Firebase */}
          {!isDone && exercise?.imageURL && (
            <View style={styles.exerciseDetailsCard}>
              <Image source={{uri: exercise.imageURL}} style={styles.exerciseImage} />
            </View>
          )}

          {!isDone && (
            <TouchableOpacity style={[styles.btn, {marginTop: exercise?.imageURL ? 0 : 30}]} onPress={handleDone}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Camera color="white" size={20} style={{marginRight: 10}}/>
                <Text style={styles.btnText}>Submit Proof</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 3. Feed 
function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const currentUserId = auth.currentUser?.uid;

  const getMilitaryTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  useEffect(() => {
    const q = query(
      collection(db, "users"), 
      limit(50) // Grab the latest active users
    );

    const unsub = onSnapshot(q, (snap) => {
      const todayStr = new Date().toLocaleDateString();

      const feedData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => {
          // Only show users who uploaded a proof photo today 
          return user.lastProofUrl && user.lastUploadDate === todayStr;
        });
      
      // Sort the feed so the most recent uploads are at the top
      feedData.sort((a, b) => new Date(b.lastUploadTime || 0) - new Date(a.lastUploadTime || 0));

      setPosts(feedData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLike = async (postUserId, currentLikes = []) => {
    if (!currentUserId) return;
    const postRef = doc(db, "users", postUserId);
    try {
      if (currentLikes.includes(currentUserId)) {
        await updateDoc(postRef, { likes: arrayRemove(currentUserId) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUserId) });
      }
    } catch (error) { console.error("Like failed", error); }
  };

  const handleReport = (postUserId, postName) => {
    
    // Saves a report document to Firestore for manual admin review
    const submitReport = async () => {
      try {
        await addDoc(collection(db, "reports"), {
          reportedUserId: postUserId, 
          reportedByName: postName,
          reportedByUserId: currentUserId, 
          timestamp: new Date().toISOString(),
          status: "Needs Review"
        });
        showAlert("Reported", "This content has been flagged for review.");
      } catch (error) { 
        console.error("Report failed", error); 
        showAlert("Error", "Could not send the report.");
      }
    };

    // 2. Check if you are on the computer (Web) or a Phone (Native)
    if (Platform.OS === 'web') {
      // Use the standard web browser popup
      const userConfirmed = window.confirm(`Are you sure you want to report the post by ${postName}?`);
      if (userConfirmed) {
        submitReport();
      }
    } else {
      // Use the iOS/Android popup
      Alert.alert(
        "Report Content",
        `Are you sure you want to report the post by ${postName}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Report", style: "destructive", onPress: submitReport }
        ]
      );
    }
  };

  const handleAddComment = async (postUserId) => {
    if (!commentText.trim() || !currentUserId) return;
    // Basic profanity filter. Words were generated through Gemini. Uses regex to catch common misspellings too.
    const blockedWords = [
      // Standard & Misspellings
      "fuck", "fck", "fuk", "phuck", "fook", "fucking", "fcker", "mofo", "mutha", 
      "shit", "shyt", "sh1t", "shitty", "bullshit", "batshit",
      "bitch", "bish", "b1tch", "biatch", "btch", "bitches",
      "ass", "a55", "arse", "asshole", "ashole", "asshat", "ahole",
      "damn", "dammit", "goddamn", "crap", "piss", 
      
      // Anatomy & Explicit
      "dick", "d1ck", "dck", "prick", "cock", "c0ck", "penis", "pecker", "schlong",
      "pussy", "puss", "pusi", "cunt", "cnt", "twat", "vagina", "clit", "labia",
      "slut", "slvt", "whore", "hoar", "hoes", "hooker", "skank", "tramp", "bimbo",
      "cum", "jizz", "semen", "sperm", "masturbate", "wank", "wanker", "toss", "tosser",
      "sex", "porno", "porn", "xxx", "hentai", "nudes", "boobs", "tits", "titties", "chud", "butthole", "butt", 
      
      // Severe / Hate Speech (Bypass variants)
      "nigger", "nigga", "n1gga", "nigg3r", "nibba", "faggot", "fag", "f4g", "nga", 
      "dyke", "tranny", "chink", "spic", "beaner", "kike", "nazi", "pedo", "pedophile",
      
      // Bullying, Harm & Body Shaming
      "stupid", "st00pid", "dumm", "dumb", "dumbass", "idiot", "id1ot", "moron", 
      "retard", "r3tard", "tard", "autistic", "schizo", "spastic",
      "ugly", "fugly", "fat", "f4t", "fatass", "fatty", "obese", "pig", "cow", "whale", 
      "anorexic", "twig", "loser", "l0ser", "freak", "weirdo",
      "kill", "kys", "suicide", "die", "stfu", "gtfo"
    ];

    let normalizedComment = commentText.toLowerCase()
      .replace(/@/g, 'a')
      .replace(/\$/g, 's')
      .replace(/!/g, 'i')
      .replace(/1/g, 'i')
      .replace(/0/g, 'o')
      .replace(/3/g, 'e')
      .replace(/5/g, 's')
      .replace(/\*/g, 'u');

    // 3. Check the normalized text
    const containsBadWord = blockedWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, "i"); 
      return regex.test(normalizedComment); 
    });

    // 4. The Block
    if (containsBadWord) {
      showAlert("Comment Blocked 🛑", "Please keep the community positive and respectful!");
      return; 
    }

    // 5. The Upload 
    const postRef = doc(db, "users", postUserId);
    
    try {
      await updateDoc(postRef, {
        comments: arrayUnion({
          text: commentText, // We upload their original formatting so it looks natural!
          authorId: currentUserId,
          timestamp: new Date().toISOString()
        })
      });
      
      setCommentText("");
      setActiveCommentId(null); 
      
    } catch (error) {
      console.error("Comment failed to post:", error);
      showAlert("Error", "Could not post your comment. Check your connection.");
    }
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
                  
                  {/* Showing Streak and Military Time at top of post */}
                  <Text style={styles.feedDate}>
                    {item.streak || 0} Day Streak 
                    {item.lastUploadTime ? ` • ${getMilitaryTime(item.lastUploadTime)}` : ""}
                  </Text>

                </View>
                
                <Image source={{ uri: item.lastProofUrl }} style={styles.feedImage} resizeMode="cover" />
                
                <View style={styles.feedFooter}>
                  <View style={[styles.actionRow, {justifyContent: 'space-between'}]}>
                    <View style={{flexDirection: 'row'}}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id, item.likes)}>
                        <Heart color={hasLiked ? "#FF3B30" : "#3A3A3C"} fill={hasLiked ? "#FF3B30" : "transparent"} size={24} />
                        <Text style={styles.actionText}>{likeCount}</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveCommentId(activeCommentId === item.id ? null : item.id)}>
                        <MessageCircle color="#3A3A3C" size={24} />
                        <Text style={styles.actionText}>{comments.length}</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => handleReport(item.id, item.displayName)}>
                      <Flag color="#FF3B30" size={20} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.feedBio}>
                    <Text style={{fontWeight: 'bold'}}>{item.displayName || "Athlete"} </Text>
                    {"Just finished the daily challenge!"}
                  </Text>

                  {comments.length > 0 && (
                    <View style={styles.commentSection}>
                      {comments.slice(-3).map((comment, index) => ( 
                        <Text key={index} style={styles.commentText}>
                           <Text style={{fontWeight: '600'}}>Athlete: </Text>{comment.text}
                        </Text>
                      ))}
                    </View>
                  )}

                  {activeCommentId === item.id && (
                    <View style={styles.commentInputRow}>
                      <TextInput 
                        style={styles.commentInput} placeholder="Add a comment..."
                        value={commentText} onChangeText={setCommentText} autoFocus
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

// 4. Leaderboard
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

// 5. Profile Screen
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
        <Text style={[styles.disclaimerText, { marginTop: 40, marginLeft: 10, fontSize: 12, color: '#8E8E93' }]}> //disclaimer  based off of the default one
          Disclaimer: This is a demo app for educational purposes only. FITLY provides general exercise suggestions for informational purposes only and does not offer personalized fitness programs or medical advice.
          By using this app and performing any exercises, you agree that you do so voluntarily and at your own risk. You are responsible for using proper form and ensuring that any activity is appropriate for your fitness level and physical condition.
          FITLY is not liable for any injuries, damages, or losses that may result from the use of the app or participation in any exercises.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}


// 6. Navigation 
export default function App() {
  
const [user, setUser] = useState(null);

  // Daily 6 AM Reminder
  useEffect(() => {
    async function scheduleDailyReminder() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log("Notification permission denied!");
        return;
      }

      // Android requires a notification channel before scheduling
      //https://reactnativerelay.com/article/react-native-push-notifications-expo-complete-guide-2026
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-reminder', {
          name: 'Daily Reminder',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      // Production: fires at 6:00 AM every day
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Fitly Daily Challenge 🔥",
          body: "Time to wake up and get your 5-minute workout in! Don't break your streak.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 6,
          minute: 0,
          channelId: 'daily-reminder',
        },
      });

      // Test: swaps the trigger above for this one to fire in 5 seconds instead
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: "Fitly Daily Challenge 🔥",
      //     body: "Time to wake up and get your 5-minute workout in! Don't break your streak.",
      //     sound: true,
      //   },
      //   trigger: {
      //     type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      //     seconds: 5,
      //     repeats: false,
      //     channelId: 'daily-reminder',
      //   },
      // });

      console.log("Daily 6 AM reminder scheduled!");
    }

    scheduleDailyReminder();
  }, []);

// 1. This function handles the actual sound playing
  async function playWelcomeSound() {
    try {
      // Ensure the audio mode allows playing
      //https://docs.expo.dev/versions/latest/sdk/audio/
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

// 7. Styles
    //https://reactnative.dev/docs/style
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
  postCommentBtn: { color: '#007AFF', fontWeight: 'bold' },
  exerciseDetailsCard: { backgroundColor: 'white', width: '100%', borderRadius: 20, padding: 15, marginBottom: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  exerciseImage: { width: '100%', height: 250, borderRadius: 15, backgroundColor: '#F2F2F7', resizeMode: 'cover' }
});
