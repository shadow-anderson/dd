import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import {
  Box, Button, Card, CardContent, Chip, Container, Grid, 
  Paper, Switch, Typography, useTheme, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Divider, Avatar, Badge
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RefreshIcon from '@mui/icons-material/Refresh';

const AvailabilityScheduler = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [documentMap, setDocumentMap] = useState({});
  const [loading, setLoading] = useState(false);
  
  // State for doctor and clinic selection
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('');
  const [availableClinics, setAvailableClinics] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [selectedDoctorData, setSelectedDoctorData] = useState(null);

  // Initialize time slots (9:00 AM to 5:00 PM)
  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
  ];

  // Convert time format for Firestore (9:00 AM -> 09:00)
  const convertTimeToFirestore = (timeSlot) => {
    const [time, period] = timeSlot.split(' ');
    const [hour, minute] = time.split(':');
    let hour24 = parseInt(hour);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  // Convert time format from Firestore (09:00 -> 9:00 AM)
  const convertTimeFromFirestore = (time24) => {
    const [hour, minute] = time24.split(':');
    const hour24 = parseInt(hour);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const displayHour = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    return `${displayHour}:${minute} ${period}`;
  };

  // Fetch doctors from Firestore
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      console.log('🔄 Fetching doctors from Firestore...');
      const snapshot = await getDocs(collection(db, 'doctors'));
      const doctorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter only active doctors
      const activeDoctors = doctorsList.filter(doctor => doctor.status === 'active');
      
      console.log('👨‍⚕️ Doctors loaded:', activeDoctors);
      setDoctors(activeDoctors);
      
      // Auto-select the first doctor if available
      if (activeDoctors.length > 0) {
        const firstDoctor = activeDoctors[0];
        setSelectedDoctor(firstDoctor.id);
        setSelectedDoctorData(firstDoctor);
        
        if (firstDoctor.clinicIds) {
          setAvailableClinics(firstDoctor.clinicIds);
          console.log('🏥 Available clinics for first doctor:', firstDoctor.clinicIds);
        }
        
        console.log('✅ Auto-selected first doctor:', firstDoctor.firstName, firstDoctor.lastName);
      } else {
        console.warn('⚠️ No active doctors found in Firestore');
      }
    } catch (error) {
      console.error('❌ Error fetching doctors:', error);
      alert('Error loading doctors: ' + error.message);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Handle doctor selection (kept for manual changes if needed)
  const handleDoctorChange = (doctorId) => {
    console.log('👨‍⚕️ Doctor selected:', doctorId);
    setSelectedDoctor(doctorId);
    setSelectedClinic('');
    setClinicId('');
    setAvailabilityData({});
    setDocumentMap({});
    
    const doctor = doctors.find(d => d.id === doctorId);
    setSelectedDoctorData(doctor);
    
    if (doctor && doctor.clinicIds) {
      // Set available clinics from the selected doctor's clinicIds array
      setAvailableClinics(doctor.clinicIds);
      console.log('🏥 Available clinics for doctor:', doctor.clinicIds);
    } else {
      setAvailableClinics([]);
    }
  };

  // Handle clinic selection
  const handleClinicChange = (selectedClinicId) => {
    console.log('🏥 Clinic selected:', selectedClinicId);
    setSelectedClinic(selectedClinicId);
    setClinicId(selectedClinicId);
    setAvailabilityData({});
    setDocumentMap({});
    
    // Fetch availability data for the selected doctor-clinic combination
    if (selectedDoctor && selectedClinicId) {
      fetchAvailabilityForClinic(selectedClinicId);
    }
  };

  // Fetch availability data for selected clinic
  const fetchAvailabilityForClinic = async (clinicIdToFetch) => {
    setLoading(true);
    try {
      console.log(`🔄 Fetching availability for clinic: ${clinicIdToFetch}`);
      const q = query(
        collection(db, 'availability'), 
        where('clinicId', '==', clinicIdToFetch)
      );
      const snapshot = await getDocs(q);
      
      const firestoreData = {};
      const docMap = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const dayKey = data.date;
        
        // Store the actual document ID for future updates
        docMap[dayKey] = doc.id;
        
        // Convert Firestore array format to component format
        const slots = {};
        if (data.slots && Array.isArray(data.slots)) {
          data.slots.forEach(slot => {
            const displayTime = convertTimeFromFirestore(slot.time);
            slots[displayTime] = slot.availableSlot;
          });
        }
        
        firestoreData[dayKey] = {
          isOffDay: !data.availableDay,
          slots: slots,
          docId: doc.id
        };
      });
      
      console.log('📋 Document mapping loaded:', docMap);
      console.log('📊 Availability data loaded:', firestoreData);
      
      // Update both state objects
      setDocumentMap(docMap);
      setAvailabilityData(prev => ({
        ...prev,
        ...firestoreData
      }));
      
    } catch (error) {
      console.error('❌ Error loading availability:', error);
      alert('Error loading availability: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize week and availability data
  useEffect(() => {
    if (!selectedDoctor || !selectedClinic) {
      // Don't initialize availability data if no doctor/clinic selected
      return;
    }

    const startDay = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDay, i);
      days.push(day);
    }

    setWeekDays(days);

    // Only initialize with default data if no existing data
    const newAvailabilityData = {};
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      if (!availabilityData[dayKey]) {
        newAvailabilityData[dayKey] = {
          isOffDay: false,
          slots: timeSlots.reduce((acc, slot) => {
            // Make future days available by default
            const isFuture = day > new Date();
            acc[slot] = isFuture ? true : false;
            return acc;
          }, {})
        };
      }
    });

    // Only update if we have new data to add
    if (Object.keys(newAvailabilityData).length > 0) {
      setAvailabilityData(prev => ({
        ...prev,
        ...newAvailabilityData
      }));
    }
  }, [selectedDate, selectedDoctor, selectedClinic]);

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Calculate active slots count
  const getActiveSlotCount = (dayKey) => {
    if (!availabilityData[dayKey]) return 0;
    if (availabilityData[dayKey].isOffDay) return 0;
    return Object.values(availabilityData[dayKey].slots || {}).filter(Boolean).length;
  };

  // Calculate total available hours for a day
  const getAvailableHours = (dayKey) => {
    const activeSlots = getActiveSlotCount(dayKey);
    return (activeSlots * 0.5).toFixed(1);
  };

  // Handler for date selection
  const handleDateChange = (newDate) => setSelectedDate(newDate);

  // Enhanced slot toggle handler with existing document update
  const handleSlotToggle = async (dayKey, slot) => {
    if (!clinicId) {
      alert('Please select a clinic first');
      return;
    }

    try {
      console.log(`🔄 Toggling slot: ${slot} for date: ${dayKey} in clinic: ${clinicId}`);
      
      // Get current state
      const currentData = availabilityData[dayKey] || { isOffDay: false, slots: {} };
      const currentValue = currentData.slots[slot] || false;
      const newValue = !currentValue;
      
      console.log(`📊 Current value: ${currentValue} → New value: ${newValue}`);
      
      // Update local state first for immediate UI feedback
      const updatedAvailabilityData = {
        ...availabilityData,
        [dayKey]: {
          ...currentData,
          slots: {
            ...currentData.slots,
            [slot]: newValue,
          },
        },
      };
      
      setAvailabilityData(updatedAvailabilityData);

      // Prepare Firestore data with ALL time slots
      const updatedDayData = updatedAvailabilityData[dayKey];
      
      const firestoreSlots = timeSlots.map(timeSlot => {
        const firestoreTime = convertTimeToFirestore(timeSlot);
        const isAvailable = updatedDayData.slots[timeSlot] || false;
        
        return {
          time: firestoreTime,
          availableSlot: isAvailable
        };
      });

      // Sort slots by time for consistency
      firestoreSlots.sort((a, b) => a.time.localeCompare(b.time));

      const firestoreData = {
        clinicId: clinicId,
        date: dayKey,
        availableDay: !updatedDayData.isOffDay,
        slots: firestoreSlots
      };

      console.log('💾 Firestore data being saved:', JSON.stringify(firestoreData, null, 2));

      // Use existing document ID if available, otherwise create new document with date-based ID
      const existingDocId = documentMap[dayKey];
      let docRef;
      
      if (existingDocId) {
        console.log(`📝 Updating existing document: ${existingDocId}`);
        docRef = doc(db, 'availability', existingDocId);
      } else {
        console.log(`📄 Creating new document for date: ${dayKey}`);
        docRef = doc(db, 'availability', `${clinicId}-${dayKey}`);
        // Update document map for future reference
        setDocumentMap(prev => ({
          ...prev,
          [dayKey]: `${clinicId}-${dayKey}`
        }));
      }

      await setDoc(docRef, firestoreData, { merge: false });

      console.log(`✅ Successfully saved to Firestore for ${dayKey}`);
      
    } catch (error) {
      console.error('❌ Error updating slot:', error);
      alert('Error updating slot: ' + error.message);
      
      // Revert local state on error
      setAvailabilityData(prev => ({
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          slots: {
            ...prev[dayKey].slots,
            [slot]: !prev[dayKey].slots[slot],
          },
        },
      }));
    }
  };

  // Enhanced off day toggle handler
  const handleOffDayToggle = async (dayKey) => {
    if (!clinicId) {
      alert('Please select a clinic first');
      return;
    }

    try {
      console.log(`🔄 Toggling off day for date: ${dayKey} in clinic: ${clinicId}`);
      
      const currentData = availabilityData[dayKey] || { isOffDay: false, slots: {} };
      const currentOffDayValue = currentData.isOffDay;
      const newOffDayValue = !currentOffDayValue;
      
      console.log(`📊 Off day status: ${currentOffDayValue} → ${newOffDayValue}`);
      
      const updatedAvailabilityData = {
        ...availabilityData,
        [dayKey]: {
          ...currentData,
          isOffDay: newOffDayValue
        },
      };
      
      setAvailabilityData(updatedAvailabilityData);

      const updatedDayData = updatedAvailabilityData[dayKey];
      const existingDocId = documentMap[dayKey];
      
      if (newOffDayValue) {
        // Delete the existing document if it exists
        if (existingDocId) {
          const docRef = doc(db, 'availability', existingDocId);
          await deleteDoc(docRef);
          console.log(`🗑️ Document deleted for off day: ${dayKey} (ID: ${existingDocId})`);
          
          // Remove from document map
          setDocumentMap(prev => {
            const newMap = { ...prev };
            delete newMap[dayKey];
            return newMap;
          });
        }
      } else {
        // Create/update document with availableDay = true
        const firestoreSlots = timeSlots.map(timeSlot => {
          const firestoreTime = convertTimeToFirestore(timeSlot);
          const isAvailable = updatedDayData.slots[timeSlot] || false;
          
          return {
            time: firestoreTime,
            availableSlot: isAvailable
          };
        });

        firestoreSlots.sort((a, b) => a.time.localeCompare(b.time));

        const firestoreData = {
          clinicId: clinicId,
          date: dayKey,
          availableDay: true,
          slots: firestoreSlots
        };

        let docRef;
        if (existingDocId) {
          console.log(`📝 Updating existing document: ${existingDocId}`);
          docRef = doc(db, 'availability', existingDocId);
        } else {
          console.log(`📄 Creating new document for date: ${dayKey}`);
          const newDocId = `${clinicId}-${dayKey}`;
          docRef = doc(db, 'availability', newDocId);
          setDocumentMap(prev => ({
            ...prev,
            [dayKey]: newDocId
          }));
        }

        await setDoc(docRef, firestoreData, { merge: false });
        console.log(`✅ Document updated for available day: ${dayKey}`);
      }
      
    } catch (error) {
      console.error('❌ Error updating day status:', error);
      alert('Error updating day status: ' + error.message);
      
      // Revert local state on error
      setAvailabilityData(prev => ({
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          isOffDay: !prev[dayKey].isOffDay
        },
      }));
    }
  };

  // Get week range text
  const getWeekRangeText = () => {
    if (weekDays.length < 1) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Check if today is in current week
  const isTodayInWeek = weekDays.some(day => isToday(day));
  const todayKey = isTodayInWeek ? format(new Date(), 'yyyy-MM-dd') : null;
  const availableToday = todayKey ? getAvailableHours(todayKey) : 0;

  // Get active slots for selected day
  const selectedDayKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayData = availabilityData[selectedDayKey] || {};
  const selectedDaySlots = selectedDayData.slots || {};
  const activeSlotCount = getActiveSlotCount(selectedDayKey);

  // Batch save schedule to Firestore
  const handleSaveSchedule = async () => {
    if (!clinicId) {
      alert('Please select a clinic first');
      return;
    }

    if (weekDays.length === 0) {
      alert('No days to save');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Starting batch save...');
      
      const savePromises = weekDays.map(async (day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayData = availabilityData[dayKey];
        const existingDocId = documentMap[dayKey];
        
        if (!dayData) return;

        if (dayData.isOffDay) {
          if (existingDocId) {
            try {
              const docRef = doc(db, 'availability', existingDocId);
              await deleteDoc(docRef);
              console.log(`🗑️ Document deleted for off day: ${dayKey}`);
            } catch (error) {
              console.log(`ℹ️ Document for ${dayKey} does not exist or already deleted`);
            }
          }
          return;
        }

        const firestoreSlots = timeSlots.map(timeSlot => {
          const firestoreTime = convertTimeToFirestore(timeSlot);
          const isAvailable = dayData.slots[timeSlot] || false;
          
          return {
            time: firestoreTime,
            availableSlot: isAvailable
          };
        });

        firestoreSlots.sort((a, b) => a.time.localeCompare(b.time));

        const firestoreData = {
          clinicId: clinicId,
          date: dayKey,
          availableDay: true,
          slots: firestoreSlots
        };

        let docRef;
        if (existingDocId) {
          docRef = doc(db, 'availability', existingDocId);
        } else {
          const newDocId = `${clinicId}-${dayKey}`;
          docRef = doc(db, 'availability', newDocId);
        }

        await setDoc(docRef, firestoreData, { merge: false });
        console.log(`✅ Document saved for ${dayKey}`);
      });

      await Promise.all(savePromises);
      alert('✅ Availability saved to Firestore successfully!');
      console.log('✅ Batch save completed successfully');
      
    } catch (error) {
      console.error('❌ Error saving availability:', error);
      alert('Error saving availability: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ 
        p: { xs: 2, md: 4 }, 
        borderRadius: 4,
        background: 'white',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
        border: '1px solid rgba(224, 224, 224, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4,
          pb: 2,
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EventAvailableIcon sx={{ 
              fontSize: 36, 
              color: 'primary.main',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '50%',
              p: 1
            }} />
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                Doctor Availability Schedule
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Manage doctor availability across multiple clinics
              </Typography>
            </Box>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.2)',
              '&:hover': {
                boxShadow: '0 6px 15px rgba(33, 150, 243, 0.3)'
              }
            }}
            onClick={handleSaveSchedule}
            disabled={loading || !selectedDoctor || !selectedClinic}
          >
            {loading ? 'Saving...' : 'Batch Save All'}
          </Button>
        </Box>

        {/* Doctor and Clinic Selection */}
        <Card elevation={0} sx={{ 
          mb: 4,
          borderRadius: 3,
          backgroundColor: 'rgba(33, 150, 243, 0.02)',
          border: '1px solid rgba(33, 150, 243, 0.1)'
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ color: 'primary.main' }} />
              Doctor & Clinic Selection
            </Typography>
            
            <Grid container spacing={3}>
              {/* Auto-selected Doctor Display */}
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: loadingDoctors ? 'rgba(0, 0, 0, 0.02)' : 'rgba(33, 150, 243, 0.03)'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                    Auto-Selected Doctor:
                  </Typography>
                  
                  {loadingDoctors ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading doctors...</Typography>
                    </Box>
                  ) : selectedDoctorData ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 40, height: 40, backgroundColor: 'primary.main' }}>
                        {selectedDoctorData.firstName?.[0]}{selectedDoctorData.lastName?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Dr. {selectedDoctorData.firstName} {selectedDoctorData.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {selectedDoctorData.specialization} • {selectedDoctorData.experience} years exp.
                        </Typography>
                      </Box>
                      <Chip 
                        label="Auto-selected" 
                        size="small" 
                        sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: 'success.dark' }}
                      />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="error">
                      No doctors found. Please check the database.
                    </Typography>
                  )}
                  
                  {/* Option to manually change doctor */}
                  {!loadingDoctors && doctors.length > 1 && (
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel id="manual-doctor-select-label">Change Doctor (Optional)</InputLabel>
                      <Select
                        labelId="manual-doctor-select-label"
                        value={selectedDoctor}
                        label="Change Doctor (Optional)"
                        onChange={(e) => handleDoctorChange(e.target.value)}
                        sx={{ borderRadius: 2 }}
                        size="small"
                      >
                        {doctors.map((doctor) => (
                          <MenuItem key={doctor.id} value={doctor.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Avatar sx={{ width: 24, height: 24, backgroundColor: 'primary.main' }}>
                                {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  Dr. {doctor.firstName} {doctor.lastName}
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Grid>

              {/* Clinic Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!selectedDoctor}>
                  <InputLabel id="clinic-select-label">Select Clinic *</InputLabel>
                  <Select
                    labelId="clinic-select-label"
                    value={selectedClinic}
                    label="Select Clinic *"
                    onChange={(e) => handleClinicChange(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    {availableClinics.length === 0 ? (
                      <MenuItem disabled>
                        {selectedDoctor ? 'No clinics available for this doctor' : 'Select a doctor first'}
                      </MenuItem>
                    ) : (
                      availableClinics.map((clinicId) => (
                        <MenuItem key={clinicId} value={clinicId}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LocalHospitalIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {clinicId}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Clinic ID: {clinicId}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                
                {!selectedClinic && selectedDoctor && (
                  <Typography variant="caption" sx={{ color: 'warning.main', mt: 1, display: 'block' }}>
                    Please select a clinic to proceed with scheduling
                  </Typography>
                )}
              </Grid>
            </Grid>

            {/* Selected Doctor Info */}
            {selectedDoctorData && (
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Selected Doctor Information:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>Bio:</strong> {selectedDoctorData.bio || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>Consultation Fee:</strong> ₹{selectedDoctorData.consultationFee || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>Languages:</strong> {selectedDoctorData.languages?.join(', ') || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>Qualifications:</strong> {selectedDoctorData.qualifications?.join(', ') || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Show alert if no doctor/clinic selected */}
        {(!selectedDoctor || !selectedClinic) && (
          <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
            Please select a doctor and clinic to manage availability schedule.
          </Alert>
        )}

        {/* Only show the rest if doctor and clinic are selected */}
        {selectedDoctor && selectedClinic && (
          <>
            {/* Week Display */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 3,
              backgroundColor: 'rgba(33, 150, 243, 0.03)',
              p: 2,
              borderRadius: 3
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {getWeekRangeText()}
                </Typography>
                <Chip 
                  label={`Dr. ${selectedDoctorData?.firstName} ${selectedDoctorData?.lastName} @ ${selectedClinic}`}
                  size="small"
                  sx={{ ml: 2, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: 'primary.main' }}
                />
              </Box>
              
              {isTodayInWeek && (
                <Chip 
                  icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                  label={`Available for ${availableToday} hours today!`}
                  sx={{ 
                    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                    color: 'success.dark',
                    fontWeight: 500
                  }}
                />
              )}
            </Box>
            
            <Grid container spacing={3}>
              {/* Calendar View */}
              <Grid item xs={12} md={5}>
                <Card elevation={0} sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                backgroundColor: 'primary.main', 
                p: 2,
                color: 'white'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Select a date
                </Typography>
              </Box>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateCalendar 
                  value={selectedDate} 
                  onChange={handleDateChange}
                  sx={{
                    width: '100%',
                    '& .MuiPickersDay-root': {
                      borderRadius: '50%',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                      }
                    },
                    '& .Mui-selected': {
                      backgroundColor: '#2196f3 !important',
                      color: '#fff !important',
                      fontWeight: 600
                    },
                    '& .MuiPickersCalendarHeader-root': {
                      mt: 1
                    }
                  }}
                />
              </LocalizationProvider>
            </Card>
            
            {/* Selected Day Summary */}
            <Card elevation={0} sx={{ 
              mt: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                backgroundColor: 'rgba(33, 150, 243, 0.05)', 
                p: 2,
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {format(selectedDate, 'EEEE, MMMM d')}
                  {documentMap[selectedDayKey] && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      Document ID: {documentMap[selectedDayKey]}
                    </Typography>
                  )}
                </Typography>
              </Box>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedDayData.isOffDay ? 'Day Off' : `${activeSlotCount} slots available`}
                    </Typography>
                  </Box>
                  
                  <Switch 
                    checked={!selectedDayData.isOffDay}
                    onChange={() => handleOffDayToggle(selectedDayKey)}
                    color="primary"
                    inputProps={{ 'aria-label': 'Toggle availability' }}
                  />
                </Box>
                
                {!selectedDayData.isOffDay && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                      Toggle time slots (updates existing document):
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5
                    }}>
                      {timeSlots.map((slot) => {
                        const isActive = selectedDaySlots[slot];
                        return (
                          <Chip
                            key={slot}
                            label={slot}
                            onClick={() => handleSlotToggle(selectedDayKey, slot)}
                            variant={isActive ? "filled" : "outlined"}
                            sx={{
                              borderRadius: 2,
                              px: 1.5,
                              fontWeight: 500,
                              backgroundColor: isActive 
                                ? 'rgba(76, 175, 80, 0.15)' 
                                : 'transparent',
                              color: isActive 
                                ? 'success.dark' 
                                : 'text.secondary',
                              border: '1px solid',
                              borderColor: isActive 
                                ? 'rgba(76, 175, 80, 0.3)' 
                                : 'rgba(0, 0, 0, 0.1)',
                              '&:hover': {
                                backgroundColor: isActive 
                                  ? 'rgba(76, 175, 80, 0.2)' 
                                  : 'rgba(0, 0, 0, 0.03)'
                              }
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Weekly Slots View */}
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                backgroundColor: 'rgba(33, 150, 243, 0.05)', 
                p: 2,
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Weekly Availability (Click to toggle slots - Updates existing documents)
                </Typography>
              </Box>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  overflowX: 'auto',
                  pb: 2,
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': {
                    height: 6,
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: 2,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: 2,
                  }
                }}>
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayData = availabilityData[dayKey] || {};
                    const activeSlots = getActiveSlotCount(dayKey);
                    const isSelected = isSameDay(day, selectedDate);
                    const isDayToday = isToday(day);
                    
                    return (
                      <Card 
                        key={dayKey}
                        onClick={() => setSelectedDate(day)}
                        elevation={0}
                        sx={{
                          minWidth: 160,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'rgba(0, 0, 0, 0.08)',
                          backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.05)' : 'white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          flexShrink: 0,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                          }
                        }}
                      >
                        <CardContent>
                          {/* Day Header */}
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 2
                          }}>
                            <Box>
                              <Typography variant="body2" sx={{
                                fontWeight: 600,
                                color: isDayToday ? 'primary.main' : 'text.primary',
                              }}>
                                {format(day, 'EEE')}
                              </Typography>
                              <Typography variant="h6" sx={{
                                fontWeight: 700,
                                color: isDayToday ? 'primary.main' : 'text.primary',
                              }}>
                                {format(day, 'd')}
                              </Typography>
                            </Box>
                            
                            {/* Status Indicator */}
                            <Box sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%',
                              backgroundColor: dayData.isOffDay 
                                ? 'error.main' 
                                : activeSlots > 0 ? 'success.main' : 'warning.main',
                              mt: 0.5
                            }} />
                          </Box>
                          
                          {/* Off Day Toggle */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2
                          }}>
                            <Typography variant="caption" sx={{ 
                              fontWeight: 500,
                              color: dayData.isOffDay ? 'error.main' : 'text.secondary'
                            }}>
                              {dayData.isOffDay ? 'Day Off' : 'Available'}
                            </Typography>
                            <Switch 
                              size="small"
                              checked={!dayData.isOffDay}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleOffDayToggle(dayKey);
                              }}
                              color="primary"
                            />
                          </Box>
                          
                          {/* Slot Grid */}
                          {!dayData.isOffDay && (
                            <>
                              <Box sx={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 0.5,
                                mb: 1.5
                              }}>
                                {timeSlots.map((slot, index) => (
                                  <Box
                                    key={slot}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSlotToggle(dayKey, slot);
                                    }}
                                    sx={{
                                      height: 12,
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      backgroundColor: dayData.slots?.[slot] 
                                        ? 'rgba(76, 175, 80, 0.3)' 
                                        : 'rgba(0, 0, 0, 0.05)',
                                      border: '1px solid',
                                      borderColor: dayData.slots?.[slot] 
                                        ? 'rgba(76, 175, 80, 0.4)' 
                                        : 'rgba(0, 0, 0, 0.08)',
                                      '&:hover': {
                                        transform: 'scale(1.1)',
                                        borderColor: dayData.slots?.[slot] 
                                          ? '#4CAF50' 
                                          : 'rgba(0, 0, 0, 0.15)'
                                      }
                                    }}
                                  />
                                ))}
                              </Box>
                              
                              {/* Slot Count */}
                              <Typography variant="caption" sx={{
                                display: 'block',
                                textAlign: 'center',
                                fontWeight: 500,
                                color: activeSlots > 8 ? 'success.dark' : 
                                       activeSlots > 0 ? 'warning.dark' : 'error.main'
                              }}>
                                {activeSlots}/16 slots active
                              </Typography>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
                
                {/* Legend */}
                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                  borderRadius: 3,
                  border: '1px solid rgba(0, 0, 0, 0.03)'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Availability Legend
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '4px',
                          backgroundColor: 'rgba(76, 175, 80, 0.3)',
                          border: '1px solid rgba(76, 175, 80, 0.4)'
                        }} />
                        <Typography variant="caption">Available slot</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '4px',
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          border: '1px solid rgba(0, 0, 0, 0.08)'
                        }} />
                        <Typography variant="caption">Unavailable slot</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '4px',
                          backgroundColor: 'rgba(244, 67, 54, 0.1)',
                          border: '1px solid rgba(244, 67, 54, 0.2)'
                        }} />
                        <Typography variant="caption">Day off</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '4px',
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          border: '1px solid rgba(33, 150, 243, 0.2)'
                        }} />
                        <Typography variant="caption">Today</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </>
      )}
      </Paper>
    </Container>
  );
};

export default AvailabilityScheduler;