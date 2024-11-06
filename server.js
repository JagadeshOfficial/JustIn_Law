const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure the uploads directory exists
if (!fs.existsSync('uploads/')) {
    fs.mkdirSync('uploads/');
}

// Set up middleware
app.use(cors()); // Enable CORS if necessary
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files to uploads directory
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Save file with its original name
    }
});

const upload = multer({ storage: storage });

// Serve static files like CSS from the root directory (css folder)
app.use('/css', express.static(path.join(__dirname, 'css')));

// Serve images from the root directory (images folder)
app.use('/img', express.static(path.join(__dirname, 'img')));
// Serve static files (css, js, img) from the root directory
app.use(express.static(path.join(__dirname))); // This serves all files in the root directory

// Serve the HTML file and handle form submission in the same codebase
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Serve the index.html from root directory
});

// Handle form submission
app.post('/submit', upload.single('advocate_resume'), (req, res) => {
    const { advocate_name, advocate_phone, advocate_email, advocate_location, advocate_experience, advocate_specialized, advocate_enrollment, advocate_message } = req.body;
    const resume = req.file; // The uploaded file information

    // Log the uploaded file information for debugging
    console.log('Uploaded file:', resume);

    // Validate input fields
    if (!advocate_name || !advocate_phone || !advocate_email || !resume) {
        console.log('Form validation failed. Missing required fields.');
        return res.status(400).send('Please complete all required fields and upload your resume.');
    }

    // Create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your email address from .env
            pass: process.env.EMAIL_PASS   // Your app password from .env
        }
    });

    // Set up email data
    const mailOptions = {
        from: `"JustIn Law" <${process.env.EMAIL_USER}>`,
        to: advocate_email, // receiver email
        subject: 'New Advocate Submission',
        text: `Details of the advocate submission:\nName: ${advocate_name}\nPhone: ${advocate_phone}\nEmail: ${advocate_email}\nLocation: ${advocate_location}\nExperience: ${advocate_experience}\nSpecialized Cases: ${advocate_specialized}\nEnrollment No: ${advocate_enrollment}\nMessage: ${advocate_message}`,
        attachments: [
            {
                filename: resume.originalname, // Original name of the file
                path: resume.path               // Path to the uploaded resume
            }
        ]
    };

    // Log the attachment path for debugging
    console.log('Resume path:', resume.path);

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending email: ' + error.message);
        }
        console.log('Email sent: ' + info.response);
        res.status(200).send('Email sent successfully!');
    });

    // Optional: Notify admin (adjust the email address as needed)
    const adminMailOptions = {
        from: `"JustIn Law" <${process.env.EMAIL_USER}>`,
        to: 'chat.judicial365@gmail.com', // Admin's email address
        subject: 'New Advocate Submission Received',
        text: `An advocate has submitted their details:\nName: ${advocate_name}\nPhone: ${advocate_phone}\nEmail: ${advocate_email}\nLocation: ${advocate_location}\nExperience: ${advocate_experience}\nSpecialized Cases: ${advocate_specialized}\nEnrollment No: ${advocate_enrollment}\nMessage: ${advocate_message}`
    };

    transporter.sendMail(adminMailOptions, (error, info) => {
        if (error) {
            console.log('Admin notification error:', error);
        } else {
            console.log('Admin notified:', info.response);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
