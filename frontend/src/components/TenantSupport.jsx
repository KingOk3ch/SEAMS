import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Paper, Typography, Box, List, ListItem, ListItemText,
  TextField, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress, Chip, ListItemButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import ForumIcon from '@mui/icons-material/Forum';
import LogoLoader from './LogoLoader';
import { parseBackendErrors } from '../utils/errorHandler';

function TenantSupport() {
  const [complaints, setComplaints] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [error, setError] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    // Polling mechanism to refresh the active chat thread every 5 seconds
    if (activeThread) {
      fetchMessages(activeThread.id);
      const interval = setInterval(() => fetchMessages(activeThread.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeThread]);

  // Ensures the chat view always scrolls to the most recent message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/support/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.results || data);
      }
    } catch (err) {
      setError('Failed to fetch threads');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/support/${id}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMessages(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread) return;

    setMsgLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/support/${activeThread.id}/messages/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages(activeThread.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMsgLoading(false);
    }
  };

  // Handles the two-step process of creating a thread and immediately posting the first message
  const handleCreateThread = async () => {
    if (!newSubject.trim() || !initialMessage.trim()) return;
    setSubmitLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      const res = await fetch('http://localhost:8000/api/support/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject })
      });

      if (res.ok) {
        const newComplaint = await res.json();
        
        await fetch(`http://localhost:8000/api/support/${newComplaint.id}/messages/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: initialMessage })
        });

        setOpenDialog(false);
        setNewSubject('');
        setInitialMessage('');
        fetchComplaints();
        setActiveThread(newComplaint);
      } else {
        const data = await res.json();
        setError(parseBackendErrors(data).global || 'Failed to create thread.');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <LogoLoader />;

  return (
    <Container maxWidth="lg" sx={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">Help Desk</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          New Inquiry/Complaint
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', borderRadius: 2 }}>
        
        {/* List of available support threads */}
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box p={2} bgcolor="#f8fafc" borderBottom={1} borderColor="divider">
            <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1}>
              <ForumIcon color="primary" /> My Threads
            </Typography>
          </Box>
          <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
            {complaints.length === 0 ? (
              <ListItem><Typography color="text.secondary" p={2} variant="body2">No inquiries found.</Typography></ListItem>
            ) : (
              complaints.map(c => (
                <ListItemButton 
                  key={c.id} 
                  selected={activeThread?.id === c.id}
                  onClick={() => setActiveThread(c)}
                  divider
                >
                  <ListItemText 
                    primary={<Typography fontWeight="bold" noWrap>{c.subject}</Typography>} 
                    secondary={
                        <React.Fragment>
                            <Typography variant="caption" display="block" color="text.secondary">
                                {new Date(c.created_at).toLocaleDateString()}
                            </Typography>
                            <Chip 
                                label={c.status} 
                                size="small" 
                                color={c.status === 'Resolved' ? 'success' : 'error'} 
                                sx={{ height: 20, mt: 0.5, fontSize: '0.7rem' }} 
                            />
                        </React.Fragment>
                    }
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Box>

        {/* Chat interface displaying active thread messages */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f1f5f9' }}>
          {!activeThread ? (
            <Box display="flex" alignItems="center" justifyContent="center" flexGrow={1}>
              <Typography color="text.secondary">Select a thread to view messages.</Typography>
            </Box>
          ) : (
            <>
              {/* Active thread header */}
              <Box p={2} bgcolor="white" borderBottom={1} borderColor="divider" display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight="bold">{activeThread.subject}</Typography>
                <Chip label={activeThread.status} color={activeThread.status === 'Resolved' ? 'success' : 'error'} />
              </Box>

              {/* Message history container with auto-scroll */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.map(msg => {
                  // Identifies if the message was sent by the current tenant to apply correct styling
                  const isMe = String(msg.sender) === String(user.id);
                  return (
                    <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, ml: 1, mr: 1 }}>
                        {isMe ? 'You' : 'Estate Admin'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          maxWidth: '75%', 
                          bgcolor: isMe ? 'primary.main' : 'white', 
                          color: isMe ? 'white' : 'text.primary',
                          borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px'
                        }}
                      >
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.message}</Typography>
                      </Paper>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input container for active threads */}
              {activeThread.status !== 'Resolved' ? (
                <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                  <TextField 
                    fullWidth 
                    variant="outlined" 
                    placeholder="Type a message..." 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    disabled={msgLoading}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5 } }}
                  />
                  <IconButton color="primary" type="submit" disabled={!newMessage.trim() || msgLoading} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                    <SendIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box p={2} bgcolor="#e8f5e9" textAlign="center" borderTop={1} borderColor="divider">
                  <Typography variant="body2" color="success.main" fontWeight="bold">This issue has been marked as resolved.</Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Dialog for creating a new support thread */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Open New Inquiry/Complaint</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">Use this to report noise, security concerns, or general inquiries.</Alert>
            <TextField label="Subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} fullWidth required placeholder="E.g., Noisy neighbor in Unit 4" />
            <TextField label="Message" value={initialMessage} onChange={e => setInitialMessage(e.target.value)} fullWidth required multiline rows={4} placeholder="Describe the situation in detail..." />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitLoading}>Cancel</Button>
          <Button onClick={handleCreateThread} variant="contained" disabled={!newSubject.trim() || !initialMessage.trim() || submitLoading}>
            {submitLoading ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TenantSupport;