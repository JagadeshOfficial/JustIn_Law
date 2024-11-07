const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Log environment variables to ensure they are loaded correctly
console.log('Environment Variables:', process.env);

// Ensure the uploads directory exists (use absolute path for WebSpaceKit)
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}

// Set up middleware
app.use(cors()); // Enable CORS if necessary
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath); // Save files to uploads directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Save file with timestamp and original extension
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve static files (css, js, img)
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname))); // This serves all files in the root directory

// Serve the HTML file and handle form submission
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Serve the index.html from root directory
});

// Handle form submission
app.post('/submit', upload.single('advocate_resume'), (req, res) => {
    const { advocate_name, advocate_phone, advocate_email, advocate_location, advocate_experience, advocate_specialized, advocate_enrollment, advocate_message } = req.body;
    const resume = req.file; // The uploaded file information

    console.log('Form data received:', req.body);
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
        from: `"Law Mine" <${process.env.EMAIL_USER}>`,
        to: advocate_email, // Receiver email
        subject: 'New Advocate Submission',
        text: `Details of the advocate submission:\nName: ${advocate_name}\nPhone: ${advocate_phone}\nEmail: ${advocate_email}\nLocation: ${advocate_location}\nExperience: ${advocate_experience}\nSpecialized Cases: ${advocate_specialized}\nEnrollment No: ${advocate_enrollment}\nMessage: ${advocate_message}`,
        attachments: [
            {
                filename: resume.originalname, // Original name of the file
                path: resume.path               // Path to the uploaded resume
            }
        ]
    };

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
        from: `"Law Mine" <${process.env.EMAIL_USER}>`,
        to: 'admin@example.com', // Admin's email address
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

// Error handling middleware (important for debugging in production)
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
