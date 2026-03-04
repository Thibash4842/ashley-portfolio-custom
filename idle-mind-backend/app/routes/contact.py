
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
import smtplib
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Enhanced Pydantic model with validation
class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr  # This automatically validates email format
    phone: str = Field(..., min_length=10, max_length=20)
    message: str = Field(..., min_length=10, max_length=5000)

@router.post("/contact")
async def send_contact(data: ContactRequest):
    try:
        logger.info(f"Received contact form submission from: {data.email}")
        
        # Create HTML email content for better formatting
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #007bff; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f9f9f9; }}
                .field {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; color: #333; }}
                .value {{ margin-top: 5px; padding: 10px; background: white; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>New Project Inquiry - Idle Mind</h2>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="label">Name:</div>
                        <div class="value">{data.name}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Email:</div>
                        <div class="value"><a href="mailto:{data.email}">{data.email}</a></div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Phone:</div>
                        <div class="value">{data.phone}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">Message:</div>
                        <div class="value">{data.message}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create message container
        msg = MIMEMultipart('alternative')
        msg["Subject"] = f"New Project Inquiry from {data.name}"
        msg["From"] = os.getenv("EMAIL_USER")
        msg["To"] = os.getenv("EMAIL_USER")
        msg["Reply-To"] = data.email  # So you can reply directly to the sender
        
        # Plain text version
        text_content = f"""
New Project Inquiry - Idle Mind

Name: {data.name}
Email: {data.email}
Phone: {data.phone}

Message:
{data.message}
        """
        
        # Attach both plain text and HTML versions
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {os.getenv('EMAIL_USER')}")
        
        return {
            "message": "Thank you for your message! I'll get back to you soon.",
            "status": "success"
        }
        
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP Authentication failed. Check your email and password.")
        raise HTTPException(
            status_code=500,
            detail="Email service configuration error. Please contact administrator."
        )
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send message. Please try again later."
        )

# Optional: Add a test endpoint
@router.get("/contact/test")
async def test_contact():
    return {"message": "Contact endpoint is working"}