import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transporter } from "../config/mail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sendLoginEmail = async (user, req) => {
  const filePath = path.join(__dirname, "../templates/mailtemplate.html");
  let html = fs.readFileSync(filePath, "utf-8");

  html = html
    .replace("{{name}}", user.name)
    .replace("{{time}}", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
    .replace("{{ip}}", req.ip || req.headers["x-forwarded-for"] || "Unknown");

  await transporter.sendMail({
    from: `"Manexa System" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Login Alert — Manexa",
    html
  });
};

export const sendPasswordChangeEmail = async (user, req) => {
  const filePath = path.join(__dirname, "../templates/changepassword.html");
  let html = fs.readFileSync(filePath, "utf-8");

  html = html
    .replace("{{name}}", user.name)
    .replace("{{time}}", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
    .replace("{{ip}}", req.ip || req.headers["x-forwarded-for"] || "Unknown");

  await transporter.sendMail({
    from: `"Manexa System" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Password Changed — Manexa",
    html
  });
};