const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production - UPDATED
const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501',
    'https://Thibash4842.github.io',  // Your GitHub Pages URL
    'https://thibash4842.github.io',  // Lowercase version
    'https://*.github.io'              // Wildcard for GitHub Pages
];

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
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

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== EMAIL TRANSPORTER ====================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email configuration error:');
        console.log('   - Error details:', error.message);
        console.log('   - Make sure EMAIL_USER and EMAIL_PASS are set correctly in Render environment variables');
    } else {
        console.log('✅ Server is ready to send emails');
        console.log('   📧 From:', process.env.EMAIL_USER);
        console.log('   📨 To:', process.env.RECEIVER_EMAIL);
    }
});

// ==================== ROUTES ====================

// Root route
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Portfolio Backend API',
        endpoints: {
            test: '/api/test',
            health: '/api/health',
            sendEmail: '/api/send-email (POST)'
        }
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is healthy',
        email: process.env.EMAIL_USER ? 'configured' : 'not configured',
        timestamp: new Date().toISOString()
    });
});

// Contact form endpoint
app.post('/api/send-email', async (req, res) => {
    try {
        // Log received data (for debugging)
        console.log('📩 Received form submission from:', req.body.email);
        console.log('   Full data:', { ...req.body, message: req.body.message?.substring(0, 50) + '...' });

        const { name, email, phone, message } = req.body;

        // Validate input
        if (!name || !email || !phone || !message) {
            console.log('❌ Missing fields:', { name, email, phone, message });
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate email format
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
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: #ffffff;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px 20px;
                            text-align: center;
                        }
                        .header h2 {
                            margin: 0;
                            font-size: 24px;
                        }
                        .content {
                            padding: 30px;
                        }
                        .contact-info {
                            background: #e8f4fd;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 25px;
                        }
                        .contact-info p {
                            margin: 10px 0;
                        }
                        .field {
                            margin-bottom: 25px;
                            padding: 20px;
                            background: #f9f9f9;
                            border-radius: 8px;
                            border-left: 4px solid #667eea;
                        }
                        .label {
                            font-weight: 600;
                            color: #667eea;
                            margin-bottom: 8px;
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .value {
                            font-size: 16px;
                            color: #444;
                            white-space: pre-wrap;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px;
                            background: #f0f0f0;
                            color: #666;
                            font-size: 14px;
                        }
                        .reply-tip {
                            margin-top: 30px;
                            padding: 15px;
                            background: #fff3cd;
                            border-radius: 5px;
                            border-left: 4px solid #ffc107;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>📬 New Contact Form Submission</h2>
                        </div>
                        <div class="content">
                            <div class="contact-info">
                                <p><strong>👤 From:</strong> ${name}</p>
                                <p><strong>📧 Email:</strong> <a href="mailto:${email}">${email}</a></p>
                                <p><strong>📞 Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
                            </div>
                            
                            <div class="field">
                                <div class="label">💬 Message:</div>
                                <div class="value">${message.replace(/\n/g, '<br>')}</div>
                            </div>
                            
                            <div class="reply-tip">
                                <strong>💡 Quick Reply:</strong> Just hit "Reply" in your email client 
                                to respond directly to <strong>${name}</strong> at <strong>${email}</strong>
                            </div>
                        </div>
                        <div class="footer">
                            This message was sent from your portfolio website.<br>
                            <small>Received: ${new Date().toLocaleString()}</small>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Send email
        console.log('📤 Sending email to:', process.env.RECEIVER_EMAIL);
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email sent successfully!');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        
        res.status(200).json({ 
            success: true, 
            message: 'Thank you for your message! I\'ll get back to you soon.' 
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        
        // Send appropriate error message
        if (error.code === 'EAUTH') {
            res.status(500).json({ 
                success: false, 
                message: 'Email authentication failed. Please check server configuration.' 
            });
        } else if (error.code === 'EENVELOPE') {
            res.status(500).json({ 
                success: false, 
                message: 'Invalid email format. Please check your email address.' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send message. Please try again later.' 
            });
        }
    }
});

// 404 handler for undefined routes
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
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`📧 Contact form: http://localhost:${PORT}/api/send-email (POST)`);
    console.log('='.repeat(60) + '\n');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use. Try changing PORT in .env file`);
    } else {
        console.log('❌ Server error:', err.message);
    }
});