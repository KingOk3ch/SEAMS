import React, { useState } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import PaymentIcon from '@mui/icons-material/Payment';
import DescriptionIcon from '@mui/icons-material/Description';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

function Layout({ children, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the latest user data from local storage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  // Helper function to get the full profile image URL
  const getProfileImageUrl = () => {
    if (!user.profile_picture) return undefined;
    // If the URL is already absolute, use it as is
    if (user.profile_picture.startsWith('http')) {
      return user.profile_picture;
    }
    // Otherwise, prepend the backend URL
    return `http://localhost:8000${user.profile_picture}`;
  };

  const getMenuItems = () => {
    const role = user.role;

    if (role === 'estate_admin') {
      return [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Houses', icon: <HomeIcon />, path: '/houses' },
        { text: 'Tenants', icon: <PeopleIcon />, path: '/tenants' },
        { text: 'Users', icon: <PersonAddIcon />, path: '/users' },
        { text: 'Contracts', icon: <DescriptionIcon />, path: '/contracts' },
        { text: 'Payments', icon: <PaymentIcon />, path: '/payments' },
        { text: 'Maintenance', icon: <BuildIcon />, path: '/maintenance' },
      ];
    }

    if (role === 'technician') {
      return [
        { text: 'Maintenance Requests', icon: <BuildIcon />, path: '/maintenance' },
      ];
    }

    if (role === 'tenant') {
      return [
        { text: 'My Dashboard', icon: <DashboardIcon />, path: '/tenant-dashboard' },
        { text: 'Maintenance', icon: <BuildIcon />, path: '/maintenance' },
      ];
    }

    return [];
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          SEAMS
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Main Menu Items */}
      <List sx={{ flexGrow: 1 }}>
        {getMenuItems().map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* Profile Link Pinned to Bottom */}
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => navigate('/profile')}
            selected={location.pathname === '/profile'}
          >
            <ListItemIcon sx={{ color: location.pathname === '/profile' ? 'primary.main' : 'inherit' }}>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Staff Estates Administration & Management System
          </Typography>
          
          {/* Top Right Avatar Menu */}
          <IconButton onClick={handleProfileClick} sx={{ ml: 2 }}>
            {/* Use src for image, fallback to initial if no image exists */}
            <Avatar 
              src={getProfileImageUrl()} 
              sx={{ bgcolor: 'secondary.main' }}
            >
              {/* Show initial only if there is no profile picture URL */}
              {!getProfileImageUrl() && (user.first_name?.[0] || user.username?.[0] || 'U')}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {user.first_name} {user.last_name}
              </Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                {user.role?.replace('_', ' ').toUpperCase()}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleProfileClose(); navigate('/profile'); }}>
              <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
              My Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;