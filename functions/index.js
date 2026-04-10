const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// This runs every night at midnight
exports.dailyCleanup = functions.pubsub.schedule('0 0 * * *')
  .timeZone('America/New_York') // Set to your timezone!
  .onRun(async (context) => {
    const bucket = admin.storage().bucket();
    
    // This deletes EVERYTHING in the 'proofs/' folder
    try {
      await bucket.deleteFiles({ prefix: 'proofs/' });
      console.log('Midnight cleanup successful: All proofs deleted.');
      
      // Optional: Reset all users' 'lastProofUrl' in Firestore so they can't see old photos
      const usersSnap = await admin.firestore().collection('users').get();
      const batch = admin.firestore().batch();
      usersSnap.forEach(doc => {
        batch.update(doc.ref, { lastProofUrl: null });
      });
      await batch.commit();
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });