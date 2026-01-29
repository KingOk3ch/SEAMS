import React, { useState, useEffect } from 'react';
import { Drawer, Toolbar, Box, List, ListItem, ListItemIcon, ListItemText, Badge } from '@mui/material';

const Sidebar = ({ open, menuItems, currentPage, onPageChange }) => {
  const [badgeCount, setBadgeCount] = useState(0);

  // Smart Fetch Function
  const fetchBadgeCount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) return;
      
      const user = JSON.parse(userStr);
      // Robust Admin Check: Check staff status or role
      const isAdmin = user.is_staff || user.is_superuser || user.role === 'estate_admin' || user.role === 'admin';

      let url = '';
      let filterFn = () => false;

      if (isAdmin) {
        // Admin: Count payments where is_verified is FALSE
        url = 'http://localhost:8000/api/payments/';
        filterFn = (item) => item.is_verified === false;
      } else {
        // Tenant: Count bills where is_paid is FALSE
        url = 'http://localhost:8000/api/bills/';
        filterFn = (item) => item.is_paid === false;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        let data = await response.json();
        
        // --- CRITICAL FIX: Handle Pagination ---
        if (data.results) data = data.results;
        // ---------------------------------------
        
        if (Array.isArray(data)) {
            const count = data.filter(filterFn).length;
            setBadgeCount(count);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sidebar badge count", error);
    }
  };

  useEffect(() => {
    fetchBadgeCount();
    // Poll every 5 seconds to keep the badge instant
    const interval = setInterval(fetchBadgeCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          {menuItems.map((item) => {
            // AGGRESSIVE MATCHING: Check ID or Label for "payment" or "financ"
            const id = (item.id || '').toLowerCase();
            const label = (item.label || '').toLowerCase();
            const isPaymentTab = id.includes('payment') || label.includes('payment') || id.includes('financ') || label.includes('financ');

            return (
              <ListItem
                button
                key={item.id}
                selected={currentPage === item.id}
                onClick={() => onPageChange(item.id)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                  },
                }}
              >
                <ListItemIcon>
                  {isPaymentTab ? (
                    <Badge 
                        badgeContent={badgeCount} 
                        color="error" 
                        invisible={badgeCount === 0}
                        sx={{ '& .MuiBadge-badge': { right: -3, top: 3 } }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;