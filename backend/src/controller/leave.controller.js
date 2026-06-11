import { Leave } from "../models/leave.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { pool } from "../config/mysql.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";


const calcDays = (from, to) => {
  const diff = new Date(to) - new Date(from);
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; // inclusive
};

export const applyLeave = async (req, res, next) => {
  try {
    const { leave_type, from_date, to_date, reason } = req.body;

    if (!leave_type || !from_date || !to_date || !reason) {
      throw new ApiError(400, "leave_type, from_date, to_date, reason required");
    }

    const from = new Date(from_date);
    const to   = new Date(to_date);

    if (from > to) {
      throw new ApiError(400, "from_date cannot be after to_date");
    }

    // Past date check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from < today) {
      throw new ApiError(400, "Cannot apply leave for past dates");
    }

    // Duplicate check — same dates pe already pending/approved leave hai?
    const existing = await Leave.findOne({
      student_id: req.user.ref_id,
      school_id:  req.user.school_id,
      status:     { $in: ["pending", "approved"] },
      $or: [
        { from_date: { $lte: to }, to_date: { $gte: from } }, // overlapping
      ],
    });

    if (existing) {
      throw new ApiError(
        400,
        "You already have a pending/approved leave overlapping these dates"
      );
    }

    const total_days = calcDays(from, to);

    const leave = await Leave.create({
      student_id:       req.user.ref_id,
      student_mongo_id: req.user.id,
      school_id:        req.user.school_id,
      leave_type,
      from_date:        from,
      to_date:          to,
      total_days,
      reason,
      attachment_url: req.file ? `/uploads/${req.file.filename}` : null,
    });

    // Teachers ko notify karo
    const teachers = await User.find({
      school_id: req.user.school_id,
      role:      "teacher",
    }).select("_id");

    if (teachers.length) {
      const notifications = teachers.map((t) => ({
        user_id: t._id,
        title:   "📋 New Leave Application",
        message: `${req.user.name} has applied for ${total_days} day(s) leave from ${from_date} to ${to_date}.`,
        type:    "info",
      }));
      await Notification.insertMany(notifications);
    }

    return res
      .status(201)
      .json(new ApiResponse(201, "Leave applied successfully", leave));
  } catch (error) {
    next(error);
  }
};


export const getMyLeaves = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      student_id: req.user.ref_id,
      school_id:  req.user.school_id,
    };
    if (status) filter.status = status;

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate("reviewed_by", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(200, "Leaves fetched", {
        leaves,
        total,
        page:        parseInt(page),
        total_pages: Math.ceil(total / limit),
      })
    );
  } catch (error) {
    next(error);
  }
};


export const getAllLeaves = async (req, res, next) => {
  try {
    const { status, class_id, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { school_id: req.user.school_id };
    if (status) filter.status = status;

    // class_id filter — pehle us class ke student ids laao MySQL se
    let studentIds = null;
    if (class_id) {
      const [students] = await pool.query(
        "SELECT id FROM students WHERE class_id = ? AND school_id = ?",
        [class_id, req.user.school_id]
      );
      studentIds = students.map((s) => s.id);
      if (!studentIds.length) {
        return res
          .status(200)
          .json(new ApiResponse(200, "No leaves found", { leaves: [], total: 0 }));
      }
      filter.student_id = { $in: studentIds };
    }

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate("student_mongo_id", "name email")
        .populate("reviewed_by", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(filter),
    ]);

    // Student name MySQL se attach karo
    const studentIdsInLeaves = [...new Set(leaves.map((l) => l.student_id))];
    let studentMap = {};
    if (studentIdsInLeaves.length) {
      const [rows] = await pool.query(
        `SELECT s.id, s.name, s.registration_number, c.class_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.id IN (${studentIdsInLeaves.map(() => "?").join(",")})`,
        studentIdsInLeaves
      );
      rows.forEach((r) => (studentMap[r.id] = r));
    }

    const enriched = leaves.map((l) => ({
      ...l.toObject(),
      student_info: studentMap[l.student_id] || null,
    }));

    return res.status(200).json(
      new ApiResponse(200, "Leaves fetched", {
        leaves: enriched,
        total,
        page:        parseInt(page),
        total_pages: Math.ceil(total / limit),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getLeaveById = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({
      _id:       req.params.id,
      school_id: req.user.school_id,
    })
      .populate("student_mongo_id", "name email")
      .populate("reviewed_by", "name role");

    if (!leave) throw new ApiError(404, "Leave not found");

    // Student sirf apni leave dekh sakta hai
    if (
      req.user.role === "student" &&
      leave.student_id !== req.user.ref_id
    ) {
      throw new ApiError(403, "Access denied");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Leave fetched", leave));
  } catch (error) {
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({
      _id:       req.params.id,
      school_id: req.user.school_id,
    });

    if (!leave)              throw new ApiError(404, "Leave not found");
    if (leave.status !== "pending")
      throw new ApiError(400, `Leave is already ${leave.status}`);

    leave.status      = "approved";
    leave.reviewed_by = req.user.id;
    leave.reviewed_at = new Date();
    await leave.save();

    // Student ko notify karo
    await Notification.create({
      user_id: leave.student_mongo_id,
      title:   "✅ Leave Approved",
      message: `Your leave from ${leave.from_date.toDateString()} to ${leave.to_date.toDateString()} has been approved.`,
      type:    "success",
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Leave approved successfully", leave));
  } catch (error) {
    next(error);
  }
};


export const rejectLeave = async (req, res, next) => {
  try {
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      throw new ApiError(400, "rejection_reason is required");
    }

    const leave = await Leave.findOne({
      _id:       req.params.id,
      school_id: req.user.school_id,
    });

    if (!leave)             throw new ApiError(404, "Leave not found");
    if (leave.status !== "pending")
      throw new ApiError(400, `Leave is already ${leave.status}`);

    leave.status           = "rejected";
    leave.reviewed_by      = req.user.id;
    leave.reviewed_at      = new Date();
    leave.rejection_reason = rejection_reason;
    await leave.save();

    // Student ko notify karo
    await Notification.create({
      user_id: leave.student_mongo_id,
      title:   "❌ Leave Rejected",
      message: `Your leave from ${leave.from_date.toDateString()} to ${leave.to_date.toDateString()} has been rejected. Reason: ${rejection_reason}`,
      type:    "warning",
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Leave rejected", leave));
  } catch (error) {
    next(error);
  }
};


export const cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({
      _id:        req.params.id,
      student_id: req.user.ref_id,
      school_id:  req.user.school_id,
    });

    if (!leave) throw new ApiError(404, "Leave not found");

    if (leave.status !== "pending") {
      throw new ApiError(
        400,
        `Cannot cancel a leave that is already ${leave.status}`
      );
    }

    leave.status = "rejected";
    leave.rejection_reason = "Cancelled by student";
    leave.reviewed_at      = new Date();
    await leave.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Leave cancelled successfully"));
  } catch (error) {
    next(error);
  }
};


export const getLeaveStats = async (req, res, next) => {
  try {
    const school_id = req.user.school_id;

    const [pending, approved, rejected, thisMonth] = await Promise.all([
      Leave.countDocuments({ school_id, status: "pending" }),
      Leave.countDocuments({ school_id, status: "approved" }),
      Leave.countDocuments({ school_id, status: "rejected" }),
      Leave.countDocuments({
        school_id,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    return res.status(200).json(
      new ApiResponse(200, "Leave stats fetched", {
        pending,
        approved,
        rejected,
        this_month: thisMonth,
        total: pending + approved + rejected,
      })
    );
  } catch (error) {
    next(error);
  }
};
