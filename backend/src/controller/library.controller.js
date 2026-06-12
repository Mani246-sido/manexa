import { Book, BookIssue } from "../models/library.model.js";
import { Notification }    from "../models/notification.model.js";
import { User }            from "../models/user.model.js";
import { pool }            from "../config/mysql.js";
import ApiResponse         from "../utils/ApiResponse.js";
import { ApiError }        from "../utils/ApiError.js";

const calcFine = (due_date, return_date, fine_per_day) => {
  const due    = new Date(due_date);
  const ret    = new Date(return_date || Date.now());
  const diffMs = ret - due;
  if (diffMs <= 0) return 0;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days * fine_per_day;
};


export const addBook = async (req, res, next) => {
  try {
    const {
      title, author, isbn, publisher, edition,
      category, language, total_copies, shelf_location, description,
    } = req.body;

    if (!title || !author || !total_copies) {
      throw new ApiError(400, "title, author, total_copies required");
    }

    // ISBN duplicate check
    if (isbn) {
      const exists = await Book.findOne({ isbn, school_id: req.user.school_id });
      if (exists) throw new ApiError(400, "Book with this ISBN already exists");
    }

    const book = await Book.create({
      school_id:        req.user.school_id,
      title,
      author,
      isbn:             isbn           || null,
      publisher:        publisher      || null,
      edition:          edition        || null,
      category:         category       || "other",
      language:         language       || "English",
      total_copies:     parseInt(total_copies),
      available_copies: parseInt(total_copies),
      shelf_location:   shelf_location || null,
      cover_image:      req.file ? `/uploads/${req.file.filename}` : null,
      description:      description    || null,
      added_by:         req.user.id,
    });

    return res.status(201).json(new ApiResponse(201, "Book added successfully", book));
  } catch (error) {
    next(error);
  }
};


export const getAllBooks = async (req, res, next) => {
  try {
    const { category, search, available, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { school_id: req.user.school_id, is_active: true };
    if (category)  filter.category = category;
    if (available === "true") filter.available_copies = { $gt: 0 };
    if (search) {
      filter.$or = [
        { title:  { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn:   { $regex: search, $options: "i" } },
      ];
    }

    const [books, total] = await Promise.all([
      Book.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Book.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(200, "Books fetched", {
        books,
        total,
        page:        parseInt(page),
        total_pages: Math.ceil(total / limit),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id, school_id: req.user.school_id, is_active: true,
    });
    if (!book) throw new ApiError(404, "Book not found");

    return res.status(200).json(new ApiResponse(200, "Book fetched", book));
  } catch (error) {
    next(error);
  }
};


export const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id, school_id: req.user.school_id,
    });
    if (!book) throw new ApiError(404, "Book not found");

    const fields = ["title","author","isbn","publisher","edition","category",
                    "language","shelf_location","description"];
    fields.forEach((f) => { if (req.body[f] !== undefined) book[f] = req.body[f]; });

    // Total copies update karo to available bhi adjust karo
    if (req.body.total_copies !== undefined) {
      const diff           = parseInt(req.body.total_copies) - book.total_copies;
      book.total_copies    = parseInt(req.body.total_copies);
      book.available_copies = Math.max(0, book.available_copies + diff);
    }

    await book.save();
    return res.status(200).json(new ApiResponse(200, "Book updated", book));
  } catch (error) {
    next(error);
  }
};

export const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id, school_id: req.user.school_id,
    });
    if (!book) throw new ApiError(404, "Book not found");

    // Check karo koi issued hai
    const activeIssue = await BookIssue.findOne({ book_id: book._id, status: "issued" });
    if (activeIssue) {
      throw new ApiError(400, "Cannot delete book — copies are currently issued");
    }

    book.is_active = false;
    await book.save();

    return res.status(200).json(new ApiResponse(200, "Book deleted successfully"));
  } catch (error) {
    next(error);
  }
};


