import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip } from '@mui/material';
import { Home } from '@mui/icons-material';

const HousingPage = () => {
  const houses = [
    { no: '45B', type: '3 Bedroom', status: 'Occupied', occupant: 'Jane Smith' },
    { no: '23A', type: '2 Bedroom', status: 'Vacant', occupant: '-' },
    { no: '67C', type: '4 Bedroom', status: 'Under Repair', occupant: '-' },
    { no: '12D', type: '3 Bedroom', status: 'Occupied', occupant: 'Mike Johnson' },
    { no: '89E', type: '2 Bedroom', status: 'Vacant', occupant: '-' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Housing Management
        </Typography>
        <Button variant="contained" startIcon={<Home />}>
          Add New House
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#5C7E6D', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Occupied Houses
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                198
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                80.8% Occupancy Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#F59E0B', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vacant Houses
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                47
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Available for allocation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#DC2626', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Under Repair
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                12
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Temporarily unavailable
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* House Inventory Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                House Inventory
              </Typography>
              <Box sx={{ overflowX: 'auto', mt: 2 }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Box component="thead">
                    <Box component="tr" sx={{ borderBottom: '2px solid #e0e0e0' }}>
                      <Box component="th" sx={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                        House No.
                      </Box>
                      <Box component="th" sx={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                        Type
                      </Box>
                      <Box component="th" sx={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                        Status
                      </Box>
                      <Box component="th" sx={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                        Occupant
                      </Box>
                      <Box component="th" sx={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                        Actions
                      </Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {houses.map((house, idx) => (
                      <Box component="tr" key={idx} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                        <Box component="td" sx={{ padding: '12px' }}>
                          {house.no}
                        </Box>
                        <Box component="td" sx={{ padding: '12px' }}>
                          {house.type}
                        </Box>
                        <Box component="td" sx={{ padding: '12px' }}>
                          <Chip
                            label={house.status}
                            size="small"
                            color={
                              house.status === 'Occupied'
                                ? 'success'
                                : house.status === 'Vacant'
                                ? 'warning'
                                : 'error'
                            }
                          />
                        </Box>
                        <Box component="td" sx={{ padding: '12px' }}>
                          {house.occupant}
                        </Box>
                        <Box component="td" sx={{ padding: '12px' }}>
                          <Button size="small" variant="outlined">
                            View
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HousingPage;