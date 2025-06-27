import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import {
  Box, Button, Card, CardContent, Chip, Container, Grid, 
  Paper, Switch, Typography, useTheme, useMediaQuery
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, startOfWeek, isSameDay, isToday} from 'date-fns';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const AvailabilityScheduler = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Add clinicId - you can make this dynamic based on logged-in user
  const clinicId = "clinic7.1";

  // Initialize time slots (9:00 AM to 5:00 PM)
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  });

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

  // Initialize week and availability data
  useEffect(() => {
    const startDay = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = [];
    const newAvailabilityData = { ...availabilityData };

    for (let i = 0; i < 7; i++) {
      const day = addDays(startDay, i);
      const dayKey = format(day, 'yyyy-MM-dd');
      days.push(day);
      
      if (!newAvailabilityData[dayKey]) {
        newAvailabilityData[dayKey] = {
          isOffDay: false,
          slots: timeSlots.reduce((acc, slot) => {
            // Make future days available by default
            const isFuture = day > new Date();
            acc[slot] = isFuture ? true : Math.random() > 0.5;
            return acc;
          }, {})
        };
      }
    }

    setWeekDays(days);
    setAvailabilityData(newAvailabilityData);
  }, [selectedDate]);

  // Fetch availability from Firestore on mount
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'availability'), 
          where('clinicId', '==', clinicId)
        );
        const snapshot = await getDocs(q);
        
        const firestoreData = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const dayKey = data.date;
          
          // Convert Firestore array format to component format
          const slots = {};
          data.slots.forEach(slot => {
            const displayTime = convertTimeFromFirestore(slot.time);
            slots[displayTime] = slot.availableSlot;
          });
          
          firestoreData[dayKey] = {
            isOffDay: !data.availableDay,
            slots: slots,
            docId: doc.id // Store document ID for updates
          };
        });
        
        // Merge with existing data
        setAvailabilityData(prev => ({
          ...prev,
          ...firestoreData
        }));
        
      } catch (error) {
        console.error('Error loading availability:', error);
        alert('Error loading availability: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailability();
  }, [clinicId]);

  // Calculate active slots count
  const getActiveSlotCount = (dayKey) => {
    if (!availabilityData[dayKey]) return 0;
    if (availabilityData[dayKey].isOffDay) return 0;
    return Object.values(availabilityData[dayKey].slots).filter(Boolean).length;
  };

  // Calculate total available hours for a day
  const getAvailableHours = (dayKey) => {
    const activeSlots = getActiveSlotCount(dayKey);
    return (activeSlots * 0.5).toFixed(1);
  };

  // Handler for date selection
  const handleDateChange = (newDate) => setSelectedDate(newDate);

  // Handler for slot toggling
  const handleSlotToggle = (dayKey, slot) => {
    setAvailabilityData((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: {
          ...prev[dayKey].slots,
          [slot]: !prev[dayKey].slots[slot],
        },
      },
    }));
  };

  // Handler for off day toggling
  const handleOffDayToggle = (dayKey) => {
    setAvailabilityData((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        isOffDay: !prev[dayKey].isOffDay
      },
    }));
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

  // Save schedule to Firestore 
  const handleSaveSchedule = async () => {
    setLoading(true);
    try {
      // Process each day in the current week
      const savePromises = weekDays.map(async (day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayData = availabilityData[dayKey];
        
        if (!dayData) return;

        // Convert component format to Firestore format
        const slots = Object.entries(dayData.slots).map(([timeSlot, isAvailable]) => ({
          time: convertTimeToFirestore(timeSlot),
          availableSlot: isAvailable
        }));

        const firestoreData = {
          clinicId: clinicId,
          date: dayKey,
          availableDay: !dayData.isOffDay,
          slots: slots
        };

        // Create document with date as ID for easy querying
        const docRef = doc(db, 'availability', `${clinicId}-${dayKey}`);
        
        // Only delete if it's an off day AND no slots are available
        if (dayData.isOffDay && slots.every(slot => !slot.availableSlot)) {
          // If it's an off day and no slots are available, delete the document
          try {
            await deleteDoc(docRef);
          } catch (error) {
            // Document might not exist, that's ok
            console.log('Document does not exist or already deleted');
          }
        } else {
          // Always save/update the document for any other case
          // This includes: available days, partially available days, etc.
          await setDoc(docRef, firestoreData, { merge: true });
        }
      });

      await Promise.all(savePromises);
      alert('Availability saved to Firestore successfully!');
      
    } catch (error) {
      console.error('Error saving availability:', error);
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
                Manage your weekly availability for appointments
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
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Schedule'}
          </Button>
        </Box>
        
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
          </Box>
          
          {isTodayInWeek && (
            <Chip 
              icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
              label={`You are available for ${availableToday} hours today!`}
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
                      Toggle time slots:
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
                  Weekly Availability
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
      </Paper>
    </Container>
  );
};

export default AvailabilityScheduler;