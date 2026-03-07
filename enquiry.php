<?php
/**
 * Enquiry form handler - uses PHPMailer with SMTP (works on XAMPP/Windows).
 *
 * Configure your SMTP settings below or in mail-config.php.
 * For Gmail: use App Password (not your normal password), smtp.gmail.com, port 587, TLS.
 */

// Add CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

require_once __DIR__ . '/PHPmailer/src/Exception.php';
require_once __DIR__ . '/PHPmailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPmailer/src/SMTP.php';

// SMTP Configuration
$smtp_host     = 'smtp.gmail.com';
$smtp_port     = 587;
$smtp_secure   = 'tls';
$smtp_username = 'projecttp4248@gmail.com';
$smtp_password = 'sjss ilaw kzkg gved';
$from_email    = 'noreply@idlemind.com';
$from_name     = 'Idlemind';
$recipient     = 'projecttp4248@gmail.com';

// Only accept POST requests
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

// Get and sanitize form data
$name    = strip_tags(trim($_POST["name"] ?? ''));
$name    = str_replace(["\r", "\n"], [" ", " "], $name);
$email   = filter_var(trim($_POST["email"] ?? ''), FILTER_SANITIZE_EMAIL);
$phone   = strip_tags(trim($_POST["phone"] ?? ''));
$message = strip_tags(trim($_POST["message"] ?? ''));

// Validate all fields
if (empty($name) || empty($email) || empty($phone) || empty($message)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Please complete all fields']);
    exit;
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Valid email is required']);
    exit;
}

// Prepare email content
$subject = "New Enquiry from $name - Idlemind";

// ===== LOCAL TIMEZONE SETTING =====
date_default_timezone_set('Asia/Kolkata'); // Sets to Indian local time

// HTML Email Body
$body = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>New Contact Form Submission</title>
</head>
<body style='margin: 0; padding: 0; font-family: \"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9;'>
    
    <!-- Main Container -->
    <div style='max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);'>
        
        <!-- Header with Gradient -->
        <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;'>
            <h1 style='color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.5px;'>📬 New Contact Form Submission</h1>
            <p style='color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0 0;'>You've received a new message from your portfolio</p>
        </div>
        
        <!-- Content Area -->
        <div style='padding: 32px 28px;'>
            
            <!-- Submitter Info Card -->
            <div style='background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e9edf2;'>
                <table style='width: 100%; border-collapse: collapse;'>
                    <tr>
                        <td style='padding: 8px 0; width: 100px; color: #64748b; font-size: 14px; font-weight: 500;'>👤 Name</td>
                        <td style='padding: 8px 0; color: #1e293b; font-size: 16px; font-weight: 600;'>" . htmlspecialchars($name) . "</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;'>📧 Email</td>
                        <td style='padding: 8px 0;'>
                            <a href='mailto:" . htmlspecialchars($email) . "' style='color: #667eea; text-decoration: none; font-size: 16px; font-weight: 500; border-bottom: 1px dashed #667eea;'>" . htmlspecialchars($email) . "</a>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;'>📞 Phone</td>
                        <td style='padding: 8px 0; color: #1e293b; font-size: 16px; font-weight: 500;'>" . htmlspecialchars($phone) . "</td>
                    </tr>
                </table>
            </div>
            
            <!-- Message Section -->
            <div style='margin-bottom: 28px;'>
                <div style='display: flex; align-items: center; margin-bottom: 12px;'>
                    <span style='background-color: #667eea; width: 8px; height: 28px; border-radius: 4px; margin-right: 12px;'></span>
                    <h2 style='font-size: 20px; font-weight: 600; color: #1e293b; margin: 0; letter-spacing: -0.3px;'>Message</h2>
                </div>
                <div style='background-color: #ffffff; border: 1px solid #e9edf2; border-radius: 12px; padding: 20px; font-size: 15px; line-height: 1.7; color: #334155; box-shadow: 0 2px 4px rgba(0,0,0,0.02);'>
                    " . nl2br(htmlspecialchars($message)) . "
                </div>
            </div>
            
            <!-- Quick Actions Card -->
            <div style='background-color: #f0f4ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #d0dcff;'>
                <h3 style='font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px;'>
                    <span style='font-size: 20px;'>⚡</span> Quick Actions
                </h3>
                <div style='display: flex; gap: 12px; flex-wrap: wrap;'>
                    <a href='mailto:" . htmlspecialchars($email) . "' style='background-color: #667eea; color: white; padding: 10px 18px; border-radius: 30px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; border: none;'>
                        ✉️ Reply to " . htmlspecialchars($name) . "
                    </a>
                    <a href='tel:" . htmlspecialchars($phone) . "' style='background-color: #ffffff; color: #334155; padding: 10px 18px; border-radius: 30px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cbd5e1;'>
                        📞 Call Now
                    </a>
                </div>
            </div>
            
            <!-- Metadata Footer -->
            <div style='border-top: 1px solid #e9edf2; padding-top: 20px; margin-top: 8px;'>
                <p style='margin: 0 0 6px 0; color: #64748b; font-size: 13px; display: flex; align-items: center; gap: 6px;'>
                    <span style='background-color: #e9edf2; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; color: #475569;'>📅 " . date('D, j M Y') . "</span>
                    <span style='background-color: #e9edf2; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; color: #475569;'>⏱️ " . date('g:i A') . "</span>
                </p>
                <p style='margin: 12px 0 0 0; color: #94a3b8; font-size: 12px; border-left: 3px solid #cbd5e1; padding-left: 12px;'>
                    This message was sent from your portfolio contact form.
                </p>
            </div>
            
        </div>
        
        <!-- Footer -->
        <div style='background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e9edf2;'>
            <p style='margin: 0; color: #64748b; font-size: 13px;'>
                <span style='font-weight: 600;'>Idlemind Portfolio</span> — 
                <a href='#' style='color: #667eea; text-decoration: none; border-bottom: 1px dotted #667eea;'>View Dashboard</a>
            </p>
            <p style='margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;'>
                This is an automated message from your website contact form.
            </p>
        </div>
        
    </div>
</body>
</html>";

// Plain text version
$altBody = "New Enquiry\n\nName: $name\nEmail: $email\nPhone: $phone\nMessage: $message\nSource: Idlemind Website";

try {
    // Send main email
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $smtp_host;
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtp_username;
    $mail->Password   = $smtp_password;
    $mail->SMTPSecure = $smtp_secure;
    $mail->Port       = $smtp_port;
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;
    
    $mail->setFrom($from_email, $from_name);
    $mail->addAddress($recipient);
    $mail->addReplyTo($email, $name);
    
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body;
    $mail->AltBody = $altBody;
    
    $mail->send();
    
    // Success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Thank you! Your message has been sent successfully.'
    ]);
    
} catch (PHPMailerException $e) {
    error_log("Mailer Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to send. Please try again.'
    ]);
}
?>