CREATE TABLE schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(50),
    school_id INT,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(100),
    school_id INT,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    class_id INT,
    school_id INT,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    subject_id INT,
    school_id INT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    school_id INT,
    date DATE,
    status VARCHAR(10),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE KEY unique_attendance (student_id, date)
);

CREATE TABLE marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    subject_id INT,
    school_id INT,
    marks INT,
    grade VARCHAR(5),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    UNIQUE KEY unique_marks (student_id, subject_id)
);

CREATE TABLE fee_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    class_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,        //Tuition Fee, Lab Fee
    amount DECIMAL(10,2) NOT NULL,
    frequency ENUM('monthly','quarterly','half-yearly','annually') NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- "2025-26"
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);


CREATE TABLE fee_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    school_id INT NOT NULL,
    fee_structure_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending','paid','overdue','partial') DEFAULT 'pending',
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id)
);


CREATE TABLE fee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    student_id INT NOT NULL,
    school_id INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode ENUM('upi','bank_deposit','cash') NOT NULL,
    transaction_id VARCHAR(100),        -- UPI/bank reference number
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT,                    -- teacher/admin ka user ref_id
    note TEXT,
    FOREIGN KEY (invoice_id) REFERENCES fee_invoices(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);