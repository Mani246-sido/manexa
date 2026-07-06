import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transporter } from "../config/mail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getClientIp = (req) => {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.ip ||
        "Unknown"
    );
};

const sendTemplateEmail = async (user, req, templateName, subject) => {
    if (!user?.email) return;

    try {
        const filePath = path.join(__dirname, `../templates/${templateName}`);
        let html = await fs.readFile(filePath, "utf-8");

        html = html
            .replace("{{name}}", user.name || "User")
            .replace(
                "{{time}}",
                new Date().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                })
            )
            .replace("{{ip}}", getClientIp(req));

        await transporter.sendMail({
            from: `"Manexa System" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject,
            html,
        });
    } catch (error) {
        console.error(`Failed to send "${subject}" email:`, error);
    }
};

export const sendLoginEmail = async (user, req) => {
    await sendTemplateEmail(
        user,
        req,
        "mailtemplate.html",
        "Login Alert — Manexa"
    );
};

export const sendPasswordChangeEmail = async (user, req) => {
    await sendTemplateEmail(
        user,
        req,
        "changepassword.html",
        "Password Changed — Manexa"
    );
};