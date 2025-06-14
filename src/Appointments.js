import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Container, Grid,
  Paper, Typography, useTheme, useMediaQuery, TextField,
  Tabs, Tab, IconButton, Collapse
} from '@mui/material';
import { format } from 'date-fns';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

const Appointments = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'

  useEffect(() => {
    // Fetch appointments from Firestore
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      // Implement Firestore fetch logic here
      // For now, using dummy data
      const dummyData = [
        {
          id: '1',
          patient_name: 'John Doe',
          status: 'upcoming',
          phone: '+1234567890',
          gmeet_link: 'https://meet.google.com/abc',
          date: '2024-01-20',
          time: '10:00',
          duration: 30,
          symptoms: 'Fever, headache',
          doctor_notes: 'Regular checkup needed',
          notification_status: 'sent',
          created_at: new Date().toISOString()
        }
        // Add more dummy appointments as needed
      ];
      setAppointments(dummyData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleExpandCard = (appointmentId) => {
    setExpandedCard(expandedCard === appointmentId ? null : appointmentId);
  };

  const handleCreateAppointment = () => {
    // Implement appointment creation logic
    console.log('Create new appointment');
  };

  const getStatusColor = (status) => {
    const statusColors = {
      upcoming: 'primary',
      completed: 'success',
      cancelled: 'error',
    };
    return statusColors[status] || 'default';
  };

  const renderAppointmentCard = (appointment) => {
    const isExpanded = expandedCard === appointment.id;

    return (
      <Card key={appointment.id} sx={{ mb: 2, overflow: 'visible' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="h6" component="h3">
                {appointment.patient_name}
              </Typography>
              <Chip
                label={appointment.status.toUpperCase()}
                color={getStatusColor(appointment.status)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarTodayIcon fontSize="small" />
                <Typography>
                  {format(new Date(appointment.date), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <ScheduleIcon fontSize="small" />
                <Typography>
                  {appointment.time} ({appointment.duration} mins)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box display="flex" gap={1} justifyContent="flex-end">
                <IconButton
                  href={`tel:${appointment.phone}`}
                  color="primary"
                  size="small"
                >
                  <PhoneIcon />
                </IconButton>
                <IconButton
                  href={appointment.gmeet_link}
                  target="_blank"
                  color="primary"
                  size="small"
                >
                  <VideocamIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleExpandCard(appointment.id)}
                  sx={{
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s'
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          <Collapse in={isExpanded}>
            <Box mt={2} pt={2} borderTop={1} borderColor="divider">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Symptoms
                  </Typography>
                  <Typography>{appointment.symptoms}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Doctor Notes
                  </Typography>
                  <Typography>{appointment.doctor_notes}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Appointments
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAppointment}
          >
            New Appointment
          </Button>
          <IconButton
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          >
            {viewMode === 'list' ? <CalendarTodayIcon /> : <EventAvailableIcon />}
          </IconButton>
        </Box>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab label="All" />
          <Tab label="Upcoming" />
          <Tab label="Today" />
          <Tab label="Completed" />
          <Tab label="Cancelled" />
        </Tabs>
      </Paper>

      <Box mb={4}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by patient name or contact"
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      <Box>
        {appointments.map(renderAppointmentCard)}
      </Box>
    </Container>
  );
};

export default Appointments;