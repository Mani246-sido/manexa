import { pool } from "../config/mysql.js";
import ApiResponse from "../utils/ApiResponse.js";

// Create Fee Structure 
const createFeeStructure = async (req, res) => {
  try {
    const { class_id, name, amount, frequency, academic_year } = req.body;
    const school_id = req.user.school_id;

    if (!class_id || !name || !amount || !frequency || !academic_year) {
      return res.status(400).json(new ApiResponse(400, "All fields required"));
    }

    // fee structure banao
    const [result] = await pool.query(
      `INSERT INTO fee_structures (school_id, class_id, name, amount, frequency, academic_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [school_id, class_id, name, amount, frequency, academic_year]
    );

    const fee_structure_id = result.insertId;

    // due dates calculate karo frequency ke hisaab se
    const dueDates = getDueDates(frequency, academic_year);

    // us class ke saare students fetch karo
    const [students] = await pool.query(
      "SELECT id FROM students WHERE class_id = ? AND school_id = ?",
      [class_id, school_id]
    );

    // har student ke liye har due date pe invoice banao
    let created = 0;
    for (const student of students) {
      for (const due_date of dueDates) {
        await pool.query(
          `INSERT INTO fee_invoices (student_id, school_id, fee_structure_id, amount, due_date, academic_year)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [student.id, school_id, fee_structure_id, amount, due_date, academic_year]
        );
        created++;
      }
    }

    res.status(201).json(new ApiResponse(201, "Fee structure created and invoices generated", {
      fee_structure_id,
      invoices_created: created,
      due_dates: dueDates
    }));

  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};
const getDueDates = (frequency, academic_year) => {
  
  const startYear = parseInt(academic_year.split('-')[0]);

  switch (frequency) {
    case 'monthly':
      // April se March tak 12 months
      return [
        `${startYear}-04-01`, `${startYear}-05-01`, `${startYear}-06-01`,
        `${startYear}-07-01`, `${startYear}-08-01`, `${startYear}-09-01`,
        `${startYear}-10-01`, `${startYear}-11-01`, `${startYear}-12-01`,
        `${startYear + 1}-01-01`, `${startYear + 1}-02-01`, `${startYear + 1}-03-01`
      ];

    case 'quarterly':
      // 4 quarters — April, July, October, January
      return [
        `${startYear}-04-01`,
        `${startYear}-07-01`,
        `${startYear}-10-01`,
        `${startYear + 1}-01-01`
      ];

    case 'half-yearly':
      // 2 installments — April, October
      return [
        `${startYear}-04-01`,
        `${startYear}-10-01`
      ];

    case 'annually':
      // ek baar — April mein
      return [`${startYear}-04-01`];

    default:
      return [`${startYear}-04-01`];
  }
};

