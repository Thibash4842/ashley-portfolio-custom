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

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('github.io')) {
            callback(null, true);
        } else {
            console.log('❌ Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== EMAIL TRANSPORTER with RETRY LOGIC ====================
let transporter = null;

function createTransporter() {
    console.log('📧 Creating email transporter...');
    
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false, // Allows self-signed certs (fix for some networks)
            ciphers: 'SSLv3'
        },
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,    // 30 seconds
        socketTimeout: 60000,      // 60 seconds
        debug: true, // Enable debug logs
        logger: true // Log to console
    });
}

// Initialize transporter with retry
function initTransporter() {
    transporter = createTransporter();
    
    // Verify connection with retry
    const verifyWithRetry = (retries = 3) => {
        transporter.verify((error, success) => {
            if (error) {
                console.log(`❌ Email verification failed (${retries} retries left):`, error.message);
                
                if (retries > 0) {
                    console.log('🔄 Retrying in 5 seconds...');
                    setTimeout(() => verifyWithRetry(retries - 1), 5000);
                } else {
                    console.log('⚠️ Using fallback configuration...');
                    // Create fallback transporter with different settings
                    transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS
                        }
                    });
                    console.log('✅ Fallback transporter created');
                }
            } else {
                console.log('✅ Email transporter ready');
                console.log('   📧 From:', process.env.EMAIL_USER);
                console.log('   📨 To:', process.env.RECEIVER_EMAIL);
            }
        });
    };
    
    verifyWithRetry();
}

// Initialize on startup
initTransporter();

// ==================== ROUTES ====================

app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'IdleMind Portfolio API',
        endpoints: {
            test: '/api/test',
            health: '/api/health',
            sendEmail: '/api/send-email (POST)'
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is healthy',
        email: process.env.EMAIL_USER ? 'configured' : 'not configured',
        timestamp: new Date().toISOString()
    });
});

// Contact form endpoint with retry logic
app.post('/api/send-email', async (req, res) => {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📩 Attempt ${attempt} - Received from:`, req.body.email);

            const { name, email, phone, message } = req.body;

            // Validation
            if (!name || !email || !phone || !message) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'All fields are required' 
                });
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Please provide a valid email address' 
                });
            }

            // Email options
            const mailOptions = {
                from: `"${name}" <${email}>`,
                replyTo: email,
                to: process.env.RECEIVER_EMAIL,
                subject: `New Portfolio Message from ${name}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            .container { max-width: 600px; margin: 20px auto; }
                            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
                            .content { padding: 20px; }
                            .field { margin-bottom: 15px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h2>New Contact Form Submission</h2>
                            </div>
                            <div class="content">
                                <p><strong>Name:</strong> ${name}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Phone:</strong> ${phone}</p>
                                <p><strong>Message:</strong></p>
                                <p>${message}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            console.log(`📤 Attempt ${attempt} - Sending to:`, process.env.RECEIVER_EMAIL);
            
            // Try with current transporter
            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent on attempt ${attempt}!`);
                console.log('   Message ID:', info.messageId);
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Thank you for your message! I\'ll get back to you soon.' 
                });
            } catch (sendError) {
                console.log(`❌ Attempt ${attempt} failed:`, sendError.message);
                lastError = sendError;
                
                // Recreate transporter on failure
                if (attempt < maxRetries) {
                    console.log('🔄 Recreating transporter...');
                    transporter = createTransporter();
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                }
            }
            
        } catch (error) {
            lastError = error;
            console.log(`❌ Attempt ${attempt} error:`, error.message);
        }
    }
    
    // All retries failed
    console.error('❌ All email attempts failed:', lastError);
    
    // Return user-friendly message with direct email option
    res.status(500).json({ 
        success: false, 
        message: `Failed to send email. Please contact me directly at: ${process.env.RECEIVER_EMAIL}` 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Endpoint not found',
        availableEndpoints: ['/api/test', '/api/health', '/api/send-email']
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌍 Public: https://idlemind-in.onrender.com`);
    console.log('='.repeat(60) + '\n');
}).on('error', (err) => {
    console.log('❌ Server error:', err.message);
});