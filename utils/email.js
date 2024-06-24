import nodemailer from 'nodemailer';

export async function sendEmail(options) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'Gary <builderhome@home.co>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html, // Uncomment this line if you want to send HTML emails
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
