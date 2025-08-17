import mobileApiService from '../services/mobileApiService.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import createCsvWriter from 'csv-writer';
import moment from 'moment';
import fs from 'fs';
import path from 'path';

// Generate CSV Report
export const generateCsvReport = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { type, dateFrom, dateTo, department, status } = req.query;
    
    let data = [];
    let filename = '';

    switch (type) {
      case 'scans':
        const scans = await mobileApiService.getAllScans(token, { dateFrom, dateTo, department, status });
        data = scans.data || [];
        filename = `scans_report_${moment().format('YYYY-MM-DD_HH-mm')}.csv`;
        break;
      
      case 'users':
        const users = await mobileApiService.getAllUsers(token, { department });
        data = users.data || [];
        filename = `users_report_${moment().format('YYYY-MM-DD_HH-mm')}.csv`;
        break;
      
      case 'sessions':
        const sessions = await mobileApiService.getAllSessions(token, { dateFrom, dateTo, department });
        data = sessions.data || [];
        filename = `sessions_report_${moment().format('YYYY-MM-DD_HH-mm')}.csv`;
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: filename,
      header: getCsvHeaders(type)
    });

    // Write data to CSV
    await csvWriter.writeRecords(data);

    // Send file
    res.download(filename, filename, (err) => {
      if (err) {
        console.error('❌ CSV download error:', err);
      }
      // Clean up file after download
      fs.unlink(filename, (unlinkErr) => {
        if (unlinkErr) console.error('❌ File cleanup error:', unlinkErr);
      });
    });

  } catch (error) {
    console.error('❌ CSV report error:', error);
    return res.status(500).json({ error: 'Failed to generate CSV report' });
  }
};

