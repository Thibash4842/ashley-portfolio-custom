const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501',
    'https://Thibash4842.github.io',
    'https://thibash4842.github.io',
    'https://idlemind-in.onrender.com'
];

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files if needed (optional)
// app.use(express.static(path.join(__dirname, 'public')));

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.log('Email configuration error:', error);
    } else {
        console.log('✓ Server ready to send emails');
    }
});

// Routes
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Portfolio API is running',
        endpoints: {
            test: '/api/test',
            sendEmail: '/api/send-email'
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is working',
        timestamp: new Date().toISOString()
    });
});

// Contact form endpoint
app.post('/api/send-email', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        // Validation
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Email options
        const mailOptions = {
            from: `"${name}" <${process.env.EMAIL_USER}>`, // Use your email as from address
            replyTo: email,
            to: process.env.RECEIVER_EMAIL,
            subject: `Portfolio Contact: ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                        New Contact Form Submission
                    </h2>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong style="color: #007bff;">Name:</strong> ${name}</p>
                        <p style="margin: 10px 0;"><strong style="color: #007bff;">Email:</strong> ${email}</p>
                        <p style="margin: 10px 0;"><strong style="color: #007bff;">Phone:</strong> ${phone}</p>
                    </div>
                    
                    <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
                        <h3 style="color: #333; margin-top: 0;">Message:</h3>
                        <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    
                    <p style="color: #777; font-size: 12px; margin-top: 20px; text-align: center;">
                        This email was sent from your portfolio contact form.
                    </p>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully!' 
        });

    } catch (error) {
        console.error('Email error:', error);
        
        // More specific error messages
        let errorMessage = 'Failed to send message. Please try again.';
        
        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Please check configuration.';
        } else if (error.code === 'EENVELOPE') {
            errorMessage = 'Invalid email address.';
        }
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
            success: false, 
            message: 'CORS error: Origin not allowed' 
        });
    }
    
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📝 Available routes:`);
    console.log(`   - GET  /`);
    console.log(`   - GET  /api/test`);
    console.log(`   - GET  /api/test-simple`);
    console.log(`   - POST /api/send-email`);
    console.log('='.repeat(50) + '\n');
});