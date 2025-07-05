import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { 
  Tabs, Tab, Box, TextField, Button, Card, CardContent, CardActions, Chip,
  Typography, IconButton, Collapse, Divider, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { ExpandMore, Phone, VideoCall, Notifications, Email, } from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const appointmentTabs = ['all', 'pending', 'today', 'confirmed', 'completed', 'cancelled'];

// Appointmentcard Component
const AppointmentCard = ({ appointment, onExpand, expanded, onDelete, onGenerateMeet, onUpdateStatus }) => (
  <Card sx={{ mb: 2, boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{appointment.patientName}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            ID: {appointment.id.slice(0, 8)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {appointment.doctorName} - {appointment.clinicName}
          </Typography>
        </Box>
        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
          <Chip
            label={appointment.status}
            color={
              appointment.status === 'completed' ? 'success' :
              appointment.status === 'cancelled' ? 'error' :
              appointment.status === 'confirmed' ? 'info' :
              appointment.status === 'pending' ? 'warning' : 'primary'
            }
            sx={{ borderRadius: 1, textTransform: 'capitalize' }}
          />
          <Chip
            label={appointment.type}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />
        </Box>
      </Box>
      
      <Box display="flex" alignItems="center" mt={3} gap={2} flexWrap="wrap">
        <Tooltip title="Phone number">
          <Button 
            startIcon={<Phone />}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2 }}
            href={`tel:${appointment.patientPhone}`}
          >
            {appointment.patientPhone}
          </Button>
        </Tooltip>

        <Tooltip title="Email">
          <Button 
            startIcon={<Email />}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2 }}
            href={`mailto:${appointment.patientEmail}`}
          >
            Email
          </Button>
        </Tooltip>
        
        {!appointment.gmeet_link ? (
          <Button
            variant="contained"
            startIcon={<VideoCall />}
            onClick={() => onGenerateMeet(appointment.id)}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Create Meet
          </Button>
        ) : (
          <Button
            variant="outlined"
            startIcon={<VideoCall />}
            href={appointment.gmeet_link}
            target="_blank"
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Join Meet
          </Button>
        )}

        <Tooltip title={`Email ${appointment.emailSent ? 'sent' : 'pending'}`}>
          <IconButton size="small" sx={{ bgcolor: 'background.paper' }}>
            <Notifications color={appointment.emailSent ? 'success' : 'action'} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography 
        variant="body2" 
        color="text.secondary" 
        mt={2}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
      >
        <Box component="span" sx={{ fontWeight: 'medium' }}>
          {appointment.appointmentDate}
        </Box>
        -
        <Box component="span" sx={{ color: 'primary.main' }}>
          {appointment.appointmentTime}
        </Box>
        <Box component="span" sx={{ bgcolor: 'grey.100', px: 1, borderRadius: 1 }}>
          {appointment.duration || 30} mins
        </Box>
        <Box component="span" sx={{ bgcolor: 'info.light', color: 'info.contrastText', px: 1, borderRadius: 1 }}>
          {appointment.treatmentType}
        </Box>
      </Typography>
    </CardContent>

    <CardActions disableSpacing sx={{ justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">
        {appointment.type} appointment
      </Typography>
      <IconButton 
        onClick={() => onExpand(appointment.id)}
        sx={{ 
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.3s'
        }}
      >
        <ExpandMore />
      </IconButton>
    </CardActions>

    <Collapse in={expanded} timeout={300}>
      <CardContent sx={{ 
        bgcolor: 'grey.50',
        '& .MuiTypography-paragraph': {
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          mb: 2
        }
      }}>
        <Typography paragraph>
          <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Patient Email:</Box>
          <Box component="span" sx={{ ml: 1 }}>{appointment.patientEmail}</Box>
        </Typography>
        <Typography paragraph>
          <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Symptoms:</Box>
          <Box component="span" sx={{ ml: 1 }}>
            {Array.isArray(appointment.symptoms) 
              ? appointment.symptoms.join(', ') 
              : appointment.symptoms || 'No symptoms recorded'
            }
          </Box>
        </Typography>
        <Typography paragraph>
          <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Notes:</Box>
          <Box component="span" sx={{ ml: 1 }}>{appointment.notes || 'No notes available'}</Box>
        </Typography>
        <Typography paragraph>
          <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Treatment Type:</Box>
          <Box component="span" sx={{ ml: 1, textTransform: 'capitalize' }}>{appointment.treatmentType}</Box>
        </Typography>
        {appointment.emailSent && (
          <Typography paragraph>
            <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Email Status:</Box>
            <Box component="span" sx={{ ml: 1, color: 'success.main' }}>
              Sent at {appointment.emailSentAt?.toDate?.()?.toLocaleString() || 'Unknown time'}
            </Box>
          </Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Box display="flex" justifyContent="flex-end" gap={1} flexWrap="wrap">
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => onDelete(appointment.id)}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
          {appointment.status === 'pending' && (
            <Button 
              variant="contained"
              color="info"
              onClick={() => onUpdateStatus(appointment.id, 'confirmed')}
              size="small"
              sx={{ borderRadius: 2 }}
            >
              Confirm
            </Button>
          )}
          {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
            <Button 
              variant="contained"
              color="success"
              onClick={() => onUpdateStatus(appointment.id, 'completed')}
              size="small"
              sx={{ borderRadius: 2 }}
            >
              Mark Complete
            </Button>
          )}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button 
              variant="outlined"
              color="warning"
              onClick={() => onUpdateStatus(appointment.id, 'cancelled')}
              size="small"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </CardContent>
    </Collapse>
  </Card>
);

// Main Appointments Component
const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    appointmentDate: null,
    appointmentTime: '',
    duration: 30,
    symptoms: '',
    notes: '',
    treatmentType: 'general',
    type: 'in-person',
    status: 'pending',
    doctorName: 'Dr. John Doe',
    doctorId: 'IPtAhVqKBBw5eUO03Rhb',
    clinicName: 'Main Clinic',
    clinicId: 'clinic1',
    emailSent: false
  });

  const treatmentTypes = ['general', 'hair', 'skin', 'dental', 'orthopedic', 'cardiology', 'neurology'];
  const appointmentTypes = ['in-person', 'online', 'home-visit'];

  useEffect(() => {
    fetchAppointments();
  }, [selectedTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // console.log('Fetching appointments for tab:', selectedTab);
      
      let appointmentsQuery;
      
      if (selectedTab === 'all') {
        appointmentsQuery = collection(db, 'appointments');
      } else if (selectedTab === 'today') {
        appointmentsQuery = collection(db, 'appointments');
      } else {
        appointmentsQuery = query(
          collection(db, 'appointments'), 
          where('status', '==', selectedTab)
        );
      }
      
      const snapshot = await getDocs(appointmentsQuery);
      console.log('Firestore snapshot size:', snapshot.size);
      
      const appointmentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        // console.log('Appointment data:', { id: doc.id, ...data });
        return { id: doc.id, ...data };
      });
      
      // Handle today's appointments
      if (selectedTab === 'today') {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointmentsData.filter(app => {
          if (!app.appointmentDate) return false;
          return app.appointmentDate === today;
        });
        setAppointments(todayAppointments);
      } else {
        setAppointments(appointmentsData);
      }
      
      // console.log('Final appointments set:', appointmentsData.length);
    } catch (error) {
      // console.error('Error fetching appointments:', error);
      // console.error('Error code:', error.code);
      // console.error('Error message:', error.message);
      alert(`Error loading appointments: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    // console.log('Date selected:', date);
    // Format date as YYYY-MM-DD to match your existing format
    const formattedDate = date ? date.toISOString().split('T')[0] : null;
    setAppointmentData(prev => ({ ...prev, appointmentDate: formattedDate }));
  };

  const handleNewAppointment = () => {
    setOpenForm(true);
  };

  const resetForm = () => {
    setAppointmentData({
      patientName: '',
      patientEmail: '',
      patientPhone: '',
      appointmentDate: null,
      appointmentTime: '',
      duration: 30,
      symptoms: '',
      notes: '',
      treatmentType: 'general',
      type: 'in-person',
      status: 'pending',
      doctorName: 'Dr. John Doe',
      doctorId: 'IPtAhVqKBBw5eUO03Rhb',
      clinicName: 'Main Clinic',
      clinicId: 'clinic1',
      emailSent: false
    });
  };

  const submitAppointment = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!appointmentData.appointmentDate || !appointmentData.patientName || !appointmentData.appointmentTime || !appointmentData.patientPhone || !appointmentData.patientEmail) {
      alert('Please fill all required fields (Name, Email, Phone, Date, Time)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(appointmentData.patientEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(appointmentData.patientPhone.replace(/\s/g, ''))) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      // console.log('Starting appointment creation...');
      // console.log('Form data:', appointmentData);
      
      // Generate a unique ID for the appointment (optional, Firestore will generate one)
      const appointmentId = `APT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare appointment data to match your existing schema
      const newAppointment = {
        id: appointmentId,
        patientName: appointmentData.patientName.trim(),
        patientEmail: appointmentData.patientEmail.trim().toLowerCase(),
        patientPhone: appointmentData.patientPhone.trim(),
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        duration: Number(appointmentData.duration) || 30,
        symptoms: appointmentData.symptoms.trim() ? [appointmentData.symptoms.trim()] : [],
        notes: appointmentData.notes.trim(),
        treatmentType: appointmentData.treatmentType,
        type: appointmentData.type,
        status: appointmentData.status,
        doctorName: appointmentData.doctorName,
        doctorId: appointmentData.doctorId,
        clinicName: appointmentData.clinicName,
        clinicId: appointmentData.clinicId,
        emailSent: false,
        emailResponseId: null,
        emailSentAt: null,
        hasUploadedFiles: false,
        medicalRecords: [],
        availabilityId: null,
        userId: null, // You might want to get this from authentication
        isDevelopmentEnvironment: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // console.log('Appointment data to save:', newAppointment);
      
      // Add to Firestore
      const appointmentsCollection = collection(db, 'appointments');
      // console.log('Collection reference:', appointmentsCollection);
      
      const docRef = await addDoc(appointmentsCollection, newAppointment);
      // console.log('Document written with ID:', docRef.id);
      
      // Add to local state immediately
      const createdAppointment = { id: docRef.id, ...newAppointment };
      setAppointments(prev => [createdAppointment, ...prev]);
      
      // Close form and reset
      setOpenForm(false);
      resetForm();
      
      alert('Appointment scheduled successfully!');
      
      // Refresh the appointments list
      await fetchAppointments();
      
    } catch (error) {
      // console.error('Detailed error creating appointment:', error);
      // console.error('Error code:', error.code);
      // console.error('Error message:', error.message);
      // console.error('Error stack:', error.stack);
      
      let errorMessage = 'Error creating appointment: ';
      
      switch (error.code) {
        case 'permission-denied':
          errorMessage += 'Permission denied. Please check your Firestore security rules.';
          break;
        case 'unavailable':
          errorMessage += 'Service unavailable. Please check your internet connection.';
          break;
        case 'invalid-argument':
          errorMessage += 'Invalid data provided. Please check your input.';
          break;
        case 'not-found':
          errorMessage += 'Database not found. Please check your Firebase configuration.';
          break;
        case 'unauthenticated':
          errorMessage += 'Authentication required. Please sign in.';
          break;
        default:
          errorMessage += error.message || 'Unknown error occurred.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMeet = async (appointmentId) => {
    try {
      // Generate a mock Google Meet link 
      const meetLink = `https://meet.google.com/abc-defg-hij?appointmentId=${appointmentId}`;
      
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, { 
        gmeet_link: meetLink,
        emailSent: true,
        emailSentAt: new Date(),
        updatedAt: new Date()
      });
      
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId 
          ? { ...app, gmeet_link: meetLink, emailSent: true, emailSentAt: new Date() } 
          : app
      ));
      
      alert('Google Meet link generated successfully!');
    } catch (error) {
      // console.error('Meet generation failed:', error);
      alert(`Error generating Meet link: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, { 
        status: newStatus,
        updatedAt: new Date()
      });
      
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId 
          ? { ...app, status: newStatus, updatedAt: new Date() } 
          : app
      ));
      
      alert(`Appointment ${newStatus} successfully!`);
    } catch (error) {
      // console.error('Error updating appointment:', error);
      alert(`Error updating appointment: ${error.message}`);
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await deleteDoc(appointmentRef);
      
      setAppointments(prev => prev.filter(app => app.id !== appointmentId));
      alert('Appointment deleted successfully!');
    } catch (error) {
      // console.error('Error deleting appointment:', error);
      alert(`Error deleting appointment: ${error.message}`);
    }
  };

  const filteredAppointments = appointments.filter(app => 
    (app.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.patientPhone?.includes(searchQuery) ||
    app.patientEmail?.toLowerCase().includes(searchQuery.toLowerCase())) ?? false
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>

      <Box
  display="flex"
  flexDirection={{ xs: 'column', md: 'row' }}
  alignItems={{ xs: 'stretch', md: 'center' }}
  justifyContent="space-between"
  gap={2}
  mb={4}
>
  {/* Tabs */}
  <Tabs
    value={selectedTab}
    onChange={(e, newValue) => setSelectedTab(newValue)}
    variant="scrollable"
    scrollButtons="auto"
    sx={{
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: 1,
      px: 2,
      '& .MuiTab-root': {
        textTransform: 'capitalize',
        fontWeight: 500,
        fontSize: '0.95rem',
        color: 'text.secondary',
        minWidth: 'auto',
        px: 2,
        '&.Mui-selected': {
          color: 'primary.main',
          fontWeight: 600,
        },
      },
      '& .MuiTabs-indicator': {
        height: 3,
        borderRadius: 2,
        backgroundColor: 'primary.main',
      },
    }}
  >
    {appointmentTabs.map((tab) => (
      <Tab key={tab} label={tab} value={tab} />
    ))}
  </Tabs>

  {/* Actions */}
  <Box
    display="flex"
    flexWrap="wrap"
    gap={1.5}
    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
    alignItems="center"
  >
    <TextField
      size="small"
      placeholder="Search patients..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      sx={{
        minWidth: 220,
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        },
      }}
    />
    <Button
      variant="contained"
      onClick={handleNewAppointment}
      sx={{
        borderRadius: 2,
        px: 3,
        textTransform: 'none',
        fontWeight: 500,
      }}
      disabled={loading}
    >
      + New Appointment
    </Button>
    
  </Box>
</Box>

      {/* Appointment Form Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>Schedule New Appointment</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box component="form" onSubmit={submitAppointment} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Patient Full Name"
                name="patientName"
                value={appointmentData.patientName}
                onChange={handleInputChange}
                margin="normal"
                required
                error={!appointmentData.patientName && appointmentData.patientName !== ''}
                helperText={!appointmentData.patientName && appointmentData.patientName !== '' ? 'Patient name is required' : ''}
              />

              <TextField
                fullWidth
                label="Patient Email"
                name="patientEmail"
                type="email"
                value={appointmentData.patientEmail}
                onChange={handleInputChange}
                margin="normal"
                required
                error={!appointmentData.patientEmail && appointmentData.patientEmail !== ''}
                helperText={!appointmentData.patientEmail && appointmentData.patientEmail !== '' ? 'Email is required' : ''}
                placeholder="patient@example.com"
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="patientPhone"
                value={appointmentData.patientPhone}
                onChange={handleInputChange}
                margin="normal"
                required
                error={!appointmentData.patientPhone && appointmentData.patientPhone !== ''}
                helperText={!appointmentData.patientPhone && appointmentData.patientPhone !== '' ? 'Phone number is required' : ''}
                placeholder="+919368075651"
              />

              <DatePicker
                label="Appointment Date"
                value={appointmentData.appointmentDate ? new Date(appointmentData.appointmentDate) : null}
                onChange={handleDateChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                    required
                    error={!appointmentData.appointmentDate}
                    helperText={!appointmentData.appointmentDate ? 'Date is required' : ''}
                  />
                )}
                minDate={new Date()}
              />

              <TextField
                fullWidth
                type="time"
                label="Appointment Time"
                name="appointmentTime"
                value={appointmentData.appointmentTime}
                onChange={handleInputChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
                error={!appointmentData.appointmentTime && appointmentData.appointmentTime !== ''}
                helperText={!appointmentData.appointmentTime && appointmentData.appointmentTime !== '' ? 'Time is required' : ''}
              />

              <TextField
                fullWidth
                label="Duration (minutes)"
                name="duration"
                type="number"
                value={appointmentData.duration}
                onChange={handleInputChange}
                margin="normal"
                inputProps={{ min: 15, max: 180, step: 15 }}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Treatment Type</InputLabel>
                <Select
                  name="treatmentType"
                  value={appointmentData.treatmentType}
                  onChange={handleInputChange}
                  label="Treatment Type"
                >
                  {treatmentTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  name="type"
                  value={appointmentData.type}
                  onChange={handleInputChange}
                  label="Appointment Type"
                >
                  {appointmentTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Symptoms"
                name="symptoms"
                value={appointmentData.symptoms}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={3}
                placeholder="Describe the patient's symptoms..."
              />

              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={appointmentData.notes}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={3}
                placeholder="Any additional notes..."
              />

              <TextField
                fullWidth
                label="Doctor Name"
                name="doctorName"
                value={appointmentData.doctorName}
                onChange={handleInputChange}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Clinic Name"
                name="clinicName"
                value={appointmentData.clinicName}
                onChange={handleInputChange}
                margin="normal"
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {setOpenForm(false); resetForm();}} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={submitAppointment} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Scheduling...' : 'Schedule Appointment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Appointments List */}
      {loading ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight={200}
          sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}
        >
          <Typography color="text.secondary">
            Loading appointments...
          </Typography>
        </Box>
      ) : filteredAppointments.length === 0 ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight={200}
          sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}
        >
          <Typography color="text.secondary">
            {searchQuery ? 'No appointments found matching your search' : 'No appointments found'}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
          </Typography>
          {filteredAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              expanded={expandedId === appointment.id}
              onExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onDelete={handleDelete}
              onGenerateMeet={handleGenerateMeet}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </>
      )}
    </Box>
  );
};

export default Appointments;