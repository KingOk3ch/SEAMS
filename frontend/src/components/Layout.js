import React, { useState, useEffect } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, 
  ListItemIcon, ListItemText, ListItemButton, Avatar, Menu, MenuItem, Divider, 
  Badge, Popover 
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Home, People, Build, Payment, Description, 
  Logout, PersonAdd, AccountCircle, Notifications, Assessment, Forum
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

import logoImage from '../assets/seamslogo.png'; 

const drawerWidth = 240;

function Layout({ children, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // --- BADGE STATES ---
  const [paymentBadgeCount, setPaymentBadgeCount] = useState(0);
  const [maintenanceBadgeCount, setMaintenanceBadgeCount] = useState(0); 
  const [supportBadgeCount, setSupportBadgeCount] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData(); // Initial Fetch

    // Poll every 5 seconds
    const interval = setInterval(() => {
        fetchData();
    }, 5000); 

    return () => clearInterval(interval);
  }, []);

  const fetchData = () => {
      fetchNotifications();
      fetchPaymentBadge();
      fetchMaintenanceBadge(); 
      fetchSupportBadge();
  };

  const fetchSupportBadge = async () => {
    try {
        const token = localStorage.getItem('access_token');
        // Allows both tenants and admins to fetch their active support ticket counts
        if (!token || !['estate_admin', 'tenant'].includes(user.role)) return;

        const response = await fetch('http://localhost:8000/api/support/open_count/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            setSupportBadgeCount(data.open_complaints || 0);
        }
    } catch (err) {
        console.error("Failed to fetch support badge", err);
    }
  };

  const fetchMaintenanceBadge = async () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch('http://localhost:8000/api/maintenance/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            let data = await response.json();
            if (data.results) data = data.results; 

            let count = 0;
            const role = (user.role || '').toLowerCase();
            const userId = String(user.id);

            // Safe ID Helper
            const getId = (field) => {
                if (!field) return '';
                return typeof field === 'object' ? String(field.id) : String(field);
            };

            if (role === 'estate_admin') {
                // Admin: Count 'new' (unassigned) requests
                count = data.filter(r => r.status === 'new').length;
            } else if (role === 'technician') {
                // Technician: Count 'assigned' (pending attention) items for THIS tech
                count = data.filter(r => r.status === 'assigned' && getId(r.assigned_to) === userId).length;
            }

            setMaintenanceBadgeCount(count);
        }
    } catch (err) {
        console.error("Failed to fetch maintenance badge", err);
    }
  };

  const fetchPaymentBadge = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const role = user.role;
      let url = '';
      let filterFn = () => false;

      if (role === 'estate_admin') {
        // Admin: Count new successful payments that haven't been acknowledged yet (acts as an unread receipt to prevent STK push race condition bugs)
        url = 'http://localhost:8000/api/payments/';
        filterFn = (item) => item.is_verified === true && item.admin_has_viewed === false;
      } 
      else if (role === 'tenant') {
        url = 'http://localhost:8000/api/bills/';
        filterFn = (item) => item.is_paid === false;
      } 
      else {
        return; 
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        let data = await response.json();
        if (data.results) data = data.results;
        
        if (Array.isArray(data)) {
            const count = data.filter(filterFn).length;
            setPaymentBadgeCount(count);
        }
      }
    } catch (err) {
      console.error("Failed to fetch payment badge", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const response = await fetch('http://localhost:8000/api/notifications/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8000/api/notifications/${id}/mark_read/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileClose();
    onLogout();
    navigate('/');
  };

  const getProfileImageUrl = () => {
    if (!user.profile_picture) return undefined;
    if (user.profile_picture.startsWith('http')) return user.profile_picture;
    return `http://localhost:8000${user.profile_picture}`;
  };

  const getMenuItems = () => {
    const role = user.role;
    if (role === 'estate_admin') {
      return [
        { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
        { text: 'Houses', icon: <Home />, path: '/houses' },
        { text: 'Tenants', icon: <People />, path: '/tenants' },
        { text: 'Users', icon: <PersonAdd />, path: '/users' },
        { text: 'Contracts', icon: <Description />, path: '/contracts' },
        { text: 'Payments', icon: <Payment />, path: '/payments' },
        { text: 'Maintenance', icon: <Build />, path: '/maintenance' },
        { text: 'Support Inbox', icon: <Forum />, path: '/admin-support' },
        { text: 'Reports', icon: <Assessment />, path: '/reports' },
      ];
    }
    if (role === 'technician') {
      return [{ text: 'Maintenance Requests', icon: <Build />, path: '/maintenance' }];
    }
    if (role === 'tenant') {
      return [
        { text: 'My Dashboard', icon: <Dashboard />, path: '/tenant-dashboard' },
        { text: 'Payments & Bills', icon: <Payment />, path: '/tenant-payments' },
        { text: 'Maintenance', icon: <Build />, path: '/maintenance' },
        { text: 'Help Desk', icon: <Forum />, path: '/tenant-support' },
      ];
    }
    return [];
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Sidebar header with centered logo */}
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '90px', 
        py: 2
      }}>
        <img 
          src={logoImage} 
          alt="SEAMS Logo" 
          style={{ 
            height: '80px', 
            width: 'auto',
            objectFit: 'contain',
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)'
          }} 
        />
      </Toolbar>
      
      <Divider />
      <List sx={{ flexGrow: 1 }}>
          {getMenuItems().map((item) => {
          // Detect Tab Types
          const isPaymentTab = item.text.includes('Payment') || item.text.includes('Bills');
          const isMaintenanceTab = item.text.includes('Maintenance');
          const isSupportTab = item.text === 'Support Inbox' || item.text === 'Help Desk';

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                selected={location.pathname === item.path}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                  
                          {/* --- APPLY BADGES --- */}
                          {isPaymentTab ? (
                            <Badge badgeContent={paymentBadgeCount} color="error" invisible={paymentBadgeCount === 0}>
                              {item.icon}
                            </Badge>
                          ) : isMaintenanceTab ? (
                            <Badge badgeContent={maintenanceBadgeCount} color="error" invisible={maintenanceBadgeCount === 0}>
                              {item.icon}
                            </Badge>
                          ) : isSupportTab ? (
                            <Badge badgeContent={supportBadgeCount} color="error" invisible={supportBadgeCount === 0}>
                              {item.icon}
                            </Badge>
                          ) : (
                            item.icon
                          )}

                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => { navigate('/profile'); setMobileOpen(false); }} selected={location.pathname === '/profile'}>
            <ListItemIcon sx={{ color: location.pathname === '/profile' ? 'primary.main' : 'inherit' }}>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          
          {/* Centralized Top Bar text */}
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              textAlign: 'center', 
              fontWeight: 600, 
              fontFamily: "'Poppins', sans-serif" 
            }}
          >
            Smart Estates Administration and Maintenance System
          </Typography>
          
          {/* NOTIFICATION BELL */}
          <IconButton color="inherit" onClick={(e) => setNotifAnchorEl(e.currentTarget)}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* PROFILE AVATAR */}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 2 }}>
            <Avatar src={getProfileImageUrl()} sx={{ bgcolor: 'secondary.main' }}>
              {!getProfileImageUrl() && (user.first_name?.[0] || 'U')}
            </Avatar>
          </IconButton>

          {/* Profile Menu */}
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled><Typography variant="body2" fontWeight="bold">{user.first_name} {user.last_name}</Typography></MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}><ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>My Profile</MenuItem>
            <MenuItem onClick={handleLogout}><ListItemIcon><Logout fontSize="small" /></ListItemIcon>Logout</MenuItem>
          </Menu>

          {/* Notifications Popover */}
          <Popover
            open={Boolean(notifAnchorEl)}
            anchorEl={notifAnchorEl}
            onClose={() => setNotifAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>Notifications</Typography>
              <List>
                {notifications.length === 0 ? (
                  <ListItem><ListItemText primary="No notifications" secondary="You're all caught up!" /></ListItem>
                ) : (
                  notifications.map((notif) => (
                    <ListItem 
                      key={notif.id} 
                      button 
                      alignItems="flex-start"
                      onClick={() => { handleMarkAsRead(notif.id); if(notif.link) navigate(notif.link); }}
                      sx={{ bgcolor: notif.is_read ? 'transparent' : 'action.hover' }}
                    >
                      <ListItemText 
                        primary={notif.message} 
                        secondary={new Date(notif.created_at).toLocaleDateString()}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: notif.is_read ? 'normal' : 'bold' }}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          </Popover>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;