import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const emailService = {
    async sendRewardApproved(toEmail: string, employeeName: string, rewardName: string): Promise<void> {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Reward System" <noreply@rewards.com>',
                to: toEmail,
                subject: '🎉 Your Reward Redemption Has Been Approved!',
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Congratulations, ${employeeName}!</h2>
            <p>Your redemption request for <strong>${rewardName}</strong> has been approved.</p>
            <p>Please contact HR for fulfillment details.</p>
            <hr/>
            <p style="color: #888;">Employee Reward System</p>
          </div>
        `,
            });
            logger.info(`Reward approval email sent to ${toEmail}`);
        } catch (error) {
            logger.error(`Failed to send reward email to ${toEmail}:`, error);
        }
    },

    async sendBadgeUnlocked(toEmail: string, employeeName: string, badgeName: string): Promise<void> {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Reward System" <noreply@rewards.com>',
                to: toEmail,
                subject: `🏅 You unlocked a new badge: ${badgeName}!`,
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Great job, ${employeeName}!</h2>
            <p>You've earned the <strong>${badgeName}</strong> badge!</p>
            <p>Keep up the amazing work.</p>
            <hr/>
            <p style="color: #888;">Employee Reward System</p>
          </div>
        `,
            });
            logger.info(`Badge unlock email sent to ${toEmail}`);
        } catch (error) {
            logger.error(`Failed to send badge email to ${toEmail}:`, error);
        }
    },

    async sendWeeklyDigest(
        toEmail: string,
        employeeName: string,
        stats: { pointsEarned: number; kpisCompleted: number; rank: number }
    ): Promise<void> {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Reward System" <noreply@rewards.com>',
                to: toEmail,
                subject: '📊 Your Weekly Performance Digest',
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hello, ${employeeName}!</h2>
            <p>Here's your weekly summary:</p>
            <ul>
              <li><strong>Points Earned:</strong> ${stats.pointsEarned}</li>
              <li><strong>KPIs Completed:</strong> ${stats.kpisCompleted}</li>
              <li><strong>Current Rank:</strong> #${stats.rank}</li>
            </ul>
            <p>Keep pushing forward!</p>
            <hr/>
            <p style="color: #888;">Employee Reward System</p>
          </div>
        `,
            });
            logger.info(`Weekly digest sent to ${toEmail}`);
        } catch (error) {
            logger.error(`Failed to send digest to ${toEmail}:`, error);
        }
    },
};
