import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Paper, Typography, Box, List, ListItem, ListItemText,
  TextField, IconButton, Button, CircularProgress, Chip, ListItemButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ForumIcon from '@mui/icons-material/Forum';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LogoLoader from './LogoLoader';

function AdminSupportInbox() {
  const [complaints, setComplaints] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
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
        let data = await res.json();
        if (data.results) data = data.results;
        
        // Organizes threads so unresolved issues appear at the top
        data.sort((a, b) => {
            if (a.status === 'Open' && b.status !== 'Open') return -1;
            if (a.status !== 'Open' && b.status === 'Open') return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        setComplaints(data);
      }
    } catch (err) {
      console.error(err);
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

  // Triggers the endpoint to close the ticket and decreases the global notification badge count
  const handleResolve = async () => {
      if(!window.confirm("Are you sure you want to mark this issue as resolved?")) return;
      
      setResolveLoading(true);
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`http://localhost:8000/api/support/${activeThread.id}/resolve/`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if(res.ok) {
              fetchComplaints();
              setActiveThread(prev => ({ ...prev, status: 'Resolved' }));
          }
      } catch(err) {
          console.error(err);
      } finally {
          setResolveLoading(false);
      }
  };

  if (loading) return <LogoLoader />;

  return (
    <Container maxWidth="lg" sx={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">Support Inbox</Typography>
      </Box>

      <Paper sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', borderRadius: 2 }}>
        
        {/* List of all tenant support threads */}
        <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1}>
              <ForumIcon color="primary" /> Tenant Inquiries
            </Typography>
          </Box>
          <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
            {complaints.length === 0 ? (
              <ListItem><Typography color="text.secondary" p={2} variant="body2">Inbox is empty.</Typography></ListItem>
            ) : (
              complaints.map(c => (
                <ListItemButton 
                  key={c.id} 
                  selected={activeThread?.id === c.id}
                  onClick={() => setActiveThread(c)}
                  divider
                  sx={{ bgcolor: c.status === 'Open' ? 'white' : 'transparent' }}
                >
                  <ListItemText 
                    primary={<Typography fontWeight="bold" noWrap>{c.subject}</Typography>} 
                    secondary={
                        <React.Fragment>
                            <Typography variant="caption" display="block" color="text.primary" fontWeight={600}>
                                {c.tenant_name} (Hse: {c.house_number})
                            </Typography>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                                <Chip 
                                    label={c.status} 
                                    size="small" 
                                    color={c.status === 'Resolved' ? 'success' : 'error'} 
                                    sx={{ height: 20, fontSize: '0.7rem' }} 
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {new Date(c.created_at).toLocaleDateString()}
                                </Typography>
                            </Box>
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
              <Typography color="text.secondary">Select an inquiry to start messaging.</Typography>
            </Box>
          ) : (
            <>
              {/* Active thread header with resolution controls */}
              <Box p={2} bgcolor="white" borderBottom={1} borderColor="divider" display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h6" fontWeight="bold">{activeThread.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {activeThread.tenant_name} • House {activeThread.house_number}
                    </Typography>
                </Box>
                {activeThread.status === 'Open' ? (
                    <Button 
                        variant="outlined" 
                        color="success" 
                        size="small" 
                        startIcon={resolveLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        onClick={handleResolve}
                        disabled={resolveLoading}
                    >
                        Mark Resolved
                    </Button>
                ) : (
                    <Chip label="Resolved" color="success" />
                )}
              </Box>

              {/* Message history container with auto-scroll */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.map(msg => {
                  // Identifies if the message was sent by the admin to apply correct styling
                  const isMe = String(msg.sender) === String(user.id);
                  return (
                    <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, ml: 1, mr: 1 }}>
                        {isMe ? 'You' : msg.sender_name} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    placeholder="Type a response..." 
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
                  <Typography variant="body2" color="success.main" fontWeight="bold">This inquiry is closed.</Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default AdminSupportInbox;