// Generate Excel Report
export const generateExcelReport = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { type, dateFrom, dateTo, department, status } = req.query;
    
    let data = [];
    let filename = '';

    switch (type) {
      case 'scans':
        const scans = await mobileApiService.getAllScans(token, { dateFrom, dateTo, department, status });
        data = scans.data || [];
        filename = `scans_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
        break;
      
      case 'users':
        const users = await mobileApiService.getAllUsers(token, { department });
        data = users.data || [];
        filename = `users_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
        break;
      
      case 'sessions':
        const sessions = await mobileApiService.getAllSessions(token, { dateFrom, dateTo, department });
        data = sessions.data || [];
        filename = `sessions_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type);

    // Add headers
    const headers = getExcelHeaders(type);
    worksheet.addRow(headers);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.forEach(item => {
      const row = getExcelRowData(type, item);
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Write to file
    await workbook.xlsx.writeFile(filename);

    // Send file
    res.download(filename, filename, (err) => {
      if (err) {
        console.error('❌ Excel download error:', err);
      }
      // Clean up file after download
      fs.unlink(filename, (unlinkErr) => {
        if (unlinkErr) console.error('❌ File cleanup error:', unlinkErr);
      });
    });

  } catch (error) {
    console.error('❌ Excel report error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel report' });
  }
};

// Generate PDF Report
export const generatePdfReport = async (req, res) => {
  try {
    const token = req.headers['mobile-token'];
    if (!token) {
      return res.status(401).json({ error: 'Mobile backend token required' });
    }

    const { type, dateFrom, dateTo, department, status } = req.query;
    
    let data = [];
    let filename = '';

    switch (type) {
      case 'scans':
        const scans = await mobileApiService.getAllScans(token, { dateFrom, dateTo, department, status });
        data = scans.data || [];
        filename = `scans_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      
      case 'users':
        const users = await mobileApiService.getAllUsers(token, { department });
        data = users.data || [];
        filename = `users_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      
      case 'sessions':
        const sessions = await mobileApiService.getAllSessions(token, { dateFrom, dateTo, department });
        data = sessions.data || [];
        filename = `sessions_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Create PDF document
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filename);

    doc.pipe(stream);

    // Add title
    doc.fontSize(20).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`);
    doc.moveDown();

    // Add filters info
    if (dateFrom || dateTo || department || status) {
      doc.fontSize(14).text('Filters Applied:');
      if (dateFrom) doc.fontSize(10).text(`Date From: ${dateFrom}`);
      if (dateTo) doc.fontSize(10).text(`Date To: ${dateTo}`);
      if (department) doc.fontSize(10).text(`Department: ${department}`);
      if (status) doc.fontSize(10).text(`Status: ${status}`);
      doc.moveDown();
    }

    // Add data table
    const headers = getPdfHeaders(type);
    const tableTop = doc.y;
    let tableLeft = 50;

    // Draw headers
    headers.forEach((header, index) => {
      doc.fontSize(10).text(header, tableLeft + (index * 100), tableTop);
    });

    // Draw data rows
    data.slice(0, 50).forEach((item, rowIndex) => { // Limit to 50 rows for PDF
      const rowData = getPdfRowData(type, item);
      const rowY = tableTop + 20 + (rowIndex * 15);
      
      rowData.forEach((cell, colIndex) => {
        doc.fontSize(8).text(cell, tableLeft + (colIndex * 100), rowY);
      });
    });

    doc.end();

    // Wait for stream to finish
    stream.on('finish', () => {
      res.download(filename, filename, (err) => {
        if (err) {
          console.error('❌ PDF download error:', err);
        }
        // Clean up file after download
        fs.unlink(filename, (unlinkErr) => {
          if (unlinkErr) console.error('❌ File cleanup error:', unlinkErr);
        });
      });
    });

  } catch (error) {
    console.error('❌ PDF report error:', error);
    return res.status(500).json({ error: 'Failed to generate PDF report' });
  }
};

// Helper functions for different report types
function getCsvHeaders(type) {
  switch (type) {
    case 'scans':
      return [
        { id: 'barcode', title: 'Barcode' },
        { id: 'status', title: 'Status' },
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'session', title: 'Session ID' },
        { id: 'technician', title: 'Technician' }
      ];
    case 'users':
      return [
        { id: 'username', title: 'Username' },
        { id: 'department', title: 'Department' },
        { id: 'email', title: 'Email' },
        { id: 'role', title: 'Role' },
        { id: 'createdAt', title: 'Created At' }
      ];
    case 'sessions':
      return [
        { id: 'startTime', title: 'Start Time' },
        { id: 'endTime', title: 'End Time' },
        { id: 'technician', title: 'Technician' },
        { id: 'department', title: 'Department' },
        { id: 'scanCount', title: 'Scan Count' }
      ];
    default:
      return [];
  }
}

function getExcelHeaders(type) {
  switch (type) {
    case 'scans':
      return ['Barcode', 'Status', 'Timestamp', 'Session ID', 'Technician'];
    case 'users':
      return ['Username', 'Department', 'Email', 'Role', 'Created At'];
    case 'sessions':
      return ['Start Time', 'End Time', 'Technician', 'Department', 'Scan Count'];
    default:
      return [];
  }
}

function getExcelRowData(type, item) {
  switch (type) {
    case 'scans':
      return [
        item.barcode,
        item.status,
        moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        item.session,
        item.technician
      ];
    case 'users':
      return [
        item.username,
        item.department,
        item.email || '',
        item.role || 'technician',
        moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')
      ];
    case 'sessions':
      return [
        moment(item.startTime).format('YYYY-MM-DD HH:mm:ss'),
        item.endTime ? moment(item.endTime).format('YYYY-MM-DD HH:mm:ss') : 'Active',
        item.technician,
        item.department,
        item.scanCount || 0
      ];
    default:
      return [];
  }
}

function getPdfHeaders(type) {
  switch (type) {
    case 'scans':
      return ['Barcode', 'Status', 'Timestamp', 'Session'];
    case 'users':
      return ['Username', 'Department', 'Email', 'Role'];
    case 'sessions':
      return ['Start Time', 'End Time', 'Technician', 'Scans'];
    default:
      return [];
  }
}

function getPdfRowData(type, item) {
  switch (type) {
    case 'scans':
      return [
        item.barcode,
        item.status,
        moment(item.timestamp).format('MM/DD HH:mm'),
        item.session?.toString().slice(-8) || ''
      ];
    case 'users':
      return [
        item.username,
        item.department,
        item.email || '',
        item.role || 'technician'
      ];
    case 'sessions':
      return [
        moment(item.startTime).format('MM/DD HH:mm'),
        item.endTime ? moment(item.endTime).format('MM/DD HH:mm') : 'Active',
        item.technician,
        item.scanCount || 0
      ];
    default:
      return [];
  }
}








