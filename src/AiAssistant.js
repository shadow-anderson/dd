import React, { useState, useRef, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Avatar,
  Stack,
  TextField,
  IconButton,
  Container,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';

const AiAssistant = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello, I'm your AI assistant. How can I help you today? You can ask me about your patients, appointments, or medical information.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const chatEndRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: input.trim(), timestamp: new Date() },
    ]);
    setInput('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} color="transparent">
        <Toolbar sx={{ py: 2, justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ChatBubbleOutlineRoundedIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600} color="text.primary">
              AI Assistant
            </Typography>
          </Stack>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="patient-label">Patient</InputLabel>
            <Select
              labelId="patient-label"
              value={selectedPatient}
              label="Patient"
              onChange={(e) => setSelectedPatient(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="john">John Doe</MenuItem>
              <MenuItem value="jane">Jane Smith</MenuItem>
              <MenuItem value="alex">Alex Johnson</MenuItem>
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>

      {/* Chat Card */}
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            minHeight: 600,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {messages.map((msg, idx) => (
              <Stack key={idx} direction="row" alignItems="flex-start" spacing={2}>
                <Avatar sx={{ bgcolor: msg.sender === 'ai' ? 'primary.light' : 'secondary.light' }}>
                  {msg.sender === 'ai' ? 'AI' : 'U'}
                </Avatar>
                <Paper
                  variant="outlined"
                  sx={{
                    bgcolor: msg.sender === 'ai' ? 'grey.50' : 'primary.light',
                    color: msg.sender === 'ai' ? 'text.primary' : 'primary.contrastText',
                    p: 2,
                    borderRadius: 3,
                    maxWidth: '80%',
                  }}
                >
                  <Typography variant="body1">{msg.text}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Paper>
              </Stack>
            ))}
            <div ref={chatEndRef} />
          </Box>

          {/* Input Bar */}
          <Box component="form" onSubmit={handleSend} sx={{ p: 3, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              variant="outlined"
              size="medium"
              InputProps={{
                sx: { borderRadius: 3, bgcolor: 'background.paper' },
              }}
            />
            <IconButton
              type="submit"
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                borderRadius: 3,
              }}
              size="large"
            >
              <SendRoundedIcon sx={{ color: '#fff' }} />
            </IconButton>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AiAssistant;
