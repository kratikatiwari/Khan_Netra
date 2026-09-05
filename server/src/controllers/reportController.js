const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

exports.generatePDF = async (req, res, next) => {
  try {
    const { type = 'compliance', mine_id, from_date, to_date } = req.query;
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=KhanNetra-${type}-${Date.now()}.pdf`);
    doc.pipe(res);

    // Header bar
    doc.fillColor('#1e3a5f').rect(0, 0, doc.page.width, 75).fill();
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('KhanNetra', 50, 18);
    doc.fontSize(9).font('Helvetica').text('AI-Based Smart Governance & Compliance Monitoring System for Coal Mines', 50, 43);
    doc.text('Directorate General of Mines Safety | Ministry of Coal | Govt. of India', 50, 57);
    doc.y = 95;

    const titles = { compliance:'Compliance Status Report', violations:'Violations & Corrective Actions Report', incidents:'Safety Incidents Report', mine:'Mine Status Report' };
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1e3a5f').text(titles[type]||'Comprehensive Report', { align:'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toLocaleDateString('en-IN',{dateStyle:'full'})} | By: ${req.user.full_name}`, { align:'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#1e3a5f').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    if (type === 'compliance' || type === 'mine') {
      const mf = mine_id ? `WHERE m.id='${mine_id}'` : '';
      const mines = (await query(`SELECT id,name,state,compliance_score,risk_score,safety_score,environmental_score,status FROM mines ${mf} ORDER BY compliance_score DESC`)).rows;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f').text('Mine Compliance Overview');
      doc.moveDown(0.3);
      for (const m of mines) {
        const c = parseFloat(m.compliance_score)||0;
        const col = c >= 80 ? '#16a34a' : c >= 60 ? '#d97706' : '#dc2626';
        doc.fontSize(10).font('Helvetica-Bold').fillColor(col).text(`${m.name}  (${m.state})`);
        doc.fontSize(9).font('Helvetica').fillColor('#444').text(`  Status: ${m.status.toUpperCase()}  |  Compliance: ${c.toFixed(1)}%  |  Risk: ${parseFloat(m.risk_score||0).toFixed(1)}%  |  Safety: ${parseFloat(m.safety_score||0).toFixed(1)}%`);
        doc.moveDown(0.2);
      }
    }

    if (type === 'violations') {
      const mf = mine_id ? `AND v.mine_id='${mine_id}'` : '';
      const rows = (await query(`SELECT v.violation_number,m.name as mine_name,v.severity,v.category,v.description,v.detected_date,v.status,v.fine_amount FROM violations v JOIN mines m ON v.mine_id=m.id WHERE 1=1 ${mf} ORDER BY v.detected_date DESC LIMIT 50`)).rows;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f').text(`Total Violations: ${rows.length}`);
      doc.moveDown(0.3);
      for (const v of rows) {
        const col = v.severity==='critical'?'#dc2626':v.severity==='high'?'#d97706':'#333';
        doc.fontSize(10).font('Helvetica-Bold').fillColor(col).text(`${v.violation_number}  |  ${v.severity.toUpperCase()}  |  ${v.category}`);
        doc.fontSize(9).font('Helvetica').fillColor('#444').text(`Mine: ${v.mine_name}  |  Date: ${v.detected_date}  |  Status: ${v.status}  |  Fine: ₹${Number(v.fine_amount||0).toLocaleString('en-IN')}`);
        if (v.description) doc.text(`  ${v.description.substring(0,120)}...`);
        doc.moveDown(0.3);
      }
    }

    if (type === 'incidents') {
      const mf = mine_id ? `AND i.mine_id='${mine_id}'` : '';
      const rows = (await query(`SELECT i.incident_number,m.name as mine_name,i.type,i.severity,i.description,i.incident_date,i.injuries_count,i.fatalities_count,i.status FROM incidents i JOIN mines m ON i.mine_id=m.id WHERE 1=1 ${mf} ORDER BY i.incident_date DESC LIMIT 50`)).rows;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f').text(`Total Incidents: ${rows.length}`);
      doc.moveDown(0.3);
      for (const i of rows) {
        const col = i.severity==='fatal'?'#dc2626':i.severity==='serious'?'#d97706':'#333';
        doc.fontSize(10).font('Helvetica-Bold').fillColor(col).text(`${i.incident_number}  |  ${i.severity.toUpperCase()}  |  ${i.type}`);
        doc.fontSize(9).font('Helvetica').fillColor('#444').text(`Mine: ${i.mine_name}  |  Date: ${i.incident_date}  |  Injuries: ${i.injuries_count}  |  Fatalities: ${i.fatalities_count}`);
        doc.moveDown(0.3);
      }
    }

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(7).fillColor('#aaa').text(`Page ${i+1} of ${range.count}  |  KhanNetra – Confidential Government Document`, 50, doc.page.height - 28, { align:'center' });
    }
    doc.end();
  } catch (err) { next(err); }
};

exports.generateExcel = async (req, res, next) => {
  try {
    const { type, mine_id } = req.query;
    const wb = XLSX.utils.book_new();
    const mfV = mine_id ? `WHERE v.mine_id='${mine_id}'` : '';
    const mfI = mine_id ? `WHERE i.mine_id='${mine_id}'` : '';
    const mfC = mine_id ? `WHERE cr.mine_id='${mine_id}'` : '';

    if (!type || type === 'violations') {
      const rows = (await query(`SELECT v.violation_number,m.name as mine_name,m.state,v.type,v.severity,v.category,v.description,v.detected_date,v.status,v.fine_amount,v.regulation_reference FROM violations v JOIN mines m ON v.mine_id=m.id ${mfV} ORDER BY v.detected_date DESC`)).rows;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Violations');
    }
    if (!type || type === 'mines') {
      const rows = (await query(`SELECT mine_id,name,type,state,district,status,compliance_score,risk_score,safety_score,environmental_score,workers_count,current_production_mt,production_capacity_mt,license_number,license_expiry FROM mines ORDER BY state,name`)).rows;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Mines');
    }
    if (!type || type === 'incidents') {
      const rows = (await query(`SELECT i.incident_number,m.name as mine_name,i.type,i.severity,i.description,i.incident_date,i.injuries_count,i.fatalities_count,i.status,i.dgms_notified FROM incidents i JOIN mines m ON i.mine_id=m.id ${mfI} ORDER BY i.incident_date DESC`)).rows;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Incidents');
    }
    if (!type || type === 'compliance') {
      const rows = (await query(`SELECT m.name as mine_name,cr.category,cr.parameter_name,cr.required_value,cr.actual_value,cr.status,cr.score,cr.verification_date FROM compliance_records cr JOIN mines m ON cr.mine_id=m.id ${mfC} ORDER BY cr.status,cr.category`)).rows;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Compliance');
    }

    const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=KhanNetra-Export-${Date.now()}.xlsx`);
    res.send(buf);
  } catch (err) { next(err); }
};