export const issueBook = async (req, res, next) => {
  try {
    const {
      book_id,
      issued_to_id,
      issued_to_role,
      due_date,
      fine_per_day,
    } = req.body;

    if (!book_id || !issued_to_id || !issued_to_role || !due_date) {
      throw new ApiError(400, "book_id, issued_to_id, issued_to_role, due_date required");
    }

    if (new Date(due_date) <= new Date()) {
      throw new ApiError(400, "due_date must be a future date");
    }

    // Book exist + available check
    const book = await Book.findOne({
      _id: book_id, school_id: req.user.school_id, is_active: true,
    });
    if (!book) throw new ApiError(404, "Book not found");
    if (book.available_copies <= 0) {
      throw new ApiError(400, "No copies available for this book");
    }

    // User exist check
    const issuedUser = await User.findOne({
      ref_id:    parseInt(issued_to_id),
      role:      issued_to_role,
      school_id: req.user.school_id,
    });
    if (!issuedUser) throw new ApiError(404, "User not found");

    // Already issued check — same user same book
    const alreadyIssued = await BookIssue.findOne({
      book_id,
      issued_to_id:   parseInt(issued_to_id),
      issued_to_role,
      status:         "issued",
    });
    if (alreadyIssued) {
      throw new ApiError(400, "This book is already issued to this user");
    }

    // Issue create karo
    const issue = await BookIssue.create({
      school_id:       req.user.school_id,
      book_id,
      issued_to_id:    parseInt(issued_to_id),
      issued_to_role,
      issued_to_mongo: issuedUser._id,
      issued_by:       req.user.id,
      issue_date:      new Date(),
      due_date:        new Date(due_date),
      fine_per_day:    fine_per_day || 2,
    });

    // Available copies kam karo
    book.available_copies -= 1;
    await book.save();

    // User ko notify karo
    await Notification.create({
      user_id: issuedUser._id,
      title:   "📚 Book Issued",
      message: `"${book.title}" by ${book.author} issued to you. Please return by ${new Date(due_date).toDateString()}.`,
      type:    "info",
    });

    return res.status(201).json(
      new ApiResponse(201, "Book issued successfully", {
        issue,
        book: { title: book.title, author: book.author },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const returnBook = async (req, res, next) => {
  try {
    const issue = await BookIssue.findOne({
      _id:       req.params.issueId,
      school_id: req.user.school_id,
      status:    "issued",
    });
    if (!issue) throw new ApiError(404, "Issue record not found or already returned");

    const return_date = new Date();
    const fine_amount = calcFine(issue.due_date, return_date, issue.fine_per_day);

    issue.return_date = return_date;
    issue.fine_amount = fine_amount;
    issue.status      = "returned";
    issue.remarks     = req.body.remarks || null;
    await issue.save();

    // Available copies badhao
    await Book.findByIdAndUpdate(issue.book_id, { $inc: { available_copies: 1 } });

    // User ko notify
    const notifMsg = fine_amount > 0
      ? `"${issue.book_id}" returned. Fine: ₹${fine_amount}. Please pay at library.`
      : `Book returned successfully. No fine. Thank you!`;

    await Notification.create({
      user_id: issue.issued_to_mongo,
      title:   "📚 Book Returned",
      message: notifMsg,
      type:    fine_amount > 0 ? "warning" : "success",
    });

    return res.status(200).json(
      new ApiResponse(200, "Book returned successfully", {
        return_date,
        fine_amount,
        fine_paid: issue.fine_paid,
      })
    );
  } catch (error) {
    next(error);
  }
};


export const payFine = async (req, res, next) => {
  try {
    const issue = await BookIssue.findOne({
      _id:       req.params.issueId,
      school_id: req.user.school_id,
    });
    if (!issue)            throw new ApiError(404, "Issue record not found");
    if (issue.fine_paid)   throw new ApiError(400, "Fine already paid");
    if (!issue.fine_amount) throw new ApiError(400, "No fine to pay");

    issue.fine_paid = true;
    await issue.save();

    await Notification.create({
      user_id: issue.issued_to_mongo,
      title:   "✅ Fine Paid",
      message: `Library fine of ₹${issue.fine_amount} paid successfully.`,
      type:    "success",
    });

    return res.status(200).json(new ApiResponse(200, "Fine paid successfully"));
  } catch (error) {
    next(error);
  }
};

export const markBookLost = async (req, res, next) => {
  try {
    const issue = await BookIssue.findOne({
      _id:       req.params.issueId,
      school_id: req.user.school_id,
      status:    "issued",
    });
    if (!issue) throw new ApiError(404, "Issue record not found");

    issue.status = "lost";
    issue.remarks = req.body.remarks || "Marked as lost";
    await issue.save();

    // Total copies kam karo permanently
    await Book.findByIdAndUpdate(issue.book_id, {
      $inc: { total_copies: -1 },
    });

    await Notification.create({
      user_id: issue.issued_to_mongo,
      title:   "⚠️ Book Marked as Lost",
      message: `A library book issued to you has been marked as lost. Please contact the library.`,
      type:    "warning",
    });

    return res.status(200).json(new ApiResponse(200, "Book marked as lost"));
  } catch (error) {
    next(error);
  }
};


export const getMyBooks = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = {
      issued_to_id:   req.user.ref_id,
      issued_to_role: req.user.role,
      school_id:      req.user.school_id,
    };
    if (status) filter.status = status;

    const issues = await BookIssue.find(filter)
      .populate("book_id", "title author isbn shelf_location")
      .sort({ createdAt: -1 });

    // Fine calculate karo for currently issued (overdue check)
    const enriched = issues.map((i) => {
      const obj   = i.toObject();
      const today = new Date();
      if (i.status === "issued" && today > new Date(i.due_date)) {
        obj.current_fine = calcFine(i.due_date, today, i.fine_per_day);
        obj.is_overdue   = true;
        obj.overdue_days = Math.ceil((today - new Date(i.due_date)) / (1000 * 60 * 60 * 24));
      } else {
        obj.current_fine = 0;
        obj.is_overdue   = false;
      }
      return obj;
    });

    return res.status(200).json(new ApiResponse(200, "My books fetched", enriched));
  } catch (error) {
    next(error);
  }
};


export const getAllIssues = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { school_id: req.user.school_id };
    if (status) filter.status = status;

    const [issues, total] = await Promise.all([
      BookIssue.find(filter)
        .populate("book_id",         "title author isbn")
        .populate("issued_to_mongo", "name email")
        .populate("issued_by",       "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BookIssue.countDocuments(filter),
    ]);

    const enriched = issues.map((i) => {
      const obj   = i.toObject();
      const today = new Date();
      if (i.status === "issued" && today > new Date(i.due_date)) {
        obj.current_fine = calcFine(i.due_date, today, i.fine_per_day);
        obj.is_overdue   = true;
        obj.overdue_days = Math.ceil((today - new Date(i.due_date)) / (1000 * 60 * 60 * 24));
      } else {
        obj.current_fine = 0;
        obj.is_overdue   = false;
      }
      return obj;
    });

    return res.status(200).json(
      new ApiResponse(200, "Issues fetched", {
        issues: enriched,
        total,
        page:        parseInt(page),
        total_pages: Math.ceil(total / limit),
      })
    );
  } catch (error) {
    next(error);
  }
};


export const getOverdueBooks = async (req, res, next) => {
  try {
    const issues = await BookIssue.find({
      school_id: req.user.school_id,
      status:    "issued",
      due_date:  { $lt: new Date() },
    })
      .populate("book_id",         "title author")
      .populate("issued_to_mongo", "name email")
      .sort({ due_date: 1 });

    const enriched = issues.map((i) => ({
      ...i.toObject(),
      current_fine: calcFine(i.due_date, new Date(), i.fine_per_day),
      overdue_days: Math.ceil((new Date() - new Date(i.due_date)) / (1000 * 60 * 60 * 24)),
    }));

    return res.status(200).json(
      new ApiResponse(200, "Overdue books fetched", {
        total:  enriched.length,
        issues: enriched,
      })
    );
  } catch (error) {
    next(error);
  }
};


export const getLibraryStats = async (req, res, next) => {
  try {
    const school_id = req.user.school_id;

    const [
      totalBooks,
      totalCopies,
      availableCopies,
      totalIssued,
      totalOverdue,
      totalLost,
      unpaidFines,
    ] = await Promise.all([
      Book.countDocuments({ school_id, is_active: true }),
      Book.aggregate([
        { $match: { school_id, is_active: true } },
        { $group: { _id: null, total: { $sum: "$total_copies" } } },
      ]),
      Book.aggregate([
        { $match: { school_id, is_active: true } },
        { $group: { _id: null, total: { $sum: "$available_copies" } } },
      ]),
      BookIssue.countDocuments({ school_id, status: "issued" }),
      BookIssue.countDocuments({ school_id, status: "issued", due_date: { $lt: new Date() } }),
      BookIssue.countDocuments({ school_id, status: "lost" }),
      BookIssue.aggregate([
        { $match: { school_id, fine_paid: false, fine_amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$fine_amount" } } },
      ]),
    ]);

    return res.status(200).json(
      new ApiResponse(200, "Library stats fetched", {
        total_books:       totalBooks,
        total_copies:      totalCopies[0]?.total      || 0,
        available_copies:  availableCopies[0]?.total  || 0,
        currently_issued:  totalIssued,
        overdue_count:     totalOverdue,
        lost_count:        totalLost,
        unpaid_fine_amount: unpaidFines[0]?.total     || 0,
      })
    );
  } catch (error) {
    next(error);
  }
};