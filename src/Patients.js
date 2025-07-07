import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Paper,
  Collapse,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  People as PeopleIcon, 
  Email, 
  Phone, 
  Description, 
  Event, 
  ExpandMore, 
  ExpandLess,
  Close as CloseIcon 
} from "@mui/icons-material";
import DuoIcon from '@mui/icons-material/Duo';
import { db } from './firebase'; // Adjust import path as needed
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const tabOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" },
];

const sortOptions = [
  { value: "nameAsc", label: "Name (A-Z)" },
  { value: "nameDesc", label: "Name (Z-A)" },
  { value: "lastVisit", label: "Last Visit" },
  { value: "documentsCount", label: "Documents Count" },
];

function formatLastVisit(date) {
  if (!date) return "N/A";
  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 0 ? "Today" : `${diff} day${diff > 1 ? "s" : ""} ago`;
}

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [sortBy, setSortBy] = useState("nameAsc");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [addPatientLoading, setAddPatientLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    country: 'India',
    role: 'patient'
  });

  // Fetch patients from Firestore
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        
        const fetchedPatients = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown',
            initials: getInitials(data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim()),
            email: data.email || '',
            phone: data.phone || data.phoneNumber || '',
            lastVisit: data.lastVisit ? data.lastVisit.toDate() : null,
            status: data.status || 'active',
            documentsCount: data.documentsCount || 0,
            documents: data.documents || []
          };
        });
        
        setPatients(fetchedPatients);
        setError(null);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to fetch patients data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Helper function to generate initials
  const getInitials = (name) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle add patient form submission
  const handleAddPatient = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.email || !newPatient.phone) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPatient.email)) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid email address',
        severity: 'error'
      });
      return;
    }

    setAddPatientLoading(true);
    
    try {
      const patientData = {
        firstName: newPatient.firstName.trim(),
        lastName: newPatient.lastName.trim(),
        email: newPatient.email.trim().toLowerCase(),
        phone: newPatient.phone.trim(),
        password: newPatient.password || generateRandomPassword(),
        city: newPatient.city,
        country: newPatient.country,
        role: newPatient.role,
        status: 'active',
        documentsCount: 0,
        documents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'users'), patientData);
      
      // Update local state
      const newPatientForState = {
        id: docRef.id,
        name: `${patientData.firstName} ${patientData.lastName}`,
        initials: getInitials(`${patientData.firstName} ${patientData.lastName}`),
        email: patientData.email,
        phone: patientData.phone,
        lastVisit: null,
        status: patientData.status,
        documentsCount: patientData.documentsCount,
        documents: patientData.documents
      };
      
      setPatients(prev => [...prev, newPatientForState]);
      
      // Reset form and close dialog
      setNewPatient({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        city: 'SRINAGAR',
        country: 'India',
        role: 'patient'
      });
      setAddPatientOpen(false);
      
      setSnackbar({
        open: true,
        message: 'Patient added successfully!',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Error adding patient:', err);
      setSnackbar({
        open: true,
        message: 'Failed to add patient. Please try again.',
        severity: 'error'
      });
    } finally {
      setAddPatientLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setNewPatient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter and sort patients
  const filteredPatients = patients
    .filter((patient) => {
      if (
        searchTerm &&
        !patient.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (currentTab !== "all" && patient.status !== currentTab) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "nameAsc":
          return a.name.localeCompare(b.name);
        case "nameDesc":
          return b.name.localeCompare(a.name);
        case "lastVisit":
          if (!a.lastVisit) return 1;
          if (!b.lastVisit) return -1;
          return b.lastVisit.getTime() - a.lastVisit.getTime();
        case "documentsCount":
          return b.documentsCount - a.documentsCount;
        default:
          return 0;
      }
    });

  // Demo handlers
  const handleScheduleAppointment = (patientId) => {
    alert(`Scheduling new appointment for patient #${patientId}`);
  };
  const handleViewDocuments = (patientId) => {
    // Find the patient by id
    const patient = patients.find(p => p.id === patientId);
    if (patient && Array.isArray(patient.documents) && patient.documents.length > 0) {
      const firstDoc = patient.documents[0];
      if (firstDoc.url) {
        window.open(firstDoc.url, '_blank', 'noopener,noreferrer');
      }
    }
  };
  const handleContactPatient = (patientId, method) => {
    alert(`Contacting patient #${patientId} via ${method}`);
  };

  // Google Meet handler
  const handleGoogleMeet = (patientId, patientEmail) => {
    // Generate a Google Meet link (in a real app, you'd integrate with Google Calendar API)
    const meetingSubject = encodeURIComponent(`Medical Consultation - Patient ${patientId}`);
    const meetingBody = encodeURIComponent(`Online medical consultation session with patient: ${patientEmail}`);
    
    // Option 1: Open Google Calendar to create a new event with Meet
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${meetingSubject}&details=${meetingBody}&dates=${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    
    // Option 2: Direct Google Meet link (simplified)
    // const meetUrl = 'https://meet.google.com/new';
    
    window.open(calendarUrl, '_blank');
    
    // You could also show a snackbar notification
    setSnackbar({
      open: true,
      message: `Google Meet session initiated for ${patientEmail}`,
      severity: 'success'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading patients...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Error Loading Patients
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()} 
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <PeopleIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h5" fontWeight="bold">
            Patients
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ mt: { xs: 2, sm: 0 } }}
          onClick={() => setAddPatientOpen(true)}
        >
          Add New Patient
        </Button>
      </Box>

      {/* Search and Sort */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          variant="outlined"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          {sortOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(_, val) => setCurrentTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {tabOptions.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {/* Patients Grid */}
      <Grid container spacing={2}>
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <Grid key={patient.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <PatientCard
                patient={patient}
                onSchedule={handleScheduleAppointment}
                onViewDocuments={handleViewDocuments}
                onContact={handleContactPatient}
                onGoogleMeet={handleGoogleMeet}
              />
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                textAlign: "center",
                py: 8,
                bgcolor: "background.default",
                border: "1px dashed #ccc",
              }}
            >
              <PeopleIcon sx={{ fontSize: 48, color: "text.disabled", opacity: 0.5 }} />
              <Typography variant="h6" mt={2}>
                No patients found
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Add a new patient to get started"}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add Patient Dialog */}
      <Dialog 
        open={addPatientOpen} 
        onClose={() => setAddPatientOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Add New Patient
            <IconButton onClick={() => setAddPatientOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleAddPatient}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="First Name"
                  value={newPatient.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  value={newPatient.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Phone"
                  value={newPatient.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  margin="normal"
                  placeholder="+919368075651"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={newPatient.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={newPatient.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password (Optional - will be generated if empty)"
                  type="password"
                  value={newPatient.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  margin="normal"
                  helperText="Leave empty to auto-generate a secure password"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setAddPatientOpen(false)}
              disabled={addPatientLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="contained"
              disabled={addPatientLoading}
              startIcon={addPatientLoading ? <CircularProgress size={16} /> : <AddIcon />}
            >
              {addPatientLoading ? 'Adding...' : 'Add Patient'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// MUI PatientCard
function PatientCard({ patient, onSchedule, onViewDocuments, onContact, onGoogleMeet }) {
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
              {patient.initials}
            </Avatar>
            <Box>
              <Typography fontWeight="bold">{patient.name}</Typography>
              <Typography fontSize="small" variant="body2" color="text.secondary">
                {patient.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {patient.phone}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              color="primary"
              onClick={() => onContact(patient.id, "email")}
              aria-label="email"
            >
              <Email />
            </IconButton>
            <IconButton
              color="primary"
              onClick={() => onContact(patient.id, "phone")}
              aria-label="phone"
            >
              <Phone />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Status:{" "}
            <span
              style={{
                color:
                  patient.status === "active"
                    ? "#388e3c"
                    : patient.status === "pending"
                      ? "#fbc02d"
                      : "#757575",
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {patient.status}
            </span>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Docs: <b>{patient.documentsCount}</b>
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Last Visit: {patient.lastVisit ? formatLastVisit(patient.lastVisit) : "N/A"}
        </Typography>
      </CardContent>
      <CardActions
        sx={{
          py: 1,
          px: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            mx: "auto",
            width: "100%",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            size="small"
            color="primary"
            variant="outlined"
            startIcon={<Event />}
            onClick={() => onSchedule(patient.id)}
          >
            Schedule
          </Button>
          <Button
            size="small"
            color="primary"
            variant="outlined"
            startIcon={<DuoIcon />}
            onClick={() => onGoogleMeet(patient.id, patient.email)}
          >
            Meet
          </Button>
          <Button
            size="small"
            color="info"
            variant="outlined"
            startIcon={<Description />}
            onClick={() => onViewDocuments(patient.id)}
          >
            Documents
          </Button>
        </Box>
      </CardActions>

      {/* View All Documents Toggle Button */}
      <Box sx={{ mt: 1, mb: 1 }} mx="auto">
        <Button
          size="small"
          startIcon={<Description />}
          endIcon={documentsExpanded ? <ExpandLess /> : <ExpandMore />}
          onClick={() => setDocumentsExpanded((prev) => !prev)}
        >
          {documentsExpanded ? "Hide Documents" : "View All Documents"}
        </Button>

        {/* Collapsible Documents Section */}
        <Collapse in={documentsExpanded}>
          <Box mt={2}>
            {patient.documents && patient.documents.length > 0 ? (
              patient.documents.map((doc, index) => (
                <Box
                  key={doc.id || index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  px={2}
                  py={1}
                  mb={1}
                  sx={{ backgroundColor: "#f9f9f9", borderRadius: 1 }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {doc.title || doc.name || 'Untitled Document'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {(doc.type || 'document').toUpperCase()} • Uploaded{" "}
                    </Typography>
                  </Box>
                  {doc.url ? (
                    <Button
                      variant="contained"
                      color="info"
                      size="small"
                      onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                    >
                      View Document
                    </Button>
                  ) : null}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" mt={2}>
                No documents available
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
    </Card>
  );
}

export default Patients;