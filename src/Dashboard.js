import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Divider,
  Link,
  Button,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Fade,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Import Firestore functions
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';

import { db } from './firebase'; 

// Quick action buttons data (keeping this as static)
const quickActions = [
  { label: 'New Patient', icon: <PersonAddIcon />, color: '#4CAF50' },
  { label: 'Schedule', icon: <CalendarMonthIcon />, color: '#2196F3' },
  { label: 'Video Call', icon: <VideocamIcon />, color: '#9C27B0' },
  { label: 'Phone Call', icon: <PhoneIcon />, color: '#F44336' },
  { label: 'Generate Invoice', icon: <ReceiptLongIcon />, color: '#FF9800' },
  { label: 'Room Status', icon: <MeetingRoomIcon />, color: '#607D8B' },
];

// Doctor information (you might want to fetch this from Firestore too)
const doctorInfo = {
  name: 'Dr. Sarah Chen',
  role: 'Cardiologist',
  avatar: '/doctor-avatar.jpg', // Replace with actual avatar path
};

// Enhanced StatCard Component
const StatCard = ({ data, loading }) => {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          height: '100%',
          background: '#fff',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={40} />
      </Paper>
    );
  }
  
  return (
    <Fade in timeout={500}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          height: '100%',
          background: '#fff',
          transition: 'all 0.3s ease',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1),
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[4],
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box 
            sx={{ 
              color: theme.palette.primary.main,
              p: 1.5,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {data.icon}
          </Box>
          <IconButton size="small">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography 
          sx={{ 
            mb: 1, 
            fontWeight: 700,
            fontSize: '1.75rem',
            lineHeight: 1.2
          }}
        >
          {data.label === 'Revenue' ? `$${data.value.toLocaleString()}` : data.value.toLocaleString()}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            fontSize: '0.813rem'
          }}
        >
          {data.label}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              Progress
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              {data.progress}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={data.progress} 
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              }
            }}
          />
        </Box>

        {data.completed !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Chip
              size="small"
              label={`${data.completed} completed`}
              sx={{ mr: 1, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}
            />
            <Chip
              size="small"
              label={`${data.upcoming} upcoming`}
              sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}
            />
          </Box>
        )}

        {data.change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            {data.trend === 'up' ? (
              <Chip
                size="small"
                icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
                label={`+${data.change}%`}
                sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}
              />
            ) : (
              <Chip
                size="small"
                icon={<TrendingDownIcon sx={{ fontSize: 16 }} />}
                label={`${data.change}%`}
                sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {data.subtext}
            </Typography>
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

// Enhanced AppointmentCard Component with prominent Google Meet buttons
const AppointmentCard = ({ appointment }) => {
  const theme = useTheme();
  const [copySuccess, setCopySuccess] = useState(false);
  const [meetLinkCreated, setMeetLinkCreated] = useState(false);
  const [meetLink, setMeetLink] = useState('');
  
  const getAppointmentIcon = (type) => {
    switch (type) {
      case 'video':
        return <VideocamIcon sx={{ fontSize: 20 }} />;
      case 'phone':
        return <PhoneIcon sx={{ fontSize: 20 }} />;
      default:
        return <MeetingRoomIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'video':
        return theme.palette.success;
      case 'phone':
        return theme.palette.info;
      default:
        return theme.palette.warning;
    }
  };

  // Generates a Google Meet link 
const generateGoogleMeetLink = (appointmentId) => {
  
  let baseLink = 'https://meet.google.com/new';
  
  if (appointmentId) {
    baseLink += `?appointment=${appointmentId}`;
  }
  return baseLink;
};

  // Handle creating Google Meet link
  const handleCreateMeet = () => {
    const newMeetLink = generateGoogleMeetLink(appointment.id);
    setMeetLink(newMeetLink);
    setMeetLinkCreated(true);
    
  };

  // Handle joining Google Meet
  const handleJoinMeet = () => {
    if (meetLink) {
      window.open(meetLink, '_blank');
    } else {
      // Fallback - create new meeting
      const newMeetLink = generateGoogleMeetLink(appointment.id);
      window.open(newMeetLink, '_blank');
    }
  };

  // Handle start early button click (existing functionality)
  const handleStartEarly = () => {
    if (appointment.type === 'video') {
      const newMeetLink = generateGoogleMeetLink(appointment.id);
      window.open(newMeetLink, '_blank');
    } else if (appointment.type === 'phone') {
      // Handle phone call logic here
      if (appointment.patientPhone) {
        window.open(`tel:${appointment.patientPhone}`, '_self');
      } else {
        alert('Patient phone number not available');
      }
    }
  };

  // Handle copy Google Meet link
  const handleCopyMeetLink = async () => {
    try {
      const linkToCopy = meetLink || generateGoogleMeetLink(appointment.id);
      await navigator.clipboard.writeText(linkToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Check if appointment is within 30 minutes
  const isWithin30Minutes = () => {
    if (!appointment.appointmentDate || !appointment.appointmentTime) return false;
    
    try {
      const appointmentDateTime = new Date(`${appointment.appointmentDate} ${appointment.appointmentTime}`);
      const now = new Date();
      const diffMs = appointmentDateTime - now;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Allow start early if within 30 minutes or if appointment time has passed
      return diffMinutes <= 30;
    } catch (error) {
      console.error('Error checking appointment time:', error);
      return false;
    }
  };

  // Helper function to format time from string
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    // If it's already formatted, return as is
    if (timeString.includes(':')) return timeString;
    // If it's a number, format it
    return timeString;
  };

  // Helper function to format date from string
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Helper function to calculate time until appointment
  const getTimeUntilAppointment = (appointmentDate, appointmentTime) => {
    if (!appointmentDate || !appointmentTime) return 'N/A';
    
    try {
      // Create appointment datetime from date and time strings
      const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
      const now = new Date();
      const diffMs = appointmentDateTime - now;
      
      if (diffMs < 0) return 'Past due';
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } catch (error) {
      console.error('Error calculating time until appointment:', error);
      return 'N/A';
    }
  };

  // Helper function to get day name
  const getDayName = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const color = getTypeColor(appointment.type || 'in-person');

  return (
    <Fade in timeout={500}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          transition: 'all 0.3s ease',
          border: '1px solid',
          borderColor: alpha(color.main, 0.1),
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[2],
            borderColor: color.main,
          },
        }}
      >
        {/* Patient Info Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Avatar 
            sx={{ 
              bgcolor: alpha(color.main, 0.1),
              color: color.main,
              width: 48,
              height: 48,
              flexShrink: 0,
            }}
          >
            {getAppointmentIcon(appointment.type || 'in-person')}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              sx={{ 
                fontWeight: 600,
                fontSize: '0.938rem',
                lineHeight: 1.4,
                mb: 0.5
              }} 
              noWrap
            >
              {appointment.patientName || appointment.patient?.name || 'Unknown Patient'}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                size="small"
                label={(appointment.type || 'in-person').charAt(0).toUpperCase() + (appointment.type || 'in-person').slice(1)}
                sx={{
                  bgcolor: alpha(color.main, 0.1),
                  color: color.main,
                  borderRadius: 1.5,
                  height: 22,
                  fontSize: '0.75rem',
                }}
              />
              <Typography variant="body2" color="text.secondary" noWrap>
                {`${getDayName(appointment.appointmentDate)} • ${formatTime(appointment.appointmentTime)} • Starts in ${getTimeUntilAppointment(appointment.appointmentDate, appointment.appointmentTime)}`}
              </Typography>
            </Stack>
          </Box>
        </Box>

        {/* Actions Section - Improved UI */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1,
            borderTop: 1,
            borderColor: alpha(theme.palette.divider, 0.1),
            pt: 2,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Tooltip title="Reschedule appointment">
              <Button
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.text.primary, 0.1),
                  color: theme.palette.text.primary,
                  '&:hover': {
                    borderColor: theme.palette.text.primary,
                    bgcolor: alpha(theme.palette.text.primary, 0.05),
                  },
                }}
              >
                Reschedule
              </Button>
            </Tooltip>

            {/* Google Meet Button - Side by side with reschedule */}
            {!meetLinkCreated ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<VideocamIcon />}
                onClick={handleCreateMeet}
                sx={{
                  borderRadius: 2,
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  minWidth: 120,
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                }}
              >
                CREATE MEET
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={<VideocamIcon />}
                onClick={handleJoinMeet}
                sx={{
                  borderRadius: 2,
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  minWidth: 120,
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                }}
              >
                JOIN MEET
              </Button>
            )}

            {/* Copy Google Meet Link Button - Always visible when link is created */}
            {meetLinkCreated && (
              <Tooltip title={copySuccess ? "Link copied!" : "Copy Google Meet link"}>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                  onClick={handleCopyMeetLink}
                  sx={{
                    borderRadius: 2,
                    color: copySuccess ? theme.palette.success.main : theme.palette.text.secondary,
                    minWidth: 'auto',
                    px: 1,
                    fontSize: '0.75rem',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                    },
                  }}
                >
                  {copySuccess ? 'Copied!' : 'Copy Link'}
                </Button>
              </Tooltip>
            )}
          </Box>

          {/* Start Early Button for Phone Appointments */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {appointment.type === 'phone' && (
              <Tooltip title="Call patient now">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PhoneIcon />}
                  onClick={handleStartEarly}
                  sx={{
                    borderRadius: 2,
                    bgcolor: color.main,
                    minWidth: 'auto',
                    '&:hover': {
                      bgcolor: color.dark,
                    },
                  }}
                >
                  Call Now
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Google Meet Link Display - Always visible when link is created */}
        {meetLinkCreated && (
          <Box 
            sx={{ 
              mt: 1,
              p: 1.5,
              bgcolor: alpha(theme.palette.success.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Google Meet Link:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: theme.palette.success.dark,
              }}
            >
              {meetLink}
            </Typography>
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

// Enhanced QuickActionButton Component
const QuickActionButton = ({ action }) => {
  const theme = useTheme();
  
  return (
    <Fade in timeout={500}>
      <Button
        variant="outlined"
        startIcon={action.icon}
        endIcon={<ArrowForwardIcon />}
        sx={{
          p: 2,
          borderRadius: 3,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          gap: 1,
          flex: '1 1 calc(33.333% - 16px)',
          minWidth: { xs: 'calc(50% - 8px)', md: 'calc(33.333% - 16px)' },
          borderColor: alpha(action.color, 0.3),
          color: action.color,
          bgcolor: alpha(action.color, 0.02),
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: action.color,
            bgcolor: alpha(action.color, 0.08),
            boxShadow: `0 4px 12px ${alpha(action.color, 0.15)}`,
          },
        }}
      >
        {action.label}
      </Button>
    </Fade>
  );
};

const Dashboard = ({ onNavigateToAppointments }) => {
  const theme = useTheme();
  const mainBlue = theme.palette.primary.main;
  
  // State for dashboard data
  const [dashboardStats, setDashboardStats] = useState({});
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data from Firestore
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch total patients from /users collection
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalPatients = usersSnapshot.size;

        // Fetch appointments for the next 3 days from /appointments collection
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const threeDaysFromNow = new Date(todayStart);
        threeDaysFromNow.setDate(todayStart.getDate() + 3);

        // Format dates as strings for comparison (assuming appointmentDate is stored as string)
        const todayString = todayStart.toISOString().split('T')[0];
        const threeDaysString = threeDaysFromNow.toISOString().split('T')[0];

        console.log('Fetching appointments between:', todayString, 'and', threeDaysString);

        // Fetch all appointments since we need to filter by appointmentDate (string field)
        const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
        const allAppointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('All appointments:', allAppointments);

        // Filter appointments for the next 3 days
        const upcomingAppointmentsData = allAppointments.filter(appointment => {
          if (!appointment.appointmentDate) return false;
          
          const appointmentDate = new Date(appointment.appointmentDate);
          const appointmentDateString = appointmentDate.toISOString().split('T')[0];
          
          return appointmentDateString >= todayString && appointmentDateString <= threeDaysString;
        });

        console.log('Filtered upcoming appointments:', upcomingAppointmentsData);

        // Sort by date and time
        upcomingAppointmentsData.sort((a, b) => {
          const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime || '00:00'}`);
          const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime || '00:00'}`);
          return dateA - dateB;
        });

        // Get today's appointments for stats
        const todayAppointments = allAppointments.filter(appointment => {
          if (!appointment.appointmentDate) return false;
          const appointmentDate = new Date(appointment.appointmentDate);
          const appointmentDateString = appointmentDate.toISOString().split('T')[0];
          return appointmentDateString === todayString;
        });

        // Calculate completed and upcoming appointments for today
        const now = new Date();
        const completedAppointments = todayAppointments.filter(apt => {
          if (!apt.appointmentDate || !apt.appointmentTime) return false;
          const appointmentDateTime = new Date(`${apt.appointmentDate} ${apt.appointmentTime}`);
          return appointmentDateTime < now;
        }).length;

        const upcomingTodayCount = todayAppointments.filter(apt => {
          if (!apt.appointmentDate || !apt.appointmentTime) return false;
          const appointmentDateTime = new Date(`${apt.appointmentDate} ${apt.appointmentTime}`);
          return appointmentDateTime >= now;
        }).length;

        // Fetch all appointments for this week to calculate documents/revenue
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        const weekStartString = weekStart.toISOString().split('T')[0];
        const weekEndString = weekEnd.toISOString().split('T')[0];

        const weekAppointments = allAppointments.filter(appointment => {
          if (!appointment.appointmentDate) return false;
          const appointmentDate = new Date(appointment.appointmentDate);
          const appointmentDateString = appointmentDate.toISOString().split('T')[0];
          return appointmentDateString >= weekStartString && appointmentDateString <= weekEndString;
        });

        // Fetch documents from /documents collection
        const documentsSnapshot = await getDocs(collection(db, 'documents'));
        const documentsCount = documentsSnapshot.size;

        // Calculate mock revenue (you might want to add actual revenue field to appointments)
        const weekRevenue = weekAppointments.length * 150; // Assuming $150 per appointment

        // Set dashboard stats
        setDashboardStats({
          totalPatients: {
            value: totalPatients,
            change: 12, // You might want to calculate this from historical data
            trend: 'up',
            icon: <PersonOutlineIcon />,
            label: 'Total Patients',
            subtext: 'vs last month',
            progress: Math.min((totalPatients / 300) * 100, 100) // Assuming target of 300 patients
          },
          appointments: {
            value: todayAppointments.length,
            completed: completedAppointments,
            upcoming: upcomingTodayCount,
            icon: <AccessTimeIcon />,
            label: "Today's Appointments",
            subtext: 'completed, upcoming',
            progress: todayAppointments.length > 0 ? (completedAppointments / todayAppointments.length) * 100 : 0
          },
          documents: {
            value: documentsCount,
            icon: <ArticleOutlinedIcon />,
            label: 'New Documents',
            subtext: 'This week',
            progress: Math.min((documentsCount / 20) * 100, 100) // Assuming target of 20 documents per week
          },
          revenue: {
            value: weekRevenue,
            change: 8, // You might want to calculate this from historical data
            trend: 'up',
            icon: <MonetizationOnOutlinedIcon />,
            label: 'Revenue',
            subtext: 'vs last month',
            progress: Math.min((weekRevenue / 10000) * 100, 100) // Assuming target of $10,000 per week
          }
        });

        // For each appointment, fetch the patient details from /users collection
        const appointmentsWithPatientDetails = await Promise.all(
          upcomingAppointmentsData.slice(0, 6).map(async (apt) => { // Show up to 6 appointments
            if (apt.patientId) {
              try {
                // Query users collection to find patient by ID
                const usersQuery = query(
                  collection(db, 'users'), 
                  where('__name__', '==', apt.patientId) // Use document ID to match
                );
                const usersSnapshot = await getDocs(usersQuery);
                
                if (!usersSnapshot.empty) {
                  const patientData = usersSnapshot.docs[0].data();
                  return {
                    ...apt,
                    patientName: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || apt.patientName || 'Unknown Patient',
                    patientEmail: patientData.email || apt.patientEmail,
                    patientPhone: patientData.phone || patientData.phoneNumber || apt.patientPhone
                  };
                }
              } catch (err) {
                console.error('Error fetching patient details:', err);
              }
            }
            return {
              ...apt,
              patientName: apt.patientName || (apt.patient && apt.patient.name) || 'Unknown Patient'
            };
          })
        );
        
        setUpcomingAppointments(appointmentsWithPatientDetails);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle navigation to Appointments page
  const handleViewAllAppointments = () => {
    if (onNavigateToAppointments) {
      onNavigateToAppointments();
    } else {
      // Fallback: try to find and click the appointments nav item
      const sidebarItems = document.querySelectorAll('.MuiListItem-root');
      if (sidebarItems && sidebarItems.length > 1) {
        sidebarItems[1].click(); // Assuming appointments is at index 1
      }
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ borderRadius: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Header Actions */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 2, 
          mb: 4,
          position: 'absolute',
          top: -60,
          right: 0,
        }}
      >
        <Tooltip title="Notifications">
          <IconButton 
            sx={{ 
              bgcolor: 'white',
              boxShadow: theme.shadows[2],
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
            }}
          >
            <NotificationsNoneIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(dashboardStats).map(([key, data]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <StatCard data={data} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Appointments Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          color: mainBlue,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}>
          Upcoming Appointments 
          <Chip
            size="small"
            label={loading ? '...' : upcomingAppointments.length}
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              fontWeight: 600,
            }}
          />
        </Typography>
        <Button
          endIcon={<ArrowForwardIcon />}
          onClick={handleViewAllAppointments}
          sx={{
            color: theme.palette.primary.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          View all appointments
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : upcomingAppointments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No upcoming appointments in the next 3 days
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your schedule is clear for the next few days!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {upcomingAppointments.map((appointment) => (
            <Grid item xs={12} md={4} key={appointment.id}>
              <AppointmentCard appointment={appointment} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Quick Actions Section */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" sx={{ 
        fontWeight: 600, 
        mb: 3, 
        color: mainBlue,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}>
        Quick Actions
        <Chip
          size="small"
          icon={<StarIcon sx={{ fontSize: '16px !important' }} />}
          label="Essential"
          sx={{ 
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            color: theme.palette.warning.main,
            fontWeight: 600,
          }}
        />
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {quickActions.map((action) => (
          <QuickActionButton action={action} key={action.label} />
        ))}
      </Box>

      {/* Doctor Information */}
      <Divider sx={{ my: 4 }} />
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[2],
          }
        }}
      >
        <Avatar 
          src={doctorInfo.avatar} 
          alt={doctorInfo.name} 
          sx={{ 
            width: 64, 
            height: 64,
            border: `2px solid ${theme.palette.primary.main}`,
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            {doctorInfo.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {doctorInfo.role}
          </Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Chip
              size="small"
              label="Available"
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
              }}
            />
            <Chip
              size="small"
              label="Top Rated"
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
              }}
            />
          </Stack>
        </Box>
        <Tooltip title="More options">
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  );
};

export default Dashboard;