<?php
// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Start session for CSRF protection (optional)
session_start();

// Include configuration if needed
// require_once 'config.php';

// Function to sanitize input
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Function to send JSON response
function sendResponse($status, $message, $data = []) {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Check if it's a POST request
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Verify CSRF token if you implement it
    // if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    //     sendResponse('error', 'Invalid security token');
    // }
    
    // Get and sanitize form data
    $name = isset($_POST['name']) ? sanitize_input($_POST['name']) : '';
    $email = isset($_POST['email']) ? sanitize_input($_POST['email']) : '';
    $phone = isset($_POST['phone']) ? sanitize_input($_POST['phone']) : '';
    $message = isset($_POST['message']) ? sanitize_input($_POST['message']) : '';
    
    // Validate required fields
    $errors = [];
    
    if (empty($name)) {
        $errors[] = 'Name is required';
    }
    
    if (empty($email)) {
        $errors[] = 'Email is required';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email format';
    }
    
    if (empty($phone)) {
        $errors[] = 'Phone number is required';
    }
    
    if (empty($message)) {
        $errors[] = 'Message is required';
    }
    
    // If there are errors, send response
    if (!empty($errors)) {
        sendResponse('error', implode(', ', $errors));
    }
    
    // Email configuration
    $to = "projecttp4248@gmail.com"; // CHANGE THIS TO YOUR EMAIL
    $subject = "New Contact Form Submission from $name";
    
    // Create email headers
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: noreply@yourdomain.com" . "\r\n"; // CHANGE THIS
    $headers .= "Reply-To: $email" . "\r\n";
    
    // Create HTML email content
    $email_content = "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .field { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .label { font-weight: bold; color: #555; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .value { color: #333; font-size: 16px; margin-top: 5px; }
            .message-box { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>New Contact Form Message</h2>
            </div>
            <div class='content'>
                <div class='field'>
                    <div class='label'>Name:</div>
                    <div class='value'>$name</div>
                </div>
                <div class='field'>
                    <div class='label'>Email:</div>
                    <div class='value'>$email</div>
                </div>
                <div class='field'>
                    <div class='label'>Phone:</div>
                    <div class='value'>$phone</div>
                </div>
                <div class='field'>
                    <div class='label'>Message:</div>
                    <div class='value message-box'>" . nl2br($message) . "</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Send email using PHP's mail function
    if (mail($to, $subject, $email_content, $headers)) {
        // Optional: Save to database if you have one
        // saveToDatabase($name, $email, $phone, $message);
        
        // Optional: Send auto-reply to user
        sendAutoReply($email, $name);
        
        sendResponse('success', 'Thank you! Your message has been sent successfully.');
    } else {
        // Log error
        error_log("Mail failed to send from contact form: $email");
        sendResponse('error', 'Sorry, something went wrong. Please try again later.');
    }
    
} else {
    // If not POST request, redirect to contact page
    header("Location: ../contact.html");
    exit;
}

// Optional: Function to send auto-reply
function sendAutoReply($userEmail, $userName) {
    $subject = "Thank you for contacting us";
    $message = "
    <html>
    <body>
        <h2>Hello $userName,</h2>
        <p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p>
        <p>Best regards,<br>Your Team</p>
    </body>
    </html>
    ";
    
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8\r\n";
    $headers .= "From: noreply@yourdomain.com\r\n";
    
    mail($userEmail, $subject, $message, $headers);
}
?>