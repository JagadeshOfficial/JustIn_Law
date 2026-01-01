const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure the uploads directory exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files like index.html

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route to serve the form page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/submit', upload.fields([
    { name: 'advocate_resume', maxCount: 1 },
    { name: 'advocate_images[]', maxCount: 5 }
]), async (req, res) => {
    try {
        const {
            advocate_name,
            advocate_phone,
            advocate_email,
            advocate_location,
            advocate_experience,
            advocate_specialized,
            advocate_enrollment,
            advocate_note
        } = req.body;

        const resume = req.files['advocate_resume']?.[0];
        const images = req.files['advocate_images[]'] || [];

        // Validate required fields
        if (!advocate_name || !advocate_phone || !advocate_email || !resume) {
            return res.status(400).send('Please complete all required fields and upload your resume.');
        }

        // Configure Nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use true for port 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            connectionTimeout: 5000 // Timeout after 5 seconds
        });

        // Prepare email attachments
        const attachments = [
            { filename: resume.originalname, path: resume.path },
            ...images.map(image => ({ filename: image.originalname, path: image.path }))
        ];

        // Prepare email content
        const emailContent = `
            <h3>Advocate Submission Details</h3>
            <p><strong>Name:</strong> ${advocate_name}</p>
            <p><strong>Phone:</strong> ${advocate_phone}</p>
            <p><strong>Email:</strong> ${advocate_email}</p>
            <p><strong>Location:</strong> ${advocate_location}</p>
            <p><strong>Experience:</strong> ${advocate_experience}</p>
            <p><strong>Specialized Cases:</strong> ${advocate_specialized}</p>
            <p><strong>Enrollment No:</strong> ${advocate_enrollment}</p>
            <p><strong>Message:</strong> ${advocate_note}</p>
        `;

        // Send email to the advocate
        const mailOptions = {
            from: `"Law Mine" <${process.env.EMAIL_USER}>`,
            to: advocate_email,
            subject: 'Your Advocate Submission Details',
            html: emailContent,
            attachments
        };

        await transporter.sendMail(mailOptions);

        // Send email to admin
        const adminMailOptions = {
            from: `"Law Mine" <${process.env.EMAIL_USER}>`,
            to: 'contact@lawmine.in',
            subject: 'New Advocate Submission',
            html: emailContent,
            attachments
        };

        await transporter.sendMail(adminMailOptions);

        res.status(200).send('Submission successful! Your details have been emailed.');
    } catch (error) {
        console.error('Error handling submission:', error);
        res.status(500).send('An error occurred while processing your submission.');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