// Get Fee Structures 
const getFeeStructures = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const { academic_year } = req.query;

    let query = `SELECT fs.*, c.class_name 
                 FROM fee_structures fs
                 JOIN classes c ON fs.class_id = c.id
                 WHERE fs.school_id = ?`;
    const params = [school_id];

    if (academic_year) {
      query += " AND fs.academic_year = ?";
      params.push(academic_year);
    }

    const [rows] = await pool.query(query, params);
    res.status(200).json(new ApiResponse(200, "Fee structures fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Generate Invoices for a Class
const generateInvoices = async (req, res) => {
  try {
    const { fee_structure_id, due_date } = req.body;
    const school_id = req.user.school_id;

    if (!fee_structure_id || !due_date) {
      return res.status(400).json(new ApiResponse(400, "fee_structure_id and due_date required"));
    }

    // fee structure fetch karo
    const [feeStructure] = await pool.query(
      "SELECT * FROM fee_structures WHERE id = ? AND school_id = ?",
      [fee_structure_id, school_id]
    );

    if (!feeStructure.length) {
      return res.status(404).json(new ApiResponse(404, "Fee structure not found"));
    }

    const fee = feeStructure[0];

    // us class ke saare students fetch karo
    const [students] = await pool.query(
      "SELECT id FROM students WHERE class_id = ? AND school_id = ?",
      [fee.class_id, school_id]
    );

    if (!students.length) {
      return res.status(404).json(new ApiResponse(404, "No students found in this class"));
    }

    // har student ka invoice banao , already exist karta hai to skip
    let created = 0;
    let skipped = 0;

    for (const student of students) {
      const [existing] = await pool.query(
        `SELECT id FROM fee_invoices 
         WHERE student_id = ? AND fee_structure_id = ? AND academic_year = ?`,
        [student.id, fee_structure_id, fee.academic_year]
      );

      if (existing.length) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO fee_invoices (student_id, school_id, fee_structure_id, amount, due_date, academic_year)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [student.id, school_id, fee_structure_id, fee.amount, due_date, fee.academic_year]
      );
      created++;
    }

    res.status(201).json(new ApiResponse(201, "Invoices generated", {
      created,
      skipped
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Record Payment (Admin/Teacher) 
const recordPayment = async (req, res) => {
  try {
    const { invoice_id, amount_paid, payment_mode, transaction_id, note } = req.body;
    const school_id = req.user.school_id;

    if (!invoice_id || !amount_paid || !payment_mode) {
      return res.status(400).json(new ApiResponse(400, "invoice_id, amount_paid, payment_mode required"));
    }

    // invoice fetch karo
    const [invoice] = await pool.query(
      "SELECT * FROM fee_invoices WHERE id = ? AND school_id = ?",
      [invoice_id, school_id]
    );

    if (!invoice.length) {
      return res.status(404).json(new ApiResponse(404, "Invoice not found"));
    }

    const inv = invoice[0];

    if (inv.status === 'paid') {
      return res.status(400).json(new ApiResponse(400, "Invoice already paid"));
    }

    // payment record karo
    await pool.query(
      `INSERT INTO fee_payments (invoice_id, student_id, school_id, amount_paid, payment_mode, transaction_id, recorded_by, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_id, inv.student_id, school_id, amount_paid, payment_mode, transaction_id || null, req.user.ref_id, note || null]
    );

    // total paid calculate karo
    const [payments] = await pool.query(
      "SELECT SUM(amount_paid) as total_paid FROM fee_payments WHERE invoice_id = ?",
      [invoice_id]
    );

    const totalPaid = payments[0].total_paid;

    // invoice status update karo
    let newStatus = 'partial';
    if (totalPaid >= inv.amount) newStatus = 'paid';

    await pool.query(
      "UPDATE fee_invoices SET status = ? WHERE id = ?",
      [newStatus, invoice_id]
    );

    res.status(200).json(new ApiResponse(200, "Payment recorded successfully", {
      invoice_id,
      amount_paid,
      total_paid: totalPaid,
      status: newStatus
    }));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Get Student Invoices (Student/Parent) 
const getMyInvoices = async (req, res) => {
  try {
    const student_id = req.user.ref_id;
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      `SELECT fi.*, fs.name as fee_name, fs.frequency,
              COALESCE(SUM(fp.amount_paid), 0) as total_paid
       FROM fee_invoices fi
       JOIN fee_structures fs ON fi.fee_structure_id = fs.id
       LEFT JOIN fee_payments fp ON fi.id = fp.invoice_id
       WHERE fi.student_id = ? AND fi.school_id = ?
       GROUP BY fi.id
       ORDER BY fi.due_date DESC`,
      [student_id, school_id]
    );

    res.status(200).json(new ApiResponse(200, "Invoices fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

//  Get All Invoices
const getAllInvoices = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const { status, class_id, academic_year } = req.query;

    let query = `
      SELECT fi.*, fs.name as fee_name, fs.frequency,
             s.name as student_name, s.registration_number,
             COALESCE(SUM(fp.amount_paid), 0) as total_paid
      FROM fee_invoices fi
      JOIN fee_structures fs ON fi.fee_structure_id = fs.id
      JOIN students s ON fi.student_id = s.id
      LEFT JOIN fee_payments fp ON fi.id = fp.invoice_id
      WHERE fi.school_id = ?`;

    const params = [school_id];

    if (status) { query += " AND fi.status = ?"; params.push(status); }
    if (class_id) { query += " AND s.class_id = ?"; params.push(class_id); }
    if (academic_year) { query += " AND fi.academic_year = ?"; params.push(academic_year); }

    query += " GROUP BY fi.id ORDER BY fi.due_date DESC";

    const [rows] = await pool.query(query, params);
    res.status(200).json(new ApiResponse(200, "Invoices fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Get fee Defaulters
const getDefaulters = async (req, res) => {
  try {
    const school_id = req.user.school_id;

    const [rows] = await pool.query(
      `SELECT fi.*, s.name as student_name, s.registration_number,
              fs.name as fee_name,
              DATEDIFF(CURDATE(), fi.due_date) as days_overdue,
              COALESCE(SUM(fp.amount_paid), 0) as total_paid
       FROM fee_invoices fi
       JOIN students s ON fi.student_id = s.id
       JOIN fee_structures fs ON fi.fee_structure_id = fs.id
       LEFT JOIN fee_payments fp ON fi.id = fp.invoice_id
       WHERE fi.school_id = ?
       AND fi.status IN ('pending', 'partial')
       AND fi.due_date < CURDATE()
       GROUP BY fi.id
       ORDER BY days_overdue DESC`,
      [school_id]
    );

    res.status(200).json(new ApiResponse(200, "Defaulters fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// Get Payment History
const getPaymentHistory = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const { student_id } = req.query;

    let query = `
      SELECT fp.*, s.name as student_name, fi.amount as invoice_amount,
             fs.name as fee_name
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN fee_invoices fi ON fp.invoice_id = fi.id
      JOIN fee_structures fs ON fi.fee_structure_id = fs.id
      WHERE fp.school_id = ?`;

    const params = [school_id];

    if (student_id) {
      query += " AND fp.student_id = ?";
      params.push(student_id);
    }

    query += " ORDER BY fp.paid_at DESC";

    const [rows] = await pool.query(query, params);
    res.status(200).json(new ApiResponse(200, "Payment history fetched", rows));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

// fee collection 
const getCollectionSummary = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const { academic_year } = req.query;

    const [summary] = await pool.query(
      `SELECT 
         COUNT(DISTINCT fi.id) as total_invoices,
         SUM(fi.amount) as total_amount,
         COALESCE(SUM(fp.amount_paid), 0) as total_collected,
         SUM(fi.amount) - COALESCE(SUM(fp.amount_paid), 0) as total_pending,
         COUNT(DISTINCT CASE WHEN fi.status = 'paid' THEN fi.id END) as paid_count,
         COUNT(DISTINCT CASE WHEN fi.status = 'pending' THEN fi.id END) as pending_count,
         COUNT(DISTINCT CASE WHEN fi.status = 'partial' THEN fi.id END) as partial_count,
         COUNT(DISTINCT CASE WHEN fi.status = 'overdue' THEN fi.id END) as overdue_count
       FROM fee_invoices fi
       LEFT JOIN fee_payments fp ON fi.id = fp.invoice_id
       WHERE fi.school_id = ?
       ${academic_year ? "AND fi.academic_year = ?" : ""}`,
      academic_year ? [school_id, academic_year] : [school_id]
    );

    res.status(200).json(new ApiResponse(200, "Collection summary fetched", summary[0]));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, error.message));
  }
};

export default {
  createFeeStructure,
  getFeeStructures,
  generateInvoices,
  recordPayment,
  getMyInvoices,
  getAllInvoices,
  getDefaulters,
  getPaymentHistory,
  getCollectionSummary
};