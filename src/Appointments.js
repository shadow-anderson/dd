import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { 
  Tabs, Tab, Box, TextField, Button, Card, CardContent, CardActions, Chip,
  Typography, IconButton, Collapse, Divider, Tooltip
} from '@mui/material';
import { ExpandMore, Phone, VideoCall, Notifications } from '@mui/icons-material';

const appointmentTabs = ['all', 'upcoming', 'today', 'completed', 'cancelled'];

const AppointmentCard = ({ appointment, onExpand, expanded, onDelete, onGenerateMeet }) => (
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

        <Tooltip title={`Notifications ${appointment.notification_status}`}>
          <IconButton size="small" sx={{ bgcolor: 'background.paper' }}>
            <Notifications color={appointment.notification_status === 'pending' ? 'action' : 'success'} />
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
          {appointment.duration} mins
        </Box>
      </Typography>
    </CardContent>

    <CardActions disableSpacing sx={{ justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">
        Booked via {appointment.booking_method}
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
          <Button 
            variant="contained"
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Update
          </Button>
        </Box>
      </CardContent>
    </Collapse>
  </Card>
);

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      let q = query(collection(db, 'appointments'));
      
      if (selectedTab !== 'all') {
        q = query(q, where('status', '==', selectedTab));
      }
      
      const snapshot = await getDocs(q);
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchAppointments();
  }, [selectedTab]);

  // Update the new appointment handler
  const handleNewAppointment = async () => {
    const newAppointment = {
      patient_name: 'New Patient',
      phone: '+1234567890',
      date: new Date().toISOString(),
      time: '10:00 AM',
      duration: 30,
      status: 'upcoming',
      symptoms: '',
      doctor_notes: '',
      created_at: new Date().toISOString(),
      notification_status: 'pending',
      booking_method: 'online', // Add this line
      metadata: {
        ip_address: '',
        device_info: ''
      }
    };
  
    const docRef = await addDoc(collection(db, 'appointments'), newAppointment);
    setAppointments([...appointments, { id: docRef.id, ...newAppointment }]);
  };

  const handleGenerateMeet = async (appointmentId) => {
    try {
      // Call Firebase Cloud Function
      const response = await fetch('https://your-cloud-function-url/generateMeetLink', {
        method: 'POST',
        body: JSON.stringify({ appointmentId })
      });
      
      const { meetLink } = await response.json();
      await updateDoc(doc(db, 'appointments', appointmentId), { gmeet_link: meetLink });
      setAppointments(appointments.map(app => 
        app.id === appointmentId ? { ...app, gmeet_link: meetLink } : app
      ));
    } catch (error) {
      console.error('Meet generation failed:', error);
    }
  };

  const handleDelete = async (appointmentId) => {
    await deleteDoc(doc(db, 'appointments', appointmentId));
    setAppointments(appointments.filter(app => app.id !== appointmentId));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
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

      {appointments.length === 0 ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight={200}
          sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}
        >
          <Typography color="text.secondary">
            No appointments found
          </Typography>
        </Box>
      ) : (
        appointments
          .filter(app => 
            (app.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.phone?.includes(searchQuery)) ?? false
          )
          .map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              expanded={expandedId === appointment.id}
              onExpand={setExpandedId}
              onDelete={handleDelete}
              onGenerateMeet={handleGenerateMeet}
            />
          ))
      )}
    </Box>
  );
}
