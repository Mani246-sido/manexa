import fs from "fs";
import path from "path";
import { transporter } from "../config/mail.js";

export const sendLoginEmail = async (user, req) => {
  const filePath = path.resolve("src/templates/mailtemplate.html");

  let html = fs.readFileSync(filePath, "utf-8");

  html = html
    .replace("{{name}}", user.name)
    .replace("{{time}}", new Date().toLocaleString())
    .replace("{{ip}}", req.ip);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Login Alert - Manexa",
    html
  });
};