const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const calendar = google.calendar('v3');

exports.generateMeetLink = functions.https.onRequest(async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account.json',
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const authClient = await auth.getClient();
    const event = {
      summary: 'Medical Appointment',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      conferenceData: {
        createRequest: { requestId: Math.random().toString(36).substring(2) }
      }
    };

    const { data } = await calendar.events.insert({
      auth: authClient,
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    await admin.firestore().collection('appointments')
      .doc(req.body.appointmentId)
      .update({ gmeet_link: data.hangoutLink });

    res.status(200).json({ success: true, meetLink: data.hangoutLink });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Meet creation failed' });
  }
});

// Single appointment endpoint
exports.getAppointment = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('appointments')
      .doc(req.params.id).get();
    res.status(200).json({ id: snapshot.id, ...snapshot.data() });
  } catch (error) {
    res.status(500).json({ error: 'Appointment not found' });
  }
});

// Search endpoint
exports.searchAppointments = functions.https.onRequest(async (req, res) => {
  try {
    const query = req.query.query.toLowerCase();
    const snapshot = await admin.firestore().collection('appointments')
      .where('patient_name', '>=', query)
      .where('patient_name', '<=', query + '\uf8ff')
      .get();
    res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get all appointments
exports.getAllAppointments = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('appointments').get();
    res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create new appointment
exports.createAppointment = functions.https.onRequest(async (req, res) => {
  try {
    const docRef = await admin.firestore().collection('appointments').add(req.body);
    res.status(201).json({ id: docRef.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
exports.updateAppointment = functions.https.onRequest(async (req, res) => {
  try {
    await admin.firestore().collection('appointments')
      .doc(req.params.id)
      .update(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
exports.deleteAppointment = functions.https.onRequest(async (req, res) => {
  try {
    await admin.firestore().collection('appointments')
      .doc(req.params.id)
      .delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});