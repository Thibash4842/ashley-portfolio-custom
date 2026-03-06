
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

// Create email transporter with proper timeout configuration
const createTransporter = () => {
    // Log configuration (without sensitive data)
    console.log('📧 Configuring email transporter:', {
        host: 'smtp.gmail.com',
        port: 587,
        user: process.env.EMAIL_USER ? '✓ Set' : '✗ Missing',
        pass: process.env.EMAIL_PASS ? '✓ Set' : '✗ Missing',
        receiver: process.env.RECEIVER_EMAIL ? '✓ Set' : '✗ Missing'
    });

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587, // Use 587 instead of 465 for better compatibility
        secure: false, // false for 587, true for 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Increased timeouts for Render
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,    // 30 seconds
        socketTimeout: 120000,     // 2 minutes
        // Additional options for reliability
        tls: {
            rejectUnauthorized: false, // Helps with some network issues
            ciphers: 'SSLv3'
        },
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
    });
};

// Test connection function
const testConnection = async (transporter) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Connection test timed out after 30 seconds'));
        }, 30000);

        transporter.verify((error, success) => {
            clearTimeout(timeout);
            if (error) {
                console.error('❌ Email configuration error:', error);
                reject(error);
            } else {
                console.log('✓ Server ready to send emails');
                resolve(success);
            }
        });
    });
};

// Initialize transporter and test connection
let transporter = createTransporter();
testConnection(transporter).catch(err => {
    console.log('⚠️ Initial connection test failed, will retry on send');
});

// Routes
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Portfolio API is running',
        endpoints: {
            test: '/api/test',
            sendEmail: '/api/send-email',
            testEmail: '/api/test-email' // New diagnostic endpoint
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

// NEW: Diagnostic endpoint to test email configuration
app.get('/api/test-email', async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        config: {
            email_user: process.env.EMAIL_USER ? '✓ Set' : '✗ Missing',
            email_pass: process.env.EMAIL_PASS ? '✓ Set' : '✗ Missing',
            receiver_email: process.env.RECEIVER_EMAIL ? '✓ Set' : '✗ Missing'
        },
        tests: []
    };

    // Test 1: DNS resolution for Gmail
    try {
        const dns = require('dns').promises;
        const start = Date.now();
        const addresses = await dns.lookup('smtp.gmail.com');
        results.tests.push({
            name: 'DNS Resolution',
            success: true,
            time: `${Date.now() - start}ms`,
            details: `smtp.gmail.com -> ${addresses.address}`
        });
    } catch (error) {
        results.tests.push({
            name: 'DNS Resolution',
            success: false,
            error: error.message
        });
    }

    // Test 2: Try to verify transporter
    try {
        const testTransporter = createTransporter();
        const start = Date.now();
        await testConnection(testTransporter);
        results.tests.push({
            name: 'SMTP Connection',
            success: true,
            time: `${Date.now() - start}ms`,
            details: 'Successfully connected to Gmail SMTP'
        });
    } catch (error) {
        results.tests.push({
            name: 'SMTP Connection',
            success: false,
            error: error.message,
            code: error.code,
            suggestion: getErrorSuggestion(error)
        });
    }

    res.json(results);
});

// Contact form endpoint (UPDATED with better error handling)
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

        // Create fresh transporter for each send (to avoid stale connections)
        const currentTransporter = createTransporter();

        // Email options
        const mailOptions = {
            from: `"${name}" <${process.env.EMAIL_USER}>`,
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

        // Send email with timeout
        const sendPromise = currentTransporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Email send timed out after 30 seconds')), 30000);
        });

        const info = await Promise.race([sendPromise, timeoutPromise]);
        
        console.log('✅ Email sent successfully:', info.messageId);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully!' 
        });

    } catch (error) {
        console.error('❌ Email error:', error);
        
        // Specific error messages
        let errorMessage = 'Failed to send message. Please try again.';
        let suggestion = '';
        
        if (error.code === 'EAUTH' || error.message.includes('auth')) {
            errorMessage = 'Email authentication failed. Please check your Gmail credentials.';
            suggestion = 'If using Gmail, you need an "App Password" instead of your regular password.';
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            errorMessage = 'Connection to email server timed out.';
            suggestion = 'This is a network issue on Render. Try using a different email provider or contact Render support.';
        } else if (error.message.includes('greeting')) {
            errorMessage = 'Email server not responding.';
            suggestion = 'Gmail SMTP might be blocking Render IPs. Try using port 587 instead of 465.';
        }
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage,
            suggestion: suggestion,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
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

// Helper function for error suggestions
function getErrorSuggestion(error) {
    if (error.code === 'ETIMEDOUT') {
        return '⏱️ Connection timeout - This is likely a network issue on Render. Try using a different email provider or contact Render support.';
    }
    if (error.code === 'EAUTH') {
        return '🔑 Authentication failed - For Gmail, you need to use an "App Password" from your Google Account settings.';
    }
    if (error.code === 'ESOCKET') {
        return '🔌 Socket error - Try using port 587 instead of 465 in your configuration.';
    }
    return 'Check your .env configuration and ensure Render allows outbound SMTP connections.';
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📝 Available routes:`);
    console.log(`   - GET  /`);
    console.log(`   - GET  /api/test`);
    console.log(`   - GET  /api/test-email`); // New diagnostic endpoint
    console.log(`   - POST /api/send-email`);
    console.log('='.repeat(50) + '\n');
});