import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { 
  Tabs, Tab, Box, TextField, Button, Card, CardContent, CardActions, Chip,
  Typography, IconButton, Collapse, Divider, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import { ExpandMore, Phone, VideoCall, Notifications } from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const appointmentTabs = ['all', 'upcoming', 'today', 'completed', 'cancelled'];

// AppointmentCard Component
const AppointmentCard = ({ appointment, onExpand, expanded, onDelete, onGenerateMeet, onUpdateStatus }) => (
  <Card sx={{ mb: 2, boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{appointment.patient_name}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            ID: {appointment.id.slice(0, 8)}
          </Typography>
        </Box>
        <Chip
          label={appointment.status}
          color={
            appointment.status === 'completed' ? 'success' :
            appointment.status === 'cancelled' ? 'error' :
            appointment.status === 'upcoming' ? 'warning' : 'primary'
          }
          sx={{ borderRadius: 1, textTransform: 'capitalize' }}
        />
      </Box>
      
      <Box display="flex" alignItems="center" mt={3} gap={2}>
        <Tooltip title="Phone number">
          <Button 
            startIcon={<Phone />}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2 }}
            href={`tel:${appointment.phone}`}
          >
            {appointment.phone}
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

        <Tooltip title={`Notifications ${appointment.notification_status || 'pending'}`}>
          <IconButton size="small" sx={{ bgcolor: 'background.paper' }}>
            <Notifications color={appointment.notification_status === 'sent' ? 'success' : 'action'} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography 
        variant="body2" 
        color="text.secondary" 
        mt={2}
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Box component="span" sx={{ fontWeight: 'medium' }}>
          {new Date(appointment.date).toLocaleDateString()}
        </Box>
        -
        <Box component="span" sx={{ color: 'primary.main' }}>
          {appointment.time}
        </Box>
        <Box component="span" sx={{ bgcolor: 'grey.100', px: 1, borderRadius: 1 }}>
          {appointment.duration || 30} mins
        </Box>
      </Typography>
    </CardContent>

    <CardActions disableSpacing sx={{ justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">
        Booked via {appointment.booking_method || 'online'}
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
      <CardContent sx={{ bgcolor: 'grey.50' }}>
        <Typography paragraph>
          <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Symptoms:</Box>
          <Box component="span" sx={{ ml: 1 }}>{appointment.symptoms || 'No symptoms recorded'}</Box>
        </Typography>
        <Typography paragraph>
          <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Doctor Notes:</Box>
          <Box component="span" sx={{ ml: 1 }}>{appointment.doctor_notes || 'No notes available'}</Box>
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => onDelete(appointment.id)}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
          {appointment.status === 'upcoming' && (
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
          {appointment.status !== 'cancelled' && (
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
    patient_name: '',
    phone: '',
    date: null,
    time: '',
    duration: 30,
    symptoms: '',
    doctor_notes: '',
    status: 'upcoming',
    booking_method: 'online',
    notification_status: 'pending'
  });

  useEffect(() => {
    fetchAppointments();
  }, [selectedTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let q = collection(db, 'appointments');
      
      if (selectedTab !== 'all') {
        if (selectedTab === 'today') {
          const today = new Date().toISOString().split('T')[0];
          // For today tab, you might want to add additional filtering logic
          q = collection(db, 'appointments');
        } else {
          q = query(collection(db, 'appointments'), where('status', '==', selectedTab));
        }
      }
      
      const snapshot = await getDocs(q);
      const appointmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter for today's appointments if today tab is selected
      if (selectedTab === 'today') {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointmentsData.filter(app => {
          const appointmentDate = new Date(app.date).toISOString().split('T')[0];
          return appointmentDate === today;
        });
        setAppointments(todayAppointments);
      } else {
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      alert('Error loading appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAppointmentData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setAppointmentData(prev => ({ ...prev, date }));
  };

  const handleNewAppointment = () => {
    setOpenForm(true);
  };

  const resetForm = () => {
    setAppointmentData({
      patient_name: '',
      phone: '',
      date: null,
      time: '',
      duration: 30,
      symptoms: '',
      doctor_notes: '',
      status: 'upcoming',
      booking_method: 'online',
      notification_status: 'pending'
    });
  };

  const submitAppointment = async (e) => {
    e.preventDefault();
    
    if (!appointmentData.date || !appointmentData.patient_name || !appointmentData.time || !appointmentData.phone) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const newAppointment = {
        ...appointmentData,
        date: appointmentData.date.toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          ip_address: '',
          device_info: navigator.userAgent
        }
      };

      const docRef = await addDoc(collection(db, 'appointments'), newAppointment);
      const createdAppointment = { id: docRef.id, ...newAppointment };
      
      setAppointments(prev => [createdAppointment, ...prev]);
      setOpenForm(false);
      resetForm();
      
      alert('Appointment scheduled successfully!');
    } catch (error) {
      console.error('Appointment creation error:', error);
      alert('Error creating appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMeet = async (appointmentId) => {
    try {
      // Generate a mock Google Meet link (replace with actual Google Meet API integration)
      const meetLink = `https://meet.google.com/abc-defg-hij?appointmentId=${appointmentId}`;
      
      await updateDoc(doc(db, 'appointments', appointmentId), { 
        gmeet_link: meetLink,
        notification_status: 'sent'
      });
      
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId 
          ? { ...app, gmeet_link: meetLink, notification_status: 'sent' } 
          : app
      ));
      
      alert('Google Meet link generated successfully!');
    } catch (error) {
      console.error('Meet generation failed:', error);
      alert('Error generating Meet link');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), { 
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId 
          ? { ...app, status: newStatus, updated_at: new Date().toISOString() } 
          : app
      ));
      
      alert(`Appointment ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Error updating appointment status');
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
      setAppointments(prev => prev.filter(app => app.id !== appointmentId));
      alert('Appointment deleted successfully!');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Error deleting appointment');
    }
  };

  const filteredAppointments = appointments.filter(app => 
    (app.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.phone?.includes(searchQuery)) ?? false
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Appointment Management
      </Typography>

      <Box 
        display="flex" 
        justifyContent="space-between" 
        mb={3}
        sx={{ 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2
        }}
      >
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{ 
            '& .MuiTab-root': { textTransform: 'capitalize' },
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          {appointmentTabs.map(tab => (
            <Tab key={tab} label={tab} value={tab} />
          ))}
        </Tabs>
        
        <Box 
          display="flex" 
          gap={2}
          sx={{ 
            flexWrap: 'wrap',
            justifyContent: { xs: 'stretch', sm: 'flex-end' }
          }}
        >
          <TextField
            size="small"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <Button 
            variant="contained" 
            onClick={handleNewAppointment}
            sx={{ borderRadius: 2 }}
            disabled={loading}
          >
            New Appointment
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => alert('Calendar view coming soon!')}
            sx={{ borderRadius: 2 }}
          >
            Calendar View
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
                name="patient_name"
                value={appointmentData.patient_name}
                onChange={handleInputChange}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={appointmentData.phone}
                onChange={handleInputChange}
                margin="normal"
                required
              />

              <DatePicker
                label="Appointment Date"
                value={appointmentData.date}
                onChange={handleDateChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                minDate={new Date()}
              />

              <TextField
                fullWidth
                type="time"
                label="Appointment Time"
                name="time"
                value={appointmentData.time}
                onChange={handleInputChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />

              <TextField
                fullWidth
                label="Duration (minutes)"
                name="duration"
                type="number"
                value={appointmentData.duration}
                onChange={handleInputChange}
                margin="normal"
                inputProps={{ min: 15, max: 180 }}
              />

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
                label="Doctor Notes"
                name="doctor_notes"
                value={appointmentData.doctor_notes}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={3}
                placeholder="Any additional notes..."
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {setOpenForm(false); resetForm();}} disabled={loading}>
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
}

export default Appointments;