import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Dashboard, Home, Build, People, Assessment } from '@mui/icons-material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children, currentPage, onPageChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Dashboard /> },
    { id: 'housing', label: 'Housing', icon: <Home /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Build /> },
    { id: 'tenants', label: 'Tenants', icon: <People /> },
    { id: 'reports', label: 'Reports', icon: <Assessment /> },
  ];

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onMenuClick={toggleDrawer} />
      <Sidebar
        open={drawerOpen}
        menuItems={menuItems}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: drawerOpen ? 0 : -30,
          transition: 'margin 0.2s',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;