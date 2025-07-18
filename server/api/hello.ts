import { NitroApp } from "nitropack";
import sendEmail from "../utils/mailer";

export default defineEventHandler(async (event) => {
  const nitro: NitroApp = useNitroApp();
  try {
    // const [results] = await nitro.connection.query("SELECT * FROM USER");
    const html = `
    <h1>Welcome, Hoai!</h1>
    <p>Thank you for joining!</p>
  `;
    // await sendEmail("hoai.tran.insenco@gmail.com", "Welcome Email", html);
    return html;
  } catch (error) {
    console.log(error);
  }
});
