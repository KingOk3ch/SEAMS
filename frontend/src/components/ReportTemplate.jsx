import React, { forwardRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Grid } from '@mui/material';
import seamsLogo from '../assets/seamslogo.png'; // Imports the official system logo for the report header

// forwardRef is required by react-to-print to target this specific component in the virtual DOM
const ReportTemplate = forwardRef(({ reportTitle, dateRange, summaryStats, tableHeaders, tableData, generatedBy }, ref) => {
    
    // Helper to ensure currency is formatted consistently on the printed page
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '-';
        return `KES ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    };

    return (
        // The 'print: 0' padding ensures the document utilizes the full physical A4 page margins
        // Enforces the system-wide Poppins font to maintain brand consistency in physical documents
        <Box ref={ref} sx={{ p: { xs: 4, print: 0 }, bgcolor: 'white', color: 'black', fontFamily: "'Poppins', sans-serif" }}>
            
            {/* Corporate Header Section with Official Logo */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <img 
                        src={seamsLogo} 
                        alt="SEAMS Logo" 
                        style={{ height: '60px', width: 'auto', objectFit: 'contain' }} 
                    />
                    <Box>
                        <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ letterSpacing: 1 }}>
                            SEAMS
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Smart Estates Administration & Maintenance System
                        </Typography>
                    </Box>
                </Box>
                <Box textAlign="right">
                    <Typography variant="h5" fontWeight="bold" textTransform="uppercase">
                        {reportTitle}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Date Range:</strong> {dateRange || 'All Time'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Generated:</strong> {new Date().toLocaleDateString()}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mb: 4, borderWidth: 2, borderColor: 'primary.main' }} />

            {/* Executive Summary Metrics (Conditionally renders if summary data is passed) */}
            {summaryStats && summaryStats.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'primary.dark' }}>
                        Executive Summary
                    </Typography>
                    <Grid container spacing={3}>
                        {summaryStats.map((stat, index) => (
                            <Grid item xs={12} sm={4} key={index}>
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary" textTransform="uppercase">
                                        {stat.label}
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" sx={{ color: stat.color || 'text.primary' }}>
                                        {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Core Data Presentation Table */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'primary.dark' }}>
                Detailed Audit Log
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 4 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                            {tableHeaders.map((header, index) => (
                                <TableCell key={index} sx={{ fontWeight: 'bold', color: '#334155' }}>
                                    {header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={tableHeaders.length} align="center" sx={{ py: 3, fontStyle: 'italic' }}>
                                    No records found for this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tableData.map((row, rowIndex) => (
                                <TableRow key={rowIndex} sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                                    {Object.values(row).map((cellValue, cellIndex) => (
                                        <TableCell key={cellIndex} sx={{ borderColor: '#f1f5f9' }}>
                                            {cellValue}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Document Footer Verification */}
            <Box sx={{ mt: 8, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', pt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Generated by: <strong>{generatedBy || 'System Administrator'}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Official SEAMS Audit Document
                </Typography>
            </Box>
        </Box>
    );
});

export default ReportTemplate;