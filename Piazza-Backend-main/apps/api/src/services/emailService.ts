import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../utils/logger';

// ── Transporter setup ────────────────────────────────────────────────────────
// If real SMTP creds are in .env → uses those (e.g. Gmail)
// Otherwise → auto-creates an Ethereal test account (no config needed)
let transporter: Transporter;
let etherealPreviewBaseUrl: string | null = null;

async function getTransporter(): Promise<Transporter> {
    if (transporter) return transporter;

    const hasRealSmtp =
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_USER !== 'your-email@gmail.com';

    if (hasRealSmtp) {
        // ── Production / real SMTP ──────────────────────────────────────────
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        logger.info(`📧 Email configured with real SMTP (${process.env.SMTP_HOST || 'smtp.gmail.com'})`);
    } else {
        // ── Dev fallback: Ethereal (free, auto-created test inbox) ──────────
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        etherealPreviewBaseUrl = 'https://ethereal.email';
        logger.info('═══════════════════════════════════════════════════════');
        logger.info('📧 No SMTP configured — using Ethereal test inbox');
        logger.info(`   Ethereal User: ${testAccount.user}`);
        logger.info(`   Ethereal Pass: ${testAccount.pass}`);
        logger.info(`   View emails:   ${etherealPreviewBaseUrl}/messages`);
        logger.info('═══════════════════════════════════════════════════════');
    }

    return transporter;
}

// ── Helper: send mail & log Ethereal preview URL if applicable ───────────────
async function sendMail(mailOptions: nodemailer.SendMailOptions): Promise<void> {
    const t = await getTransporter();
    const info = await t.sendMail(mailOptions);

    if (etherealPreviewBaseUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`📬 Preview email: ${previewUrl}`);
    }
}

const FROM = () => process.env.EMAIL_FROM || '"Piazza Rewards" <noreply@piazzarewards.com>';

export const emailService = {

    // ── Send OTP verification email ───────────────────────────────────────────
    async sendVerificationOtp(toEmail: string, employeeName: string, otp: string): Promise<void> {
        try {
            await sendMail({
                from: FROM(),
                to: toEmail,
                subject: '🔐 Verify your Piazza Rewards account',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0c14; color: #e8eaf6; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #6c63ff; font-size: 28px; margin: 0;">Piazza Rewards</h1>
                            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Employee Reward System</p>
                        </div>
                        <h2 style="font-size: 20px; margin-bottom: 8px;">Hi ${employeeName} 👋</h2>
                        <p style="color: #9ca3af; line-height: 1.6;">
                            Thanks for registering! Use the OTP below to verify your email address.
                            This code expires in <strong style="color: #f7b731;">10 minutes</strong>.
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <div style="display: inline-block; background: #1f2540; border: 2px solid #6c63ff; border-radius: 12px; padding: 16px 40px;">
                                <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #6c63ff;">${otp}</span>
                            </div>
                        </div>
                        <p style="color: #6b7280; font-size: 12px; text-align: center;">
                            If you didn't create an account, you can safely ignore this email.
                        </p>
                        <hr style="border-color: #1f2540; margin: 24px 0;" />
                        <p style="color: #4b5563; font-size: 11px; text-align: center;">Piazza Rewards — Gamified Employee Rewards</p>
                    </div>
                `,
            });
            logger.info(`✅ Verification OTP sent to ${toEmail}`);
        } catch (error) {
            logger.error(`Failed to send verification OTP to ${toEmail}:`, error);
            // Always log OTP to console as fallback so registration never blocks
            logger.info(`📌 [FALLBACK] OTP for ${toEmail}: ${otp}`);
        }
    },

    async sendRewardApproved(toEmail: string, employeeName: string, rewardName: string): Promise<void> {
        try {
            await sendMail({
                from: FROM(),
                to: toEmail,
                subject: '🎉 Your Reward Redemption Has Been Approved!',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Congratulations, ${employeeName}!</h2>
                        <p>Your redemption request for <strong>${rewardName}</strong> has been approved.</p>
                        <p>Please contact HR for fulfillment details.</p>
                        <hr/>
                        <p style="color: #888;">Piazza Rewards — Employee Reward System</p>
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
            await sendMail({
                from: FROM(),
                to: toEmail,
                subject: `🏅 You unlocked a new badge: ${badgeName}!`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Great job, ${employeeName}!</h2>
                        <p>You've earned the <strong>${badgeName}</strong> badge!</p>
                        <p>Keep up the amazing work.</p>
                        <hr/>
                        <p style="color: #888;">Piazza Rewards — Employee Reward System</p>
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
            await sendMail({
                from: FROM(),
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
                        <p style="color: #888;">Piazza Rewards — Employee Reward System</p>
                    </div>
                `,
            });
            logger.info(`Weekly digest sent to ${toEmail}`);
        } catch (error) {
            logger.error(`Failed to send digest to ${toEmail}:`, error);
        }
    },
};