import { Announcement } from "../models/announcement.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Admin/Teacher announcement banayega
export const createAnnouncement = async (req, res, next) => {
  try {
    const {
      title,
      message,
      target_role,
      target_class_id,
      priority,
      expires_at,
    } = req.body;

    if (!title || !message) {
      throw new ApiError(400, "Title and message are required");
    }

    const announcement = await Announcement.create({
      title,
      message,
      created_by: req.user.id,
      school_id: req.user.school_id,
      target_role: target_role || "all",
      target_class_id: target_class_id || null,
      priority: priority || "medium",
      expires_at: expires_at || null,
    });

    // Jis role ko target kiya hai unhe notification bhi bhejo
    await notifyTargetUsers({
      school_id: req.user.school_id,
      target_role,
      target_class_id,
      title,
      message,
      announcement_id: announcement._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Announcement created", announcement));
  } catch (error) {
    next(error);
  }
};


// Role ke hisaab se filter hoga automatically
export const getAnnouncements = async (req, res, next) => {
  try {
    const { school_id, role } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      school_id,
      is_active: true,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    };

    // Student ko sirf 'all' aur 'student' wali milegi
    // Teacher ko sirf 'all' aur 'teacher' wali milegi
    // Admin ko saari milegi
    if (role === "student") {
      filter.target_role = { $in: ["all", "student"] };
    } else if (role === "teacher") {
      filter.target_role = { $in: ["all", "teacher"] };
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate("created_by", "name role")
        .sort({ priority: -1, createdAt: -1 }) // high priority pehle
        .skip(skip)
        .limit(parseInt(limit)),
      Announcement.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(200, "Announcements fetched", {
        announcements,
        total,
        page: parseInt(page),
        total_pages: Math.ceil(total / limit),
      })
    );
  } catch (error) {
    next(error);
  }
};


export const getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findOne({
      _id: id,
      school_id: req.user.school_id,
      is_active: true,
    }).populate("created_by", "name role");

    if (!announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Announcement fetched", announcement));
  } catch (error) {
    next(error);
  }
};


export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, message, target_role, target_class_id, priority, expires_at } =
      req.body;

    const announcement = await Announcement.findOne({
      _id: id,
      school_id: req.user.school_id,
    });

    if (!announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    // Sirf creator ya admin update kar sakta hai
    if (
      req.user.role !== "admin" &&
      announcement.created_by.toString() !== req.user.id
    ) {
      throw new ApiError(403, "Not authorized to update this announcement");
    }

    if (title)                         announcement.title           = title;
    if (message)                       announcement.message         = message;
    if (target_role)                   announcement.target_role     = target_role;
    if (target_class_id !== undefined) announcement.target_class_id = target_class_id;
    if (priority)                      announcement.priority        = priority;
    if (expires_at)                    announcement.expires_at      = expires_at;

    await announcement.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Announcement updated", announcement));
  } catch (error) {
    next(error);
  }
};


export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findOne({
      _id: id,
      school_id: req.user.school_id,
    });

    if (!announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    if (
      req.user.role !== "admin" &&
      announcement.created_by.toString() !== req.user.id
    ) {
      throw new ApiError(403, "Not authorized to delete this announcement");
    }

    announcement.is_active = false;
    await announcement.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Announcement deleted successfully"));
  } catch (error) {
    next(error);
  }
};


const notifyTargetUsers = async ({
  school_id,
  target_role,
  title,
  message,
}) => {
  try {
    const userFilter = { school_id };
    if (target_role && target_role !== "all") {
      userFilter.role = target_role;
    }

    const users = await User.find(userFilter).select("_id");
    if (!users.length) return;

    const notifications = users.map((u) => ({
      user_id: u._id,
      title: `📢 ${title}`,
      message,
      type: "info",
    }));

    await Notification.insertMany(notifications);
  } catch (err) {
    console.error("Announcement notification failed:", err.message);
  }
